<?php

namespace App\Services;

use App\Models\JobPosting;
use App\Services\JobSources\JobPostingData;
use Illuminate\Support\Arr;

/**
 * Normalizes provider postings and upserts them without creating duplicates.
 */
class JobIngestionService
{
    public function __construct(protected JobPostingNormalizer $normalizer) {}

    /**
     * @param  iterable<int, JobPostingData>  $postings
     * @return array{created: int, updated: int, skipped: int}
     */
    public function ingestMany(iterable $postings): array
    {
        $stats = ['created' => 0, 'updated' => 0, 'skipped' => 0];

        foreach ($postings as $posting) {
            $stats[$this->ingest($posting)]++;
        }

        return $stats;
    }

    /**
     * @return 'created'|'updated'|'skipped'
     */
    public function ingest(JobPostingData $posting): string
    {
        $title = $this->normalizer->text($posting->title);
        $applyUrl = $this->normalizer->url($posting->applyUrl);
        $description = $this->normalizer->description(
            $posting->description,
            (int) config('job_scan.max_description_length', 100000),
        );

        if ($title === '' || $applyUrl === '' || $description === '') {
            return 'skipped';
        }

        $values = [
            'provider' => mb_substr($posting->provider, 0, 50),
            'external_id' => $posting->externalId !== null ? mb_substr($posting->externalId, 0, 191) : null,
            'title' => $title,
            'company' => $this->normalizer->text($posting->company) ?: null,
            'location' => $this->normalizer->text($posting->location) ?: null,
            'is_remote' => $posting->isRemote || $this->normalizer->looksRemote($posting->location),
            'employment_type' => $this->normalizer->text($posting->employmentType, 50) ?: null,
            'salary_min' => $posting->salaryMin,
            'salary_max' => $posting->salaryMax,
            'currency' => $posting->currency !== null ? mb_strtoupper(mb_substr($posting->currency, 0, 3)) : null,
            'description' => $description,
            'apply_url' => $applyUrl,
            'posted_at' => $posting->postedAt,
            'last_seen_at' => now(),
            'is_active' => true,
        ];

        $jobPosting = JobPosting::query()->firstOrCreate(
            ['fingerprint' => $this->normalizer->fingerprint($posting)],
            $values,
        );

        if ($jobPosting->wasRecentlyCreated) {
            return 'created';
        }

        // Keep the first provider/external id so a duplicate from another source does not rewrite provenance.
        $jobPosting->fill(Arr::except($values, ['provider', 'external_id']))->save();

        return 'updated';
    }

    /**
     * Deactivate postings that have not been returned by any provider recently.
     */
    public function markStale(?int $days = null): int
    {
        $days ??= (int) config('job_scan.stale_after_days', 14);

        return JobPosting::query()
            ->where('is_active', true)
            ->where('last_seen_at', '<', now()->subDays($days))
            ->update(['is_active' => false]);
    }
}
