<?php

namespace Tests\Feature;

use App\Jobs\ComputeJobMatches;
use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Services\GroqService;
use App\Services\JobMatcher;
use App\Services\JobScanStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobScanLoadTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_jobs_page_never_calls_a_provider(): void
    {
        JobPosting::factory()->count(3)->create();

        Http::fake();

        $this->get('/jobs')->assertOk();

        Http::assertNothingSent();
    }

    public function test_it_scores_one_hundred_postings_in_one_queued_run(): void
    {
        $this->mock(GroqService::class, function ($mock): void {
            $mock->shouldReceive('extractJobKeywords')->andReturn([
                'job_title' => 'Laravel Developer',
                'keywords' => [
                    ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                    ['term' => 'Docker', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'preferred'],
                ],
            ]);
        });

        JobPosting::factory()->count(100)->create([
            'description' => 'Build Laravel APIs with Docker and MySQL.',
        ]);

        $matcherKey = 'load-test-key';

        (new ComputeJobMatches(
            matcherKey: $matcherKey,
            userId: null,
            sessionId: 'load-session',
            cvText: 'Laravel developer with Docker and MySQL experience.',
            resumeHash: hash('sha256', 'Laravel developer with Docker and MySQL experience.'),
            limit: 100,
        ))->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $this->assertSame(100, JobMatch::count());
        $this->assertSame(JobScanStatus::Completed, app(JobScanStatus::class)->get($matcherKey)['status']);
    }
}
