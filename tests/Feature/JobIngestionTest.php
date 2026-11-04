<?php

namespace Tests\Feature;

use App\Models\JobPosting;
use App\Services\JobIngestionService;
use App\Services\JobPostingNormalizer;
use App\Services\JobSources\JobPostingData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobIngestionTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_stores_a_new_posting(): void
    {
        $stats = app(JobIngestionService::class)->ingestMany([$this->posting()]);

        $this->assertSame(['created' => 1, 'updated' => 0, 'skipped' => 0], $stats);
        $this->assertDatabaseCount('job_postings', 1);
        $this->assertDatabaseHas('job_postings', [
            'title' => 'Senior Laravel Developer',
            'company' => 'Acme, Inc.',
            'is_remote' => true,
        ]);
    }

    public function test_ingesting_the_same_posting_from_another_provider_updates_instead_of_duplicating(): void
    {
        $service = app(JobIngestionService::class);
        $service->ingest($this->posting());

        $stats = $service->ingestMany([$this->posting(provider: 'jooble', externalId: '999')]);

        $this->assertSame(['created' => 0, 'updated' => 1, 'skipped' => 0], $stats);
        $this->assertDatabaseCount('job_postings', 1);

        $posting = JobPosting::firstOrFail();
        $this->assertSame('adzuna', $posting->provider);
        $this->assertSame('1', $posting->external_id);
        $this->assertTrue($posting->is_active);
    }

    public function test_it_reactivates_a_previously_inactive_posting(): void
    {
        $existing = JobPosting::factory()->create([
            'fingerprint' => app(JobPostingNormalizer::class)->fingerprint($this->posting()),
            'title' => 'Senior Laravel Developer',
            'company' => 'Acme Inc',
            'location' => 'Remote (EU)',
            'is_active' => false,
            'last_seen_at' => now()->subDays(30),
        ]);

        app(JobIngestionService::class)->ingest($this->posting());

        $this->assertTrue($existing->fresh()->is_active);
        $this->assertTrue($existing->fresh()->last_seen_at->isToday());
    }

    public function test_it_skips_postings_without_a_title_or_application_url(): void
    {
        $stats = app(JobIngestionService::class)->ingestMany([
            $this->posting(title: ''),
            $this->posting(applyUrl: 'not-a-url'),
            $this->posting(description: ''),
        ]);

        $this->assertSame(['created' => 0, 'updated' => 0, 'skipped' => 3], $stats);
        $this->assertDatabaseCount('job_postings', 0);
    }

    public function test_it_marks_only_stale_postings_inactive(): void
    {
        $stale = JobPosting::factory()->create(['last_seen_at' => now()->subDays(30)]);
        $recent = JobPosting::factory()->create(['last_seen_at' => now()->subDay()]);

        $updated = app(JobIngestionService::class)->markStale(14);

        $this->assertSame(1, $updated);
        $this->assertFalse($stale->fresh()->is_active);
        $this->assertTrue($recent->fresh()->is_active);
    }

    protected function posting(
        string $provider = 'adzuna',
        string $externalId = '1',
        string $title = 'Senior Laravel Developer',
        string $applyUrl = 'https://example.com/jobs/1',
        string $description = 'We are a remote-first team building Laravel APIs.',
    ): JobPostingData {
        return new JobPostingData(
            provider: $provider,
            title: $title,
            description: $description,
            applyUrl: $applyUrl,
            externalId: $externalId,
            company: 'Acme, Inc.',
            location: 'Remote (EU)',
            isRemote: true,
            employmentType: 'full_time',
            salaryMin: 60000,
            salaryMax: 80000,
            currency: 'GBP',
        );
    }
}
