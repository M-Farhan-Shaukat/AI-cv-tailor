<?php

namespace Tests\Feature;

use App\Jobs\RefreshJobFeeds;
use App\Models\JobPosting;
use App\Services\JobFeedRefresher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobsRefreshFeedsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    public function test_it_requires_a_search_query(): void
    {
        config(['job_scan.default_query' => '']);

        $this->artisan('jobs:refresh-feeds')->assertFailed();
    }

    public function test_it_ingests_postings_from_the_requested_sources(): void
    {
        $this->configureSources();

        Http::fake([
            'api.adzuna.test/*' => Http::response(['results' => [$this->adzunaJob()]]),
            'remotive.test/*' => Http::response(['jobs' => [$this->remotiveJob()]]),
        ]);

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['adzuna', 'remotive'],
        ])->assertSuccessful();

        $this->assertDatabaseCount('job_postings', 1);
        $this->assertDatabaseHas('job_postings', [
            'provider' => 'adzuna',
            'title' => 'Senior Laravel Developer',
            'company' => 'Acme, Inc.',
            'is_active' => true,
        ]);
    }

    public function test_one_failing_source_does_not_prevent_the_others_from_ingesting(): void
    {
        $this->configureSources();

        Http::fake([
            'api.adzuna.test/*' => Http::response(['error' => 'boom'], 500),
            'remotive.test/*' => Http::response(['jobs' => [$this->remotiveJob()]]),
        ]);

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['adzuna', 'remotive'],
        ])->assertSuccessful();

        $this->assertDatabaseCount('job_postings', 1);
        $this->assertDatabaseHas('job_postings', ['provider' => 'remotive']);
    }

    public function test_the_queued_refresh_job_ingests_postings(): void
    {
        $this->configureSources();

        Http::fake([
            'api.adzuna.test/*' => Http::response(['results' => [$this->adzunaJob()]]),
        ]);

        (new RefreshJobFeeds(query: 'laravel', providers: ['adzuna']))
            ->handle(app(JobFeedRefresher::class));

        $this->assertDatabaseCount('job_postings', 1);
        $this->assertDatabaseHas('job_postings', ['provider' => 'adzuna']);
    }

    public function test_it_fails_for_an_unknown_provider(): void
    {
        $this->configureSources();

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['does-not-exist'],
        ])->assertFailed();
    }

    public function test_it_marks_postings_that_disappear_as_inactive(): void
    {
        $this->configureSources();

        $stale = JobPosting::factory()->create(['last_seen_at' => now()->subDays(30)]);

        Http::fake([
            'api.adzuna.test/*' => Http::response(['results' => []]),
        ]);

        $this->artisan('jobs:refresh-feeds', [
            '--query' => 'laravel',
            '--provider' => ['adzuna'],
        ])->assertSuccessful();

        $this->assertFalse($stale->fresh()->is_active);
    }

    protected function configureSources(): void
    {
        config([
            'services.adzuna.app_id' => 'app-id',
            'services.adzuna.app_key' => 'app-key',
            'services.adzuna.base_url' => 'https://api.adzuna.test',
            'services.remotive.base_url' => 'https://remotive.test/api',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function adzunaJob(): array
    {
        return [
            'id' => '123',
            'title' => 'Senior Laravel Developer',
            'company' => ['display_name' => 'Acme, Inc.'],
            'location' => ['display_name' => 'Remote (UK)'],
            'description' => '<p>Build <strong>Laravel</strong> APIs.</p>',
            'redirect_url' => 'https://adzuna.test/jobs/123',
            'created' => '2026-01-15T10:00:00Z',
            'salary_min' => 60000,
            'salary_max' => 80000,
            'contract_time' => 'full_time',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function remotiveJob(): array
    {
        return [
            'id' => 500,
            'title' => 'Senior Laravel Developer',
            'company_name' => 'Acme, Inc.',
            'candidate_required_location' => 'Remote (UK)',
            'job_type' => 'full_time',
            'description' => '<p>Build <strong>Laravel</strong> APIs.</p>',
            'url' => 'https://remotive.test/jobs/500',
            'publication_date' => '2026-01-15T10:00:00',
        ];
    }
}
