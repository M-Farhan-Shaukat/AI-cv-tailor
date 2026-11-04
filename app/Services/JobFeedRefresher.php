<?php

namespace App\Services;

use App\Services\JobSources\JobSearchCriteria;
use App\Services\JobSources\JobSourceManager;
use App\Services\JobSources\JobSourceRequestException;
use Illuminate\Http\Client\RequestException;
use Throwable;

/**
 * Runs one feed refresh across the selected providers, recording health so a
 * failed source is cooled down without stopping the other sources.
 */
class JobFeedRefresher
{
    public function __construct(
        protected JobSourceManager $sources,
        protected JobIngestionService $ingestion,
        protected JobSourceHealth $health,
    ) {}

    /**
     * @param  array<int, string>  $providers
     * @return array{attempted: int, succeeded: int, skipped: int, failed: int, stale: int, results: array<int, array<string, mixed>>}
     */
    public function refresh(JobSearchCriteria $criteria, array $providers = []): array
    {
        $selected = $this->sources->only($providers);

        $results = [];
        $attempted = 0;
        $succeeded = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($selected as $name => $source) {
            if (! $source->isConfigured()) {
                $results[] = [
                    'provider' => $name,
                    'status' => 'unconfigured',
                    'message' => 'Not configured.',
                ];

                continue;
            }

            if (! $this->health->isAvailable($name)) {
                $skipped++;
                $until = $this->health->cooldownUntil($name);

                $results[] = [
                    'provider' => $name,
                    'status' => 'cooling_down',
                    'message' => 'Skipped after repeated failures until '.($until?->format('Y-m-d H:i') ?? 'later').'.',
                ];

                continue;
            }

            $attempted++;

            try {
                $postings = $source->search($criteria);
                $stats = $this->ingestion->ingestMany($postings);

                $this->health->recordSuccess($name, $stats);
                $succeeded++;

                $results[] = [
                    'provider' => $name,
                    'status' => 'ok',
                    'message' => null,
                    'stats' => $stats,
                    'fetched' => $postings->count(),
                ];
            } catch (Throwable $exception) {
                $failed++;
                $this->health->recordFailure(
                    $name,
                    $this->statusCode($exception),
                    $exception->getMessage(),
                );
                report($exception);

                $results[] = [
                    'provider' => $name,
                    'status' => 'failed',
                    'message' => $exception->getMessage(),
                ];
            }
        }

        $stale = $succeeded > 0 ? $this->ingestion->markStale() : 0;

        return [
            'attempted' => $attempted,
            'succeeded' => $succeeded,
            'skipped' => $skipped,
            'failed' => $failed,
            'stale' => $stale,
            'results' => $results,
        ];
    }

    protected function statusCode(Throwable $exception): ?int
    {
        if ($exception instanceof JobSourceRequestException) {
            return $exception->statusCode;
        }

        if ($exception instanceof RequestException) {
            return $exception->response->status();
        }

        if (preg_match('/status (\d{3})/', $exception->getMessage(), $matches) === 1) {
            return (int) $matches[1];
        }

        return null;
    }
}
