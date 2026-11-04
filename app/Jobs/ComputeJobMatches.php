<?php

namespace App\Jobs;

use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Services\JobMatcher;
use App\Services\JobScanStatus;
use App\Services\JobSearchFilters;
use App\Services\LlmBudgetExceededException;
use App\Services\LlmUsageTracker;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ComputeJobMatches implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    /**
     * Keywords are extracted with one LLM call per posting, so allow a long run.
     */
    public int $timeout = 840;

    public int $tries = 2;

    /**
     * @var array<int, int>
     */
    public array $backoff = [60, 300];

    public int $uniqueFor = 1800;

    public function __construct(
        public string $matcherKey,
        public ?int $userId,
        public ?string $sessionId,
        public string $cvText,
        public string $resumeHash,
        public string $search = '',
        public bool $remoteOnly = false,
        public int $limit = 25,
        public string $location = '',
        public ?string $employmentType = null,
        public ?int $salaryMin = null,
        public ?int $salaryMax = null,
        public ?int $postedWithinDays = null,
    ) {}

    public function uniqueId(): string
    {
        return $this->matcherKey;
    }

    public function handle(JobMatcher $matcher, JobScanStatus $status, ?JobSearchFilters $searchFilters = null, ?LlmUsageTracker $usage = null): void
    {
        $searchFilters ??= app(JobSearchFilters::class);
        $usage ??= app(LlmUsageTracker::class);
        $usage->useUser($this->userId);

        $query = JobPosting::query()->active();

        $searchFilters->apply($query, $searchFilters->normalize([
            'search' => $this->search,
            'location' => $this->location,
            'remote' => $this->remoteOnly,
            'employment_type' => $this->employmentType,
            'salary_min' => $this->salaryMin,
            'salary_max' => $this->salaryMax,
            'posted_within_days' => $this->postedWithinDays,
        ]));

        $postings = $query
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->limit(max(1, $this->limit))
            ->get();

        try {
            $status->running($this->matcherKey, $postings->count());

            $completed = 0;
            $failed = 0;

            foreach ($postings as $posting) {
                try {
                    $result = $matcher->score($posting, $this->cvText);

                    JobMatch::query()->updateOrCreate(
                        ['matcher_key' => $this->matcherKey, 'job_posting_id' => $posting->id],
                        [
                            'user_id' => $this->userId,
                            'session_id' => $this->sessionId,
                            'resume_hash' => $this->resumeHash,
                            'score' => $result['score'],
                            'breakdown' => $result['breakdown'],
                            'matched_keywords' => $result['matched'],
                            'missing_keywords' => $result['missing'],
                            'computed_at' => now(),
                        ],
                    );

                    $completed++;
                } catch (LlmBudgetExceededException $exception) {
                    report($exception);
                    $status->failed($this->matcherKey, $exception->getMessage());

                    return;
                } catch (Throwable $exception) {
                    $failed++;
                    report($exception);
                }

                $status->progress($this->matcherKey, $completed + $failed, $postings->count(), $failed);
            }

            if ($completed === 0 && $failed > 0) {
                $status->failed($this->matcherKey, 'Every posting failed to match. Please try again.');

                return;
            }

            $status->completed($this->matcherKey, $completed, $failed);
        } finally {
            $usage->clearUser();
        }
    }

    public function failed(?Throwable $exception): void
    {
        app(JobScanStatus::class)->failed(
            $this->matcherKey,
            'The scan could not be completed. Please try again.',
        );
    }
}
