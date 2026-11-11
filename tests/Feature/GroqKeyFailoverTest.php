<?php

namespace Tests\Feature;

use App\Services\GroqKeyPool;
use App\Services\GroqService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use RuntimeException;
use Tests\TestCase;

class GroqKeyFailoverTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sleep::fake();
        Http::preventStrayRequests();

        config([
            'services.groq.key' => 'key-a',
            'services.groq.keys' => ['key-b', 'key-c'],
            'services.groq.url' => 'https://api.groq.test/chat',
            'llm.daily_request_limit' => 0,
            'llm.daily_user_request_limit' => 0,
        ]);
    }

    public function test_the_pool_merges_the_single_key_with_the_key_list_without_duplicates(): void
    {
        config(['services.groq.keys' => ['key-b', ' key-a ', '', 'key-c']]);

        $this->assertSame(['key-a', 'key-b', 'key-c'], app(GroqKeyPool::class)->keys());
    }

    public function test_several_comma_separated_keys_in_the_single_key_setting_are_split(): void
    {
        config(['services.groq.key' => 'key-a, key-b,key-c', 'services.groq.keys' => []]);

        $this->assertSame(['key-a', 'key-b', 'key-c'], app(GroqKeyPool::class)->keys());
    }

    public function test_a_rate_limited_key_fails_over_to_the_next_key_without_an_error(): void
    {
        $this->fakeKeys(['key-a' => 429, 'key-b' => 429, 'key-c' => 200]);

        $analysis = app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');

        $this->assertSame('Laravel Developer', $analysis['job_title']);
        Http::assertSent(fn (Request $request): bool => $this->keyOf($request) === 'key-c');
        $this->assertDatabaseHas('llm_usage_events', ['status' => 'success']);
        $this->assertDatabaseMissing('llm_usage_events', ['status' => 'failure']);
    }

    public function test_a_paused_key_is_skipped_by_later_requests(): void
    {
        $this->fakeKeys(['key-a' => 429, 'key-b' => 200, 'key-c' => 200]);

        foreach (range(1, 6) as $request) {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
        }

        $this->assertSame(1, $this->requestsWith('key-a'));
    }

    public function test_a_rejected_key_is_paused_and_the_next_key_is_used(): void
    {
        $this->fakeKeys(['key-a' => 401, 'key-b' => 403, 'key-c' => 200]);

        foreach (range(1, 4) as $request) {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
        }

        $this->assertSame(1, $this->requestsWith('key-a'));
        $this->assertSame(1, $this->requestsWith('key-b'));
        $this->assertSame(4, $this->requestsWith('key-c'));
    }

    public function test_requests_rotate_across_healthy_keys(): void
    {
        $this->fakeKeys(['key-a' => 200, 'key-b' => 200, 'key-c' => 200]);

        foreach (range(1, 6) as $request) {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
        }

        $this->assertSame(2, $this->requestsWith('key-a'));
        $this->assertSame(2, $this->requestsWith('key-b'));
        $this->assertSame(2, $this->requestsWith('key-c'));
    }

    public function test_it_waits_once_for_a_key_that_comes_back_within_seconds(): void
    {
        config(['services.groq.keys' => []]);
        Sleep::fake(syncWithCarbon: true);

        Http::fakeSequence('api.groq.test/*')
            ->push(['error' => ['message' => 'Rate limit reached']], 429, ['retry-after' => '3'])
            ->push($this->keywordReply());

        $analysis = app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');

        $this->assertSame('Laravel Developer', $analysis['job_title']);
        Sleep::assertSleptTimes(1);
    }

    public function test_when_every_key_is_limited_the_user_sees_a_busy_message_not_the_limit(): void
    {
        $this->fakeKeys(['key-a' => 429, 'key-b' => 429, 'key-c' => 429], retryAfter: 3600);

        try {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
            $this->fail('Expected the request to fail when every key is limited.');
        } catch (RuntimeException $exception) {
            $this->assertSame(GroqService::BUSY_MESSAGE, $exception->getMessage());
            $this->assertStringNotContainsStringIgnoringCase('limit', $exception->getMessage());
            $this->assertStringNotContainsStringIgnoringCase('key', $exception->getMessage());
        }

        Sleep::assertNeverSlept();
        $this->assertSame(1, $this->requestsWith('key-a'));
        $this->assertSame(1, $this->requestsWith('key-b'));
        $this->assertSame(1, $this->requestsWith('key-c'));
    }

    public function test_a_paused_key_is_unavailable_and_logged_by_label_not_by_value(): void
    {
        $pool = app(GroqKeyPool::class);
        $pool->pause('key-a', 60);

        $this->assertSame(['key-b', 'key-c'], collect($pool->available())->sort()->values()->all());
        $this->assertSame(60, $pool->secondsUntilNextKey());
        $this->assertSame('key #1 (...ey-a)', $pool->label('key-a'));
    }

    /**
     * @param  array<string, int>  $statuses  Response status per key.
     */
    protected function fakeKeys(array $statuses, int $retryAfter = 60): void
    {
        Http::fake(function (Request $request) use ($statuses, $retryAfter) {
            $status = $statuses[$this->keyOf($request)] ?? 500;

            return $status === 200
                ? Http::response($this->keywordReply())
                : Http::response(['error' => ['message' => 'Key unavailable']], $status, ['retry-after' => (string) $retryAfter]);
        });
    }

    protected function keyOf(Request $request): string
    {
        return str_replace('Bearer ', '', $request->header('Authorization')[0] ?? '');
    }

    protected function requestsWith(string $key): int
    {
        return Http::recorded(fn (Request $request): bool => $this->keyOf($request) === $key)->count();
    }

    /**
     * @return array<string, mixed>
     */
    protected function keywordReply(): array
    {
        return [
            'choices' => [[
                'message' => ['content' => json_encode([
                    'job_title' => 'Laravel Developer',
                    'keywords' => [['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required']],
                ])],
                'finish_reason' => 'stop',
            ]],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5, 'total_tokens' => 15],
        ];
    }
}
