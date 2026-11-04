<?php

namespace App\Services\JobSources;

use Illuminate\Support\Collection;

interface JobSource
{
    /**
     * Stable identifier used in config, the database and the console output.
     */
    public function name(): string;

    /**
     * Whether the source has the credentials/configuration it needs to run.
     */
    public function isConfigured(): bool;

    /**
     * Fetch and map postings into the provider-independent representation.
     *
     * @return Collection<int, JobPostingData>
     */
    public function search(JobSearchCriteria $criteria): Collection;
}
