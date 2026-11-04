<?php

namespace App\Models;

use Database\Factories\JobMatchFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobMatch extends Model
{
    /** @use HasFactory<JobMatchFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_id',
        'matcher_key',
        'resume_hash',
        'job_posting_id',
        'score',
        'breakdown',
        'matched_keywords',
        'missing_keywords',
        'computed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'breakdown' => 'array',
            'matched_keywords' => 'array',
            'missing_keywords' => 'array',
            'computed_at' => 'datetime',
        ];
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Limit the query to one resume/session match set.
     */
    #[Scope]
    protected function forMatcher(Builder $query, string $matcherKey): void
    {
        $query->where('matcher_key', $matcherKey);
    }
}
