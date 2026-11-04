<?php

namespace App\Services;

use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Models\SavedSearch;
use App\Models\SavedSearchNotification;
use Throwable;

/**
 * Scores new postings for one saved search and records the ones that should
 * trigger an alert. Notification rows double as the dedupe ledger.
 */
class SavedSearchRunner
{
    public function __construct(
        protected JobMatcher $matcher,
        protected JobSearchFilters $filters,
        protected LlmUsageTracker $usage,
    ) {}

    public function run(SavedSearch $savedSearch, bool $notify = true): int
    {
        $savedSearch->loadMissing('user');
        $user = $savedSearch->user;
        $resume = $user?->primaryResume();

        if ($user === null || $resume === null || ! filled($resume->extracted_text)) {
            $savedSearch->forceFill(['last_run_at' => now()])->save();

            return 0;
        }

        $cvText = (string) $resume->extracted_text;
        $resumeHash = hash('sha256', $cvText);
        $matcherKey = $this->matcher->matcherKey($user->id, null, $resumeHash);

        $filters = $this->filters->normalize((array) ($savedSearch->filters ?? []), $savedSearch->query);

        $query = JobPosting::query()
            ->active()
            ->whereNotIn('id', fn ($query) => $query
                ->select('job_posting_id')
                ->from('saved_search_notifications')
                ->where('saved_search_id', $savedSearch->id));

        $this->filters->apply($query, $filters);

        $postings = $query
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->limit((int) config('job_scan.saved_search_limit', 100))
            ->get();

        $matches = JobMatch::query()
            ->where('matcher_key', $matcherKey)
            ->whereIn('job_posting_id', $postings->pluck('id'))
            ->get()
            ->keyBy('job_posting_id');

        $created = 0;

        $this->usage->useUser($user->id);

        try {
            foreach ($postings as $posting) {
                try {
                    $match = $matches->get($posting->id);

                    if ($match === null) {
                        $result = $this->matcher->score($posting, $cvText);

                        $match = JobMatch::query()->updateOrCreate(
                            ['matcher_key' => $matcherKey, 'job_posting_id' => $posting->id],
                            [
                                'user_id' => $user->id,
                                'session_id' => null,
                                'resume_hash' => $resumeHash,
                                'score' => $result['score'],
                                'breakdown' => $result['breakdown'],
                                'matched_keywords' => $result['matched'],
                                'missing_keywords' => $result['missing'],
                                'computed_at' => now(),
                            ],
                        );
                    }

                    if (! $notify || $match->score < $savedSearch->min_score) {
                        continue;
                    }

                    $notification = SavedSearchNotification::query()->firstOrCreate([
                        'saved_search_id' => $savedSearch->id,
                        'job_posting_id' => $posting->id,
                    ]);

                    if ($notification->wasRecentlyCreated) {
                        $created++;
                    }
                } catch (LlmBudgetExceededException $exception) {
                    report($exception);

                    break;
                } catch (Throwable $exception) {
                    report($exception);
                }
            }
        } finally {
            $this->usage->clearUser();
            $savedSearch->forceFill(['last_run_at' => now()])->save();
        }

        return $created;
    }
}
