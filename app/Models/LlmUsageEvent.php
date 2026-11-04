<?php

namespace App\Models;

use Database\Factories\LlmUsageEventFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LlmUsageEvent extends Model
{
    /** @use HasFactory<LlmUsageEventFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'scope',
        'model',
        'status',
        'status_code',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'duration_ms',
        'error',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'total_tokens' => 'integer',
            'duration_ms' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    #[Scope]
    protected function since(Builder $query, \DateTimeInterface $date): void
    {
        $query->where('created_at', '>=', $date);
    }
}
