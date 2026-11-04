<?php

namespace App\Services\JobSources;

use Carbon\CarbonImmutable;

/**
 * Provider-independent representation of a job posting before it is normalized and stored.
 */
final readonly class JobPostingData
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public string $provider,
        public string $title,
        public string $description,
        public string $applyUrl,
        public ?string $externalId = null,
        public ?string $company = null,
        public ?string $location = null,
        public bool $isRemote = false,
        public ?string $employmentType = null,
        public ?int $salaryMin = null,
        public ?int $salaryMax = null,
        public ?string $currency = null,
        public ?CarbonImmutable $postedAt = null,
        public array $raw = [],
    ) {}
}
