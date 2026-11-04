<?php

namespace App\Models;

use Database\Factories\JobPostingFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobPosting extends Model
{
    /** @use HasFactory<JobPostingFactory> */
    use HasFactory;

    protected $fillable = [
        'provider',
        'external_id',
        'fingerprint',
        'title',
        'company',
        'location',
        'is_remote',
        'employment_type',
        'salary_min',
        'salary_max',
        'currency',
        'description',
        'apply_url',
        'keywords',
        'keywords_hash',
        'posted_at',
        'last_seen_at',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_remote' => 'boolean',
            'is_active' => 'boolean',
            'keywords' => 'array',
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'posted_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * Limit the query to postings that are still listed by their source.
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Full-text style filter used by the job search page.
     */
    #[Scope]
    protected function search(Builder $query, string $term): void
    {
        $term = trim($term);

        if ($term === '') {
            return;
        }

        $like = '%'.$term.'%';

        $query->where(function (Builder $query) use ($like): void {
            $query->where('title', 'like', $like)
                ->orWhere('company', 'like', $like)
                ->orWhere('description', 'like', $like);
        });
    }
}
