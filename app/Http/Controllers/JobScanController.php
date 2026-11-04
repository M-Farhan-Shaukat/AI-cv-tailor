<?php

namespace App\Http\Controllers;

use App\Jobs\ComputeJobMatches;
use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Models\SavedJob;
use App\Services\JobMatcher;
use App\Services\JobPostingPresenter;
use App\Services\JobScanStatus;
use App\Services\JobSearchFilters;
use App\Services\ResumeTextExtractor;
use App\Services\UserResumeStore;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class JobScanController extends Controller
{
    public function __construct(
        protected JobMatcher $matcher,
        protected JobScanStatus $status,
        protected UserResumeStore $resumes,
        protected JobSearchFilters $filters,
        protected JobPostingPresenter $presenter,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $filters = $this->filters->fromRequest($request);
        $filters['sort'] = $this->sort($request);

        $matcherKey = $this->matcherKey($request);
        $query = $this->filteredQuery($filters, $matcherKey);

        $postings = $query
            ->paginate((int) config('job_scan.results_per_page', 20))
            ->withQueryString();

        $matches = $matcherKey
            ? JobMatch::query()
                ->where('matcher_key', $matcherKey)
                ->whereIn('job_posting_id', $postings->getCollection()->pluck('id'))
                ->get()
                ->keyBy('job_posting_id')
            : collect();

        $savedJobs = $request->user() !== null
            ? SavedJob::query()
                ->where('user_id', $request->user()->id)
                ->whereIn('job_posting_id', $postings->getCollection()->pluck('id'))
                ->get()
                ->keyBy('job_posting_id')
            : collect();

        $postings->through(fn (JobPosting $posting): array => $this->presenter->summary(
            $posting,
            $matches->get($posting->id),
            $savedJobs->get($posting->id),
        ));

        return Inertia::render('Jobs/Index', [
            'jobs' => $postings,
            'filters' => $filters,
            'status' => $matcherKey ? $this->status->get($matcherKey) : null,
            'hasCv' => $this->cv($request) !== null,
            'cvFilename' => $this->cv($request)['filename'] ?? null,
            'canSaveSearch' => $request->user() !== null,
            'defaultMinScore' => (int) config('job_scan.saved_search_min_score', 60),
            'seo' => [
                'title' => 'Job matches for your CV',
                'description' => 'Scan live job postings and see how well your CV matches each role before you apply.',
            ],
        ]);
    }

    public function scan(Request $request, ResumeTextExtractor $extractor): JsonResponse|RedirectResponse
    {
        $maxLimit = (int) config('job_scan.match_limit', 25);

        $validated = $request->validate([
            'cv_file' => 'nullable|file|mimes:pdf,docx|max:5120',
            'search' => 'nullable|string|max:120',
            'location' => 'nullable|string|max:120',
            'remote' => 'nullable|boolean',
            'employment_type' => 'nullable|string|max:50',
            'salary_min' => 'nullable|integer|min:0|max:10000000',
            'salary_max' => 'nullable|integer|min:0|max:10000000',
            'posted_within_days' => 'nullable|integer|min:1|max:90',
            'limit' => 'nullable|integer|min:1|max:'.$maxLimit,
        ]);

        $storedCv = $request->session()->get('job_scan.cv');
        $storedCv = is_array($storedCv) ? $storedCv : null;
        $user = $request->user();

        if ($request->hasFile('cv_file')) {
            $file = $request->file('cv_file');
            $cvText = Str::limit(
                $extractor->extract($file),
                (int) config('job_scan.max_cv_characters', 8000),
                '',
            );

            if (mb_strlen($cvText) < 100) {
                throw ValidationException::withMessages([
                    'cv_file' => 'Could not extract text from your CV. Export a text-based PDF or DOCX and try again.',
                ]);
            }

            $filename = $file->getClientOriginalName();

            if ($user !== null) {
                $this->resumes->savePrimary($user, $filename, $cvText);
            }
        } elseif ($user !== null && ($primaryText = $this->resumes->primaryText($user)) !== null) {
            $cvText = $primaryText;
            $filename = $user->primaryResume()?->original_filename;
        } elseif (filled($storedCv['text'] ?? null)) {
            $cvText = (string) $storedCv['text'];
            $filename = $storedCv['filename'] ?? null;

            if ($user !== null) {
                $this->resumes->savePrimary($user, (string) ($filename ?? 'cv'), $cvText);
            }
        } else {
            throw ValidationException::withMessages([
                'cv_file' => 'Upload your CV to start scanning.',
            ]);
        }

        $resumeHash = hash('sha256', $cvText);
        $sessionId = $request->session()->getId();
        $matcherKey = $this->matcher->matcherKey($request->user()?->id, $sessionId, $resumeHash);

        $request->session()->put('job_scan.cv', [
            'hash' => $resumeHash,
            'filename' => $filename,
            'text' => $cvText,
        ]);

        $this->status->queued($matcherKey);

        ComputeJobMatches::dispatch(
            matcherKey: $matcherKey,
            userId: $request->user()?->id,
            sessionId: $sessionId,
            cvText: $cvText,
            resumeHash: $resumeHash,
            search: trim((string) ($validated['search'] ?? '')),
            remoteOnly: (bool) ($validated['remote'] ?? false),
            limit: (int) ($validated['limit'] ?? $maxLimit),
            location: trim((string) ($validated['location'] ?? '')),
            employmentType: trim((string) ($validated['employment_type'] ?? '')) ?: null,
            salaryMin: isset($validated['salary_min']) ? (int) $validated['salary_min'] : null,
            salaryMax: isset($validated['salary_max']) ? (int) $validated['salary_max'] : null,
            postedWithinDays: isset($validated['posted_within_days']) ? (int) $validated['posted_within_days'] : null,
        );

        if ($request->expectsJson()) {
            return response()->json([
                'status' => JobScanStatus::Queued,
                'matcher_key' => $matcherKey,
            ]);
        }

        return back();
    }

    public function show(Request $request, JobPosting $jobPosting): InertiaResponse
    {
        $matcherKey = $this->matcherKey($request);

        $match = $matcherKey
            ? JobMatch::query()
                ->where('matcher_key', $matcherKey)
                ->where('job_posting_id', $jobPosting->id)
                ->first()
            : null;

        $savedJob = $request->user() !== null
            ? SavedJob::query()
                ->where('user_id', $request->user()->id)
                ->where('job_posting_id', $jobPosting->id)
                ->first()
            : null;

        return Inertia::render('Jobs/Show', [
            'job' => $this->presenter->details($jobPosting, $match, $savedJob),
            'match' => $match ? $this->presenter->match($match) : null,
            'tailorUrl' => route('home', ['job' => $jobPosting->id]),
            'backUrl' => route('jobs.index'),
            'seo' => [
                'title' => $jobPosting->title.($jobPosting->company ? ' at '.$jobPosting->company : ''),
                'description' => Str::limit($jobPosting->description, 155),
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    protected function filteredQuery(array $filters, ?string $matcherKey): Builder
    {
        $query = $this->filters->apply(JobPosting::query()->active(), $filters);

        if ($filters['sort'] === 'match' && $matcherKey !== null) {
            return $query
                ->leftJoin('job_matches', function (JoinClause $join) use ($matcherKey): void {
                    $join->on('job_matches.job_posting_id', '=', 'job_postings.id')
                        ->where('job_matches.matcher_key', '=', $matcherKey);
                })
                ->select('job_postings.*')
                ->orderByDesc('job_matches.score')
                ->orderByDesc('job_postings.posted_at')
                ->orderByDesc('job_postings.id');
        }

        if ($filters['sort'] === 'company') {
            return $query->orderBy('company')->orderByDesc('id');
        }

        return $query->orderByDesc('posted_at')->orderByDesc('id');
    }

    protected function matcherKey(Request $request): ?string
    {
        $cv = $this->cv($request);

        if ($cv === null || ! filled($cv['hash'] ?? null)) {
            return null;
        }

        return $this->matcher->matcherKey(
            $request->user()?->id,
            $request->session()->getId(),
            (string) $cv['hash'],
        );
    }

    /**
     * @return array{hash?: string, filename?: string, text?: string}|null
     */
    protected function cv(Request $request): ?array
    {
        $cv = $request->session()->get('job_scan.cv');

        if (is_array($cv) && filled($cv['hash'] ?? null)) {
            return $cv;
        }

        $primary = $request->user()?->primaryResume();

        if ($primary !== null && filled($primary->extracted_text)) {
            return [
                'hash' => hash('sha256', $primary->extracted_text),
                'filename' => $primary->original_filename,
                'text' => $primary->extracted_text,
            ];
        }

        return is_array($cv) ? $cv : null;
    }

    protected function sort(Request $request): string
    {
        $sort = $request->string('sort')->toString();

        return in_array($sort, ['newest', 'match', 'company'], true) ? $sort : 'newest';
    }
}
