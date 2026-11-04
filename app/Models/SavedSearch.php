<?php

namespace App\Models;

use Database\Factories\SavedSearchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'name', 'query', 'filters', 'min_score', 'alerts_enabled', 'last_run_at'])]
class SavedSearch extends Model
{
    /** @use HasFactory<SavedSearchFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'min_score' => 'integer',
            'alerts_enabled' => 'boolean',
            'last_run_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<SavedSearchNotification, $this>
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(SavedSearchNotification::class);
    }
}
