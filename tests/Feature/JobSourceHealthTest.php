<?php

namespace Tests\Feature;

use App\Models\JobSourceEvent;
use App\Models\JobSourceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobSourceHealthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.adzuna.app_id' => 'app-id',
            'services.adzuna.app_key' => 'app-key',
            'services.adzuna.base_url' => 'https://api.adzuna.test',
            'job_scan.circuit_breaker_failure_threshold' => 1,
            'job_scan.circuit_breaker_cooldown_minutes' => 15,
        ]);
    }

    public function test_repeated_failures_open_the_provider_circuit(): void
    {
        Http::fake([
            'api.adzuna.test/*' => Http::response(['error' => 'down'], 500),
        ]);

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['adzuna'],
        ])->assertFailed();

        $status = JobSourceStatus::query()->where('provider', 'adzuna')->firstOrFail();

        $this->assertSame(1, $status->consecutive_failures);
        $this->assertNotNull($status->disabled_until);
        $this->assertSame(500, $status->last_status_code);
        $this->assertDatabaseHas('job_source_events', [
            'provider' => 'adzuna',
            'successful' => false,
            'status_code' => 500,
        ]);
    }

    public function test_a_cooling_down_provider_is_skipped_without_a_request(): void
    {
        JobSourceStatus::factory()->create([
            'provider' => 'adzuna',
            'consecutive_failures' => 1,
            'disabled_until' => now()->addMinutes(10),
        ]);

        Http::fake();

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['adzuna'],
        ])->assertSuccessful();

        Http::assertNothingSent();
        $this->assertDatabaseCount('job_source_events', 0);
    }

    public function test_a_successful_sync_resets_the_failure_count(): void
    {
        JobSourceStatus::factory()->create([
            'provider' => 'adzuna',
            'consecutive_failures' => 2,
            'disabled_until' => null,
        ]);

        Http::fake([
            'api.adzuna.test/*' => Http::response(['results' => []]),
        ]);

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['adzuna'],
        ])->assertSuccessful();

        $status = JobSourceStatus::query()->where('provider', 'adzuna')->firstOrFail();

        $this->assertSame(0, $status->consecutive_failures);
        $this->assertNull($status->disabled_until);
        $this->assertNotNull($status->last_success_at);
        $this->assertSame(1, JobSourceEvent::query()->where('successful', true)->count());
    }
}
