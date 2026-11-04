<?php

namespace App\Services;

use App\Models\JobSourceEvent;
use App\Models\JobSourceStatus;

/**
 * Tracks provider health and opens a per-provider cooldown after repeated failures.
 */
class JobSourceHealth
{
    public function status(string $provider): JobSourceStatus
    {
        return JobSourceStatus::query()->firstOrCreate(['provider' => $provider]);
    }

    public function isAvailable(string $provider): bool
    {
        $status = JobSourceStatus::query()->where('provider', $provider)->first();

        return $status === null || ! $status->isCoolingDown();
    }

    public function cooldownUntil(string $provider): ?\DateTimeInterface
    {
        return JobSourceStatus::query()->where('provider', $provider)->first()?->disabled_until;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function recordSuccess(string $provider, array $context = []): void
    {
        $status = $this->status($provider);

        $status->forceFill([
            'last_attempt_at' => now(),
            'last_success_at' => now(),
            'consecutive_failures' => 0,
            'disabled_until' => null,
        ])->save();

        JobSourceEvent::query()->create([
            'provider' => $provider,
            'successful' => true,
            'status_code' => 200,
            'message' => null,
            'context' => $context ?: null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function recordFailure(string $provider, ?int $statusCode, string $message, array $context = []): void
    {
        $status = $this->status($provider);
        $failures = $status->consecutive_failures + 1;
        $threshold = max(1, (int) config('job_scan.circuit_breaker_failure_threshold', 3));
        $cooldown = max(1, (int) config('job_scan.circuit_breaker_cooldown_minutes', 15));

        $status->forceFill([
            'last_attempt_at' => now(),
            'last_error_at' => now(),
            'last_status_code' => $statusCode,
            'last_error_message' => mb_substr($message, 0, 2000),
            'consecutive_failures' => $failures,
            'disabled_until' => $failures >= $threshold ? now()->addMinutes($cooldown) : $status->disabled_until,
        ])->save();

        JobSourceEvent::query()->create([
            'provider' => $provider,
            'successful' => false,
            'status_code' => $statusCode,
            'message' => mb_substr($message, 0, 2000),
            'context' => $context ?: null,
        ]);
    }
}
