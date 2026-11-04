<?php

namespace App\Jobs;

use App\Mail\SavedSearchDigest;
use App\Models\SavedSearch;
use App\Models\SavedSearchNotification;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendSavedSearchDigest implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @var array<int, int>
     */
    public array $backoff = [30, 120];

    public int $uniqueFor = 1800;

    public function __construct(public int $savedSearchId) {}

    public function uniqueId(): string
    {
        return 'saved-search-digest:'.$this->savedSearchId;
    }

    public function handle(): void
    {
        $savedSearch = SavedSearch::query()->with('user')->find($this->savedSearchId);

        if ($savedSearch === null || $savedSearch->user === null || ! $savedSearch->alerts_enabled) {
            return;
        }

        $notifications = SavedSearchNotification::query()
            ->where('saved_search_id', $savedSearch->id)
            ->whereNull('sent_at')
            ->with('jobPosting')
            ->orderBy('id')
            ->get();

        $postings = $notifications->pluck('jobPosting')->filter()->values();

        if ($postings->isEmpty()) {
            return;
        }

        Mail::to($savedSearch->user)->send(new SavedSearchDigest($savedSearch, $postings));

        SavedSearchNotification::query()
            ->whereKey($notifications->modelKeys())
            ->update(['sent_at' => now()]);
    }
}
