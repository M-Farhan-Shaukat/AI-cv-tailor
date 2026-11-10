<?php

namespace App\Http\Controllers;

use App\Enums\ResumeTemplate;
use App\Models\JobPosting;
use App\Models\TailoredResume;
use App\Services\JobDescriptionCondenser;
use App\Services\LlmBudgetExceededException;
use App\Services\ResumeDesign;
use App\Services\ResumeDesignExtractor;
use App\Services\ResumeTailor;
use App\Services\ResumeTextExtractor;
use App\Services\UserResumeStore;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class ResumeTailorController extends Controller
{
    /**
     * Upper bound on CV characters sent to the model, to stay within Groq's per-minute token limit.
     */
    protected const MAX_CV_CHARACTERS = 8000;

    /**
     * Longest job description accepted. Long postings are condensed locally before any AI call
     * (see {@see JobDescriptionCondenser}), so length does not affect the token budget.
     */
    public const MAX_JD_WORDS = 15000;

    public function index(Request $request): InertiaResponse
    {
        $jobPosting = $request->integer('job') > 0
            ? JobPosting::query()->find($request->integer('job'))
            : null;

        return Inertia::render('ResumeTailor', [
            'templates' => ResumeTemplate::options(),
            'seo' => [
                'title' => 'AI-Powered Resume Tailor & ATS Optimizer',
                'description' => 'Upload your CV, paste a job description, and get an ATS-optimized tailored resume with match score instantly.',
            ],
            'prefill' => $jobPosting ? [
                'job_posting_id' => $jobPosting->id,
                'job_title' => $jobPosting->title,
                'job_description' => $this->limitWords((string) $jobPosting->description, self::MAX_JD_WORDS),
            ] : null,
            'maxJobDescriptionWords' => self::MAX_JD_WORDS,
        ]);
    }

    /**
     * Keep the first $maxWords words of the text. Unlike Str::words(), which compiles the limit into a
     * regex quantifier and fails with "regular expression is too large" for limits in the thousands,
     * this splits on whitespace and works for any limit.
     */
    protected function limitWords(string $text, int $maxWords): string
    {
        $trimmed = ltrim($text);
        $words = preg_split('/\s+/u', $trimmed, $maxWords + 1, PREG_SPLIT_OFFSET_CAPTURE);

        if ($words === false || count($words) <= $maxWords) {
            return $text;
        }

        return rtrim(substr($trimmed, 0, $words[$maxWords][1]));
    }

    public function tailor(Request $request, ResumeTailor $resumeTailor, ResumeTextExtractor $extractor, ResumeDesignExtractor $designExtractor, UserResumeStore $resumes): JsonResponse
    {
        set_time_limit(180);

        $request->validate([
            'cv_file' => 'required|file|mimes:pdf,docx|max:5120',
            'job_description' => [
                'required', 'string', 'min:50', 'max:250000',
                function (string $attribute, string $value, \Closure $fail): void {
                    if (preg_match_all('/\S+/u', $value) > self::MAX_JD_WORDS) {
                        $fail('The job description may not be longer than '.number_format(self::MAX_JD_WORDS).' words.');
                    }
                },
            ],
            'job_posting_id' => 'nullable|integer|exists:job_postings,id',
            'template' => ['nullable', Rule::enum(ResumeTemplate::class)],
        ]);

        $template = $request->enum('template', ResumeTemplate::class) ?? ResumeTemplate::Original;

        $file = $request->file('cv_file');
        $jobDescription = trim($request->input('job_description'));
        $cvText = Str::limit($extractor->extract($file), self::MAX_CV_CHARACTERS, '');

        if (mb_strlen($cvText) < 100) {
            throw ValidationException::withMessages([
                'cv_file' => 'Could not extract text from your CV. If it is a scanned/image PDF, export a text-based PDF or DOCX and try again.',
            ]);
        }

        $design = ResumeDesign::normalize($designExtractor->extract($file, $cvText));

        try {
            $result = $resumeTailor->tailor($cvText, $jobDescription, design: ResumeDesign::withTemplate($design, $template));
        } catch (LlmBudgetExceededException $exception) {
            return response()->json(['message' => $exception->getMessage()], Response::HTTP_TOO_MANY_REQUESTS);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], Response::HTTP_BAD_GATEWAY);
        }

        $tailored = DB::transaction(function () use ($request, $file, $jobDescription, $cvText, $result, $resumes, $design, $template): TailoredResume {
            if ($request->user() !== null) {
                $resumes->savePrimary($request->user(), $file->getClientOriginalName(), $cvText);
            }

            return TailoredResume::create([
                'session_id' => Session::getId(),
                'user_id' => $request->user()?->id,
                'job_posting_id' => $request->integer('job_posting_id') ?: null,
                'access_token' => Str::random(48),
                'original_filename' => $file->getClientOriginalName(),
                'job_description' => $jobDescription,
                'extracted_cv_text' => $cvText,
                'design_profile' => $design,
                'template' => $template,
                ...$this->attributesFromResult($result, []),
            ]);
        });

        return $this->resultResponse($tailored, $result, []);
    }

    /**
     * Re-tailor an existing result after the candidate confirms missing skills they genuinely have.
     */
    public function refine(Request $request, TailoredResume $tailoredResume, ResumeTailor $resumeTailor): JsonResponse
    {
        set_time_limit(180);

        $this->authorizeAccess($request, $tailoredResume);

        $validated = $request->validate([
            'confirmed_skills' => 'required|array|min:1|max:40',
            'confirmed_skills.*' => 'required|string|max:60',
        ]);

        $report = $tailoredResume->score_report ?? [];
        $confirmedSkills = collect([...($report['confirmed_skills'] ?? []), ...$validated['confirmed_skills']])
            ->map(fn (string $skill) => trim($skill))
            ->filter()
            ->unique(fn (string $skill) => mb_strtolower($skill))
            ->values()
            ->all();

        $jobAnalysis = isset($report['keywords'])
            ? ['job_title' => $report['job_title'] ?? '', 'keywords' => $report['keywords']]
            : null;

        try {
            $result = $resumeTailor->tailor(
                $tailoredResume->extracted_cv_text,
                $tailoredResume->job_description,
                $jobAnalysis,
                $confirmedSkills,
                ResumeDesign::withTemplate($tailoredResume->design_profile, $tailoredResume->template),
            );
        } catch (LlmBudgetExceededException $exception) {
            return response()->json(['message' => $exception->getMessage()], Response::HTTP_TOO_MANY_REQUESTS);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], Response::HTTP_BAD_GATEWAY);
        }

        $tailoredResume->update($this->attributesFromResult($result, $confirmedSkills));

        return $this->resultResponse($tailoredResume, $result, $confirmedSkills);
    }

    /**
     * Re-render the tailored resume in another template. Only the look changes, so no AI call is made
     * and the ATS text and scores stay the same.
     */
    public function changeTemplate(Request $request, TailoredResume $tailoredResume, ResumeTailor $resumeTailor): JsonResponse
    {
        $this->authorizeAccess($request, $tailoredResume);

        $request->validate([
            'template' => ['required', Rule::enum(ResumeTemplate::class)],
        ]);

        $template = $request->enum('template', ResumeTemplate::class);

        $tailoredResume->update([
            'template' => $template,
            'tailored_cv_html' => $resumeTailor->render(
                $tailoredResume->tailored_cv_json,
                ResumeDesign::withTemplate($tailoredResume->design_profile, $template),
            ),
        ]);

        return response()->json([
            'template' => $template->value,
            'html' => $tailoredResume->tailored_cv_html,
            ...$this->resultUrls($tailoredResume),
        ]);
    }

    public function downloadPdf(Request $request, TailoredResume $tailoredResume): Response
    {
        $this->authorizeAccess($request, $tailoredResume);

        $html = $tailoredResume->tailored_cv_html;
        abort_if(empty($html), Response::HTTP_NOT_FOUND, 'Tailored resume HTML not found.');

        $name = $tailoredResume->tailored_cv_json['name'] ?? '';
        $filename = Str::slug($name ?: 'tailored').'-resume.pdf';

        $paper = ($tailoredResume->design_profile['page_size'] ?? 'a4') === 'letter' ? 'letter' : 'a4';
        $response = Pdf::loadHTML($html)
            ->setOption('isFontSubsettingEnabled', true)
            ->setPaper($paper, 'portrait')
            ->download($filename);
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    }

    /**
     * Allow the owning account, the owning session, or a request carrying the resume's
     * unguessable access token.
     */
    protected function authorizeAccess(Request $request, TailoredResume $tailoredResume): void
    {
        if ($tailoredResume->user_id !== null && $tailoredResume->user_id === $request->user()?->id) {
            return;
        }

        if ($tailoredResume->session_id === Session::getId()) {
            return;
        }

        $token = (string) $request->query('token', '');

        abort_unless(
            filled($tailoredResume->access_token) && hash_equals($tailoredResume->access_token, $token),
            Response::HTTP_FORBIDDEN,
        );
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<int, string>  $confirmedSkills
     * @return array<string, mixed>
     */
    protected function attributesFromResult(array $result, array $confirmedSkills): array
    {
        return [
            'tailored_cv_json' => $result['resume'],
            'tailored_cv_html' => $result['html'],
            'match_score' => $result['tailored']['score'],
            'original_score' => $result['original']['score'],
            'ats_keywords' => array_column($result['tailored']['matched'], 'term'),
            'score_report' => [
                'job_title' => $result['job_title'],
                'keywords' => $result['keywords'],
                'original' => $result['original'],
                'tailored' => $result['tailored'],
                'added_keywords' => $result['added_keywords'],
                'confirmed_skills' => $confirmedSkills,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<int, string>  $confirmedSkills
     */
    protected function resultResponse(TailoredResume $tailored, array $result, array $confirmedSkills): JsonResponse
    {
        return response()->json([
            'success' => true,
            'tailored_id' => $tailored->id,
            'job_title' => $result['job_title'],
            'original_score' => $result['original'],
            'tailored_score' => $result['tailored'],
            'added_keywords' => $result['added_keywords'],
            'confirmed_skills' => $confirmedSkills,
            'changes' => $result['resume']['changes'],
            'html' => $result['html'],
            'plain_text' => $result['plain_text'],
            'template' => $tailored->template->value,
            ...$this->resultUrls($tailored),
        ]);
    }

    /**
     * @return array{download_url: string, refine_url: string, template_url: string}
     */
    protected function resultUrls(TailoredResume $tailored): array
    {
        $parameters = [
            'tailoredResume' => $tailored,
            'token' => $tailored->access_token,
            'v' => substr(md5((string) $tailored->tailored_cv_html), 0, 12),
        ];

        return [
            'download_url' => route('resume.download', $parameters, false),
            'refine_url' => route('resume.refine', $parameters, false),
            'template_url' => route('resume.template', $parameters, false),
        ];
    }
}
