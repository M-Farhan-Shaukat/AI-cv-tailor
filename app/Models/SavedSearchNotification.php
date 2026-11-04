<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['saved_search_id', 'job_posting_id', 'sent_at'])]
class SavedSearchNotification extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    public function savedSearch(): BelongsTo
    {
        return $this->belongsTo(SavedSearch::class);
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }
}
