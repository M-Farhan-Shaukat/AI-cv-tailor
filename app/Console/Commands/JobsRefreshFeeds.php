<?php

namespace App\Console\Commands;

use App\Services\JobFeedRefresher;
use App\Services\JobSources\JobSearchCriteria;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('jobs:refresh-feeds {--query= : Search keywords (defaults to JOB_DEFAULT_QUERY)} {--location= : Location filter} {--country= : Provider country code} {--remote : Only remote postings} {--provider=* : Limit to one or more configured sources} {--per-page=50 : Postings requested per source}')]
#[Description('Fetch job postings from the configured providers and store new or updated results')]
class JobsRefreshFeeds extends Command
{
    public function handle(JobFeedRefresher $refresher): int
    {
        $criteria = JobSearchCriteria::fromArray([
            'query' => $this->option('query') ?: config('job_scan.default_query'),
            'location' => $this->option('location') ?: config('job_scan.default_location'),
            'country' => $this->option('country') ?: config('job_scan.default_country'),
            'remote_only' => (bool) $this->option('remote'),
            'per_page' => (int) $this->option('per-page'),
        ]);

        if ($criteria->query === '') {
            $this->components->error('A search query is required. Pass --query or set JOB_DEFAULT_QUERY.');

            return self::FAILURE;
        }

        try {
            $result = $refresher->refresh($criteria, (array) $this->option('provider'));
        } catch (Throwable $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach ($result['results'] as $source) {
            match ($source['status']) {
                'ok' => $this->components->info(sprintf(
                    '%s: %d fetched, %d new, %d updated, %d skipped.',
                    $source['provider'],
                    $source['fetched'],
                    $source['stats']['created'],
                    $source['stats']['updated'],
                    $source['stats']['skipped'],
                )),
                'unconfigured' => $this->components->warn("Skipping {$source['provider']}: not configured."),
                'cooling_down' => $this->components->warn("Skipping {$source['provider']}: {$source['message']}"),
                'failed' => $this->components->error("{$source['provider']} failed: {$source['message']}"),
            };
        }

        if ($result['attempted'] === 0 && $result['skipped'] === 0) {
            $this->components->error('No configured job sources were available.');

            return self::FAILURE;
        }

        if ($result['skipped'] > 0) {
            $this->components->warn("Skipped {$result['skipped']} source(s) in cooldown.");
        }

        if ($result['succeeded'] > 0) {
            $this->components->info("Marked {$result['stale']} posting(s) inactive.");
        }

        return $result['attempted'] > 0 && $result['failed'] === $result['attempted']
            ? self::FAILURE
            : self::SUCCESS;
    }
}
