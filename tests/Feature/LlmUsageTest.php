<?php

namespace Tests\Feature;

use App\Jobs\ComputeJobMatches;
use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Models\LlmUsageEvent;
use App\Models\User;
use App\Services\GroqService;
use App\Services\JobMatcher;
use App\Services\JobScanStatus;
use App\Services\LlmBudgetExceededException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class LlmUsageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.groq.key' => 'test-key',
            'services.groq.url' => 'https://api.groq.test/chat',
            'llm.daily_token_limit' => 0,
            'llm.daily_user_token_limit' => 0,
            'llm.daily_request_limit' => 0,
            'llm.daily_user_request_limit' => 0,
        ]);
    }

    public function test_it_records_successful_llm_usage(): void
    {
        Http::fake([
            'api.groq.test/*' => Http::response($this->keywordReply(100, 50)),
        ]);

        app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');

        $this->assertDatabaseHas('llm_usage_events', [
            'user_id' => null,
            'scope' => 'keyword',
            'status' => 'success',
            'status_code' => 200,
            'prompt_tokens' => 100,
            'completion_tokens' => 50,
            'total_tokens' => 150,
        ]);
    }

    public function test_it_records_failed_llm_usage(): void
    {
        Http::fake([
            'api.groq.test/*' => Http::response(['error' => ['message' => 'upstream down']], 500),
        ]);

        try {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
            $this->fail('Expected the Groq request to fail.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('AI request failed (500)', $exception->getMessage());
        }

        $this->assertDatabaseHas('llm_usage_events', [
            'scope' => 'keyword',
            'status' => 'failure',
            'status_code' => 500,
            'total_tokens' => 0,
        ]);
    }

    public function test_it_blocks_requests_over_the_per_user_budget(): void
    {
        $user = User::factory()->create();
        LlmUsageEvent::factory()->create(['user_id' => $user->id, 'total_tokens' => 100]);

        config(['llm.daily_user_token_limit' => 100]);

        Http::fake();

        $this->actingAs($user);

        try {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
            $this->fail('Expected the user budget to block the request.');
        } catch (LlmBudgetExceededException $exception) {
            $this->assertStringContainsString('daily AI usage limit', $exception->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_it_blocks_requests_over_the_global_budget(): void
    {
        LlmUsageEvent::factory()->create([
            'user_id' => User::factory()->create()->id,
            'total_tokens' => 100,
        ]);

        config(['llm.daily_token_limit' => 100]);

        Http::fake();

        try {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
            $this->fail('Expected the global budget to block the request.');
        } catch (LlmBudgetExceededException $exception) {
            $this->assertStringContainsString('daily AI usage limit', $exception->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_a_queued_scan_reports_the_budget_message_instead_of_partial_matches(): void
    {
        $user = User::factory()->create();
        JobPosting::factory()->create(['description' => 'We need Laravel and Docker experience.']);
        LlmUsageEvent::factory()->create(['user_id' => $user->id, 'total_tokens' => 100]);

        config(['llm.daily_user_token_limit' => 100]);

        Http::preventStrayRequests();

        $matcherKey = 'budget-test-key';

        (new ComputeJobMatches(
            matcherKey: $matcherKey,
            userId: $user->id,
            sessionId: null,
            cvText: 'Laravel developer with Docker experience.',
            resumeHash: hash('sha256', 'Laravel developer with Docker experience.'),
            limit: 1,
        ))->handle(app(JobMatcher::class), app(JobScanStatus::class));

        $status = app(JobScanStatus::class)->get($matcherKey);

        $this->assertSame(JobScanStatus::Failed, $status['status']);
        $this->assertStringContainsString('daily AI usage limit', $status['message']);
        $this->assertSame(0, JobMatch::count());
    }

    /**
     * @return array<string, mixed>
     */
    protected function keywordReply(int $promptTokens, int $completionTokens): array
    {
        $content = json_encode([
            'job_title' => 'Laravel Developer',
            'keywords' => [
                ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
            ],
        ]);

        return [
            'choices' => [
                ['message' => ['content' => $content], 'finish_reason' => 'stop'],
            ],
            'usage' => [
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'total_tokens' => $promptTokens + $completionTokens,
            ],
        ];
    }
}
