<?php

namespace Tests\Feature;

use App\Jobs\ComputeJobMatches;
use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Services\JobMatcher;
use App\Services\JobScanStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobMatchTest extends TestCase
{
    use RefreshDatabase;

    protected const CV_TEXT = 'Laravel developer with Docker experience building REST APIs for three products.';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.groq.key' => 'test-key',
            'services.groq.url' => 'https://api.groq.test/chat',
        ]);
    }

    public function test_it_scores_a_posting_and_stores_the_report(): void
    {
        $this->fakeKeywords();
        $posting = $this->posting(['title' => 'Laravel Developer']);

        $this->jobFor($posting)->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $match = JobMatch::firstOrFail();

        $this->assertSame($posting->id, $match->job_posting_id);
        $this->assertGreaterThan(0, $match->score);
        $this->assertNotEmpty($match->breakdown);
        $this->assertContains('Laravel', array_column($match->matched_keywords, 'term'));
        $this->assertContains('Kubernetes', array_column($match->missing_keywords, 'term'));
        $this->assertNotNull($match->computed_at);
    }

    public function test_keywords_are_cached_per_posting_between_scans(): void
    {
        $this->fakeKeywords();
        $posting = $this->posting();

        $this->jobFor($posting)->handle(app(JobMatcher::class), app(JobScanStatus::class));
        $this->jobFor($posting)->handle(app(JobMatcher::class), app(JobScanStatus::class));

        Http::assertSentCount(1);
        $this->assertDatabaseCount('job_matches', 1);
    }

    public function test_it_only_scores_active_postings(): void
    {
        $this->fakeKeywords();
        $active = $this->posting(['title' => 'Laravel Developer']);
        $inactive = JobPosting::factory()->inactive()->create(['title' => 'Laravel Developer']);

        $this->jobFor($active, limit: 10)->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $this->assertDatabaseHas('job_matches', ['job_posting_id' => $active->id]);
        $this->assertDatabaseMissing('job_matches', ['job_posting_id' => $inactive->id]);
    }

    public function test_it_applies_the_search_location_and_remote_filters(): void
    {
        $this->fakeKeywords();
        $matching = $this->posting([
            'title' => 'Laravel Developer',
            'is_remote' => true,
            'location' => 'Berlin, DE',
        ]);
        $this->posting([
            'title' => 'Laravel Developer',
            'is_remote' => true,
            'location' => 'Paris, FR',
        ]);
        $this->posting([
            'title' => 'Laravel Developer',
            'is_remote' => false,
            'location' => 'Berlin, DE',
        ]);
        $this->posting([
            'title' => 'Product Designer',
            'description' => 'Design systems and user research.',
            'is_remote' => true,
            'location' => 'Berlin, DE',
        ]);

        $this->jobFor($matching, search: 'laravel', remoteOnly: true, location: 'Berlin')
            ->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $this->assertDatabaseCount('job_matches', 1);
        $this->assertDatabaseHas('job_matches', ['job_posting_id' => $matching->id]);
    }

    public function test_it_records_progress_and_completion(): void
    {
        $this->fakeKeywords();
        $matcherKey = 'matcher-key';

        $this->jobFor($this->posting(), matcherKey: $matcherKey)
            ->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $status = app(JobScanStatus::class)->get($matcherKey);

        $this->assertSame(JobScanStatus::Completed, $status['status']);
        $this->assertSame(1, $status['completed']);
        $this->assertSame(0, $status['failed']);
    }

    public function test_it_marks_the_scan_failed_when_every_posting_fails(): void
    {
        Http::fake([
            'api.groq.test/*' => Http::response(['error' => ['message' => 'Invalid key']], 401),
        ]);

        $this->posting();
        $matcherKey = 'failed-key';

        $this->jobFor($this->posting(), matcherKey: $matcherKey)
            ->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $this->assertDatabaseCount('job_matches', 0);
        $this->assertSame(JobScanStatus::Failed, app(JobScanStatus::class)->get($matcherKey)['status']);
    }

    protected function fakeKeywords(): void
    {
        Http::fake([
            'api.groq.test/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'job_title' => 'Laravel Developer',
                            'keywords' => [
                                ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                                ['term' => 'Docker', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
                                ['term' => 'Kubernetes', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
                            ],
                        ]),
                    ],
                ]],
            ]),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function posting(array $attributes = []): JobPosting
    {
        return JobPosting::factory()->create([
            'title' => 'Laravel Developer',
            'description' => 'We need Laravel and Docker experience.',
            'is_remote' => true,
            ...$attributes,
        ]);
    }

    protected function jobFor(
        JobPosting $posting,
        string $matcherKey = 'matcher-key',
        string $search = '',
        bool $remoteOnly = false,
        int $limit = 25,
        string $location = '',
    ): ComputeJobMatches {
        return new ComputeJobMatches(
            matcherKey: $matcherKey,
            userId: null,
            sessionId: 'session-id',
            cvText: self::CV_TEXT,
            resumeHash: hash('sha256', self::CV_TEXT),
            search: $search,
            remoteOnly: $remoteOnly,
            limit: $limit,
            location: $location,
        );
    }
}
