<?php

namespace App\Services;

use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Models\SavedJob;

/**
 * Shapes job postings for the Inertia pages so the jobs list, job detail and
 * saved jobs page render the same fields.
 */
class JobPostingPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(JobPosting $posting, ?JobMatch $match = null, ?SavedJob $saved = null): array
    {
        return [
            'id' => $posting->id,
            'title' => $posting->title,
            'company' => $posting->company,
            'location' => $posting->location,
            'is_remote' => $posting->is_remote,
            'employment_type' => $posting->employment_type,
            'salary_min' => $posting->salary_min,
            'salary_max' => $posting->salary_max,
            'currency' => $posting->currency,
            'source' => $posting->provider,
            'posted_at' => $posting->posted_at?->toIso8601String(),
            'url' => route('jobs.show', $posting),
            'saved' => $saved !== null ? [
                'id' => $saved->id,
                'status' => $saved->status->value,
            ] : null,
            'match' => $match ? $this->matchSummary($match) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function details(JobPosting $posting, ?JobMatch $match = null, ?SavedJob $saved = null): array
    {
        return [
            ...$this->summary($posting, $match, $saved),
            'description' => $posting->description,
            'apply_url' => $posting->apply_url,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function matchSummary(JobMatch $match): array
    {
        $matched = $match->matched_keywords ?? [];
        $missing = $match->missing_keywords ?? [];
        $required = fn (array $keyword): bool => ($keyword['importance'] ?? '') === 'required';

        return [
            'score' => $match->score,
            'matched_count' => count($matched),
            'missing_count' => count($missing),
            'required_total' => count(array_filter([...$matched, ...$missing], $required)),
            'required_matched' => count(array_filter($matched, $required)),
            'computed_at' => $match->computed_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function match(JobMatch $match): array
    {
        return [
            ...$this->matchSummary($match),
            'breakdown' => $match->breakdown ?? [],
            'matched' => $match->matched_keywords ?? [],
            'missing' => $match->missing_keywords ?? [],
        ];
    }
}
