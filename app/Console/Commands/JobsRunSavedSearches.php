<?php

namespace App\Console\Commands;

use App\Jobs\RunSavedSearch;
use App\Models\SavedSearch;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('jobs:run-saved-searches {--limit=0 : Maximum number of saved searches to queue (0 = all)}')]
#[Description('Queue saved searches that are due so new matching postings trigger alerts')]
class JobsRunSavedSearches extends Command
{
    public function handle(): int
    {
        $interval = max(1, (int) config('job_scan.saved_search_interval_minutes', 60));
        $cutoff = now()->subMinutes($interval);

        $query = SavedSearch::query()
            ->where('alerts_enabled', true)
            ->where(fn ($query) => $query
                ->whereNull('last_run_at')
                ->orWhere('last_run_at', '<=', $cutoff));

        $limit = max(0, (int) $this->option('limit'));
        $queued = 0;

        if ($limit > 0) {
            foreach ((clone $query)->orderBy('id')->limit($limit)->pluck('id') as $id) {
                RunSavedSearch::dispatch((int) $id);
                $queued++;
            }
        } else {
            $query->orderBy('id')->chunkById(100, function ($searches) use (&$queued): void {
                foreach ($searches as $savedSearch) {
                    RunSavedSearch::dispatch($savedSearch->id);
                    $queued++;
                }
            });
        }

        $this->components->info("Queued {$queued} saved search(es).");

        return self::SUCCESS;
    }
}
