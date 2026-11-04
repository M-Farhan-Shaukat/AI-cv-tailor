<?php

namespace App\Jobs;

use App\Models\SavedSearch;
use App\Models\SavedSearchNotification;
use App\Services\SavedSearchRunner;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RunSavedSearch implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @var array<int, int>
     */
    public array $backoff = [30, 120];

    public int $uniqueFor = 3600;

    public function __construct(public int $savedSearchId) {}

    public function uniqueId(): string
    {
        return 'saved-search:'.$this->savedSearchId;
    }

    public function handle(SavedSearchRunner $runner): void
    {
        $savedSearch = SavedSearch::query()->find($this->savedSearchId);

        if ($savedSearch === null) {
            return;
        }

        $runner->run($savedSearch, $savedSearch->alerts_enabled);

        $hasPendingAlerts = $savedSearch->alerts_enabled
            && SavedSearchNotification::query()
                ->where('saved_search_id', $savedSearch->id)
                ->whereNull('sent_at')
                ->exists();

        if ($hasPendingAlerts) {
            SendSavedSearchDigest::dispatch($savedSearch->id);
        }
    }
}
