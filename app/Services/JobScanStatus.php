<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Progress of one resume/scan, kept in the cache so the queued worker and the
 * web request that polls the UI share the same state.
 */
class JobScanStatus
{
    public const Queued = 'queued';

    public const Running = 'running';

    public const Completed = 'completed';

    public const Failed = 'failed';

    public function queued(string $matcherKey): void
    {
        $this->put($matcherKey, [
            'status' => self::Queued,
            'total' => null,
            'completed' => 0,
            'failed' => 0,
        ]);
    }

    public function running(string $matcherKey, int $total): void
    {
        $this->put($matcherKey, [
            'status' => self::Running,
            'total' => $total,
            'completed' => 0,
            'failed' => 0,
            'started_at' => now()->toIso8601String(),
        ]);
    }

    public function progress(string $matcherKey, int $completed, int $total, int $failed = 0): void
    {
        $this->put($matcherKey, [
            'status' => self::Running,
            'total' => $total,
            'completed' => $completed,
            'failed' => $failed,
        ]);
    }

    public function completed(string $matcherKey, int $completed, int $failed = 0): void
    {
        $this->put($matcherKey, [
            'status' => self::Completed,
            'total' => $completed + $failed,
            'completed' => $completed,
            'failed' => $failed,
            'finished_at' => now()->toIso8601String(),
        ]);
    }

    public function failed(string $matcherKey, string $message): void
    {
        $this->put($matcherKey, [
            'status' => self::Failed,
            'message' => $message,
            'finished_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function get(string $matcherKey): ?array
    {
        return Cache::get($this->key($matcherKey));
    }

    /**
     * @param  array<string, mixed>  $value
     */
    protected function put(string $matcherKey, array $value): void
    {
        Cache::put(
            $this->key($matcherKey),
            [...$value, 'updated_at' => now()->toIso8601String()],
            now()->addSeconds((int) config('job_scan.status_ttl', 3600)),
        );
    }

    protected function key(string $matcherKey): string
    {
        return 'job-scan:status:'.$matcherKey;
    }
}
