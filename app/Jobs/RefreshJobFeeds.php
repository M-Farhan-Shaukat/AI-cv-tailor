<?php

namespace App\Jobs;

use App\Services\JobFeedRefresher;
use App\Services\JobSources\JobSearchCriteria;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class RefreshJobFeeds implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 300;

    /**
     * @var array<int, int>
     */
    public array $backoff = [60, 300];

    public int $uniqueFor = 900;

    /**
     * @param  array<int, string>  $providers
     */
    public function __construct(
        public string $query,
        public string $location = '',
        public string $country = '',
        public bool $remoteOnly = false,
        public int $perPage = 50,
        public array $providers = [],
    ) {}

    public function uniqueId(): string
    {
        return 'refresh-feeds:'.hash('sha256', serialize([
            $this->query,
            $this->location,
            $this->country,
            $this->remoteOnly,
            $this->perPage,
            $this->providers,
        ]));
    }

    public function handle(JobFeedRefresher $refresher): void
    {
        if (trim($this->query) === '') {
            return;
        }

        $criteria = JobSearchCriteria::fromArray([
            'query' => $this->query,
            'location' => $this->location,
            'country' => $this->country,
            'remote_only' => $this->remoteOnly,
            'per_page' => $this->perPage,
        ]);

        try {
            $refresher->refresh($criteria, $this->providers);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
