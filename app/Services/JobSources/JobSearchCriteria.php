<?php

namespace App\Services\JobSources;

final readonly class JobSearchCriteria
{
    public function __construct(
        public string $query = '',
        public string $location = '',
        public string $country = '',
        public bool $remoteOnly = false,
        public ?string $employmentType = null,
        public int $page = 1,
        public int $perPage = 50,
        public ?int $postedWithinDays = null,
    ) {}

    /**
     * @param  array<string, mixed>  $values
     */
    public static function fromArray(array $values): self
    {
        $perPage = (int) ($values['per_page'] ?? 50);

        return new self(
            query: trim((string) ($values['query'] ?? '')),
            location: trim((string) ($values['location'] ?? '')),
            country: trim((string) ($values['country'] ?? '')),
            remoteOnly: filter_var($values['remote_only'] ?? false, FILTER_VALIDATE_BOOLEAN),
            employmentType: filled($values['employment_type'] ?? null) ? (string) $values['employment_type'] : null,
            page: max(1, (int) ($values['page'] ?? 1)),
            perPage: min(100, max(1, $perPage)),
            postedWithinDays: filled($values['posted_within_days'] ?? null) ? max(1, (int) $values['posted_within_days']) : null,
        );
    }

    public function withPerPage(int $perPage): self
    {
        return new self(
            query: $this->query,
            location: $this->location,
            country: $this->country,
            remoteOnly: $this->remoteOnly,
            employmentType: $this->employmentType,
            page: $this->page,
            perPage: min(100, max(1, $perPage)),
            postedWithinDays: $this->postedWithinDays,
        );
    }
}
