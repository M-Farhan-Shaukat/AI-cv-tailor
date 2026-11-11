<?php

namespace App\Console\Commands;

use App\Services\JobFeedSync;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('jobs:auto-sync {--force : Sync now even if the interval has not passed}')]
#[Description('Fetch job postings for the search terms set in the admin panel, when auto-sync is due')]
class JobsAutoSync extends Command
{
    public function handle(JobFeedSync $sync): int
    {
        if (! $this->option('force') && ! $sync->isDue()) {
            $this->components->info('Auto-sync is off, has no search terms, or is not due yet.');

            return self::SUCCESS;
        }

        if ($sync->settings()['queries'] === []) {
            $this->components->warn('No search terms are set. Add them in Admin → Job feeds.');

            return self::SUCCESS;
        }

        $summary = $sync->run('auto');

        foreach ($summary['providers'] as $provider => $row) {
            $this->components->twoColumnDetail(
                ucfirst($provider),
                $row['status'] === 'ok' ? "{$row['fetched']} fetched, {$row['created']} new" : ($row['message'] ?? $row['status']),
            );
        }

        return self::SUCCESS;
    }
}
