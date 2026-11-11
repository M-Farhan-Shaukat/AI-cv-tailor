<?php

namespace App\Services;

use App\Models\Setting;
use App\Services\JobSources\JobSearchCriteria;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * What to fetch from the job providers and when: search terms, location, country and the auto-sync
 * schedule, edited in the admin panel. Runs a sync for every search term and remembers the last run.
 */
class JobFeedSync
{
    public const SETTINGS_KEY = 'job_feed_sync';

    public const LAST_RUN_KEY = 'job_feed_last_sync';

    public const MAX_QUERIES = 10;

    /**
     * Hours an admin can choose between automatic syncs.
     */
    public const INTERVALS = [1, 3, 6, 12, 24];

    /**
     * Updated every minute by the scheduler, so the panel can tell whether it is running.
     */
    public const SCHEDULER_HEARTBEAT_KEY = 'scheduler:heartbeat';

    public function __construct(protected JobFeedRefresher $refresher) {}

    /**
     * Saved settings, falling back to JOB_DEFAULT_QUERY and friends from .env.
     *
     * @return array{queries: array<int, string>, location: string, country: string, remote_only: bool, per_page: int, auto_sync: bool, interval_hours: int}
     */
    public function settings(): array
    {
        $saved = (array) Setting::get(self::SETTINGS_KEY, []);
        $defaultQuery = trim((string) config('job_scan.default_query'));

        return [
            'queries' => array_values((array) ($saved['queries'] ?? ($defaultQuery !== '' ? [$defaultQuery] : []))),
            'location' => (string) ($saved['location'] ?? config('job_scan.default_location', '')),
            'country' => (string) ($saved['country'] ?? config('job_scan.default_country', '')),
            'remote_only' => (bool) ($saved['remote_only'] ?? false),
            'per_page' => (int) ($saved['per_page'] ?? config('job_scan.per_page', 50)),
            'auto_sync' => (bool) ($saved['auto_sync'] ?? $defaultQuery !== ''),
            'interval_hours' => (int) ($saved['interval_hours'] ?? 6),
        ];
    }

    /**
     * @param  array{queries: array<int, string>, location?: string|null, country?: string|null, remote_only?: bool, per_page: int, auto_sync: bool, interval_hours: int}  $settings
     */
    public function saveSettings(array $settings): void
    {
        Setting::put(self::SETTINGS_KEY, [
            'queries' => array_values(array_unique(array_filter(array_map(fn (?string $query): string => trim((string) $query), $settings['queries'])))),
            'location' => trim((string) ($settings['location'] ?? '')),
            'country' => strtolower(trim((string) ($settings['country'] ?? ''))),
            'remote_only' => (bool) ($settings['remote_only'] ?? false),
            'per_page' => $settings['per_page'],
            'auto_sync' => $settings['auto_sync'],
            'interval_hours' => $settings['interval_hours'],
        ]);
    }

    /**
     * Fetch every search term from every configured provider (or just one) and store the postings.
     *
     * @return array{trigger: string, provider: string|null, queries: int, finished_at: string, providers: array<string, array{status: string, fetched: int, created: int, updated: int, message: string|null}>}
     */
    public function run(string $trigger, ?string $provider = null): array
    {
        $settings = $this->settings();
        $totals = [];

        foreach ($settings['queries'] as $query) {
            $criteria = JobSearchCriteria::fromArray([
                'query' => $query,
                'location' => $settings['location'],
                'country' => $settings['country'],
                'remote_only' => $settings['remote_only'],
                'per_page' => $settings['per_page'],
            ]);

            $result = $this->refresher->refresh($criteria, $provider === null ? [] : [$provider]);

            foreach ($result['results'] as $row) {
                $current = $totals[$row['provider']] ?? ['status' => $row['status'], 'fetched' => 0, 'created' => 0, 'updated' => 0, 'message' => null];

                // One failing search term should not hide that the provider worked for the others.
                $current['status'] = $current['status'] === 'ok' ? 'ok' : $row['status'];
                $current['fetched'] += (int) ($row['fetched'] ?? 0);
                $current['created'] += (int) ($row['stats']['created'] ?? 0);
                $current['updated'] += (int) ($row['stats']['updated'] ?? 0);
                $current['message'] ??= $row['message'] ?? null;

                $totals[$row['provider']] = $current;
            }
        }

        $summary = [
            'trigger' => $trigger,
            'provider' => $provider,
            'queries' => count($settings['queries']),
            'finished_at' => now()->toIso8601String(),
            'providers' => $totals,
        ];

        Setting::put(self::LAST_RUN_KEY, $summary);

        return $summary;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function lastRun(): ?array
    {
        $lastRun = Setting::get(self::LAST_RUN_KEY);

        return is_array($lastRun) ? $lastRun : null;
    }

    /**
     * Whether auto-sync is on, has something to search for and its interval has passed.
     */
    public function isDue(): bool
    {
        $settings = $this->settings();

        if (! $settings['auto_sync'] || $settings['queries'] === []) {
            return false;
        }

        $finishedAt = $this->lastRun()['finished_at'] ?? null;

        return $finishedAt === null
            || Carbon::parse($finishedAt)->addHours($settings['interval_hours'])->subMinutes(5)->isPast();
    }

    public function nextAutoSyncAt(): ?string
    {
        $settings = $this->settings();

        if (! $settings['auto_sync'] || $settings['queries'] === []) {
            return null;
        }

        $finishedAt = $this->lastRun()['finished_at'] ?? null;

        return $finishedAt === null ? now()->toIso8601String() : Carbon::parse($finishedAt)->addHours($settings['interval_hours'])->toIso8601String();
    }

    public function recordSchedulerHeartbeat(): void
    {
        Cache::put(self::SCHEDULER_HEARTBEAT_KEY, now()->getTimestamp(), now()->addMinutes(10));
    }

    /**
     * The scheduler counts as running if it checked in during the last five minutes.
     */
    public function schedulerIsRunning(): bool
    {
        $lastBeat = Cache::get(self::SCHEDULER_HEARTBEAT_KEY);

        return is_numeric($lastBeat) && now()->getTimestamp() - (int) $lastBeat <= 300;
    }
}
