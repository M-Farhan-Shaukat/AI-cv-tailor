<?php

namespace Tests\Feature;

use App\Services\GroqKeyPool;
use App\Services\GroqService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\TestCase;

class GroqSharedLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        config([
            'services.groq.key' => 'key-a',
            'services.groq.keys' => ['key-b', 'key-c'],
            'services.groq.url' => 'https://api.groq.test/chat',
            'llm.daily_request_limit' => 0,
            'llm.daily_user_request_limit' => 0,
        ]);
    }

    public function test_a_rate_limit_pauses_every_key_known_to_share_the_groq_account(): void
    {
        Sleep::fake();
        $pool = app(GroqKeyPool::class);
        $pool->rememberOrganization('key-a', 'org_shared');
        $pool->rememberOrganization('key-b', 'org_shared');

        Http::fake(fn (Request $request) => $this->keyOf($request) === 'key-c'
            ? Http::response($this->keywordReply())
            : Http::response(['error' => ['message' => 'Rate limit reached for model in organization `org_shared` on tokens per minute (TPM)']], 429, ['retry-after' => '30']));

        foreach (range(1, 3) as $attempt) {
            app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');
        }

        // key-a or key-b is tried at most once; the other is skipped because they share an account.
        $this->assertSame(1, Http::recorded(fn (Request $request) => in_array($this->keyOf($request), ['key-a', 'key-b'], true))->count());
        $this->assertTrue($pool->isPaused('key-a'));
        $this->assertTrue($pool->isPaused('key-b'));
        $this->assertFalse($pool->isPaused('key-c'));
    }

    public function test_the_account_of_a_key_is_learned_from_the_rate_limit_error(): void
    {
        Sleep::fake(syncWithCarbon: true);
        config(['services.groq.keys' => []]);

        Http::fakeSequence('api.groq.test/*')
            ->push(['error' => ['message' => 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01abc` service tier `on_demand` on tokens per minute (TPM)']], 429, ['retry-after' => '30'])
            ->push($this->keywordReply());

        app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');

        $this->assertSame('org_01abc', app(GroqKeyPool::class)->organizationOf('key-a'));
        Sleep::assertSleptTimes(1);
    }

    public function test_a_tailoring_request_waits_out_a_thirty_second_limit_instead_of_failing(): void
    {
        Sleep::fake(syncWithCarbon: true);

        Http::fake(function (Request $request) {
            static $calls = 0;
            $calls++;

            return $calls <= 3
                ? Http::response(['error' => ['message' => 'Rate limit reached in organization `org_one`']], 429, ['retry-after' => '35'])
                : Http::response($this->keywordReply());
        });

        $analysis = app(GroqService::class)->extractJobKeywords('We need a Laravel developer.');

        $this->assertSame('Laravel Developer', $analysis['job_title']);
        Sleep::assertSleptTimes(1);
    }

    protected function keyOf(Request $request): string
    {
        return str_replace('Bearer ', '', $request->header('Authorization')[0] ?? '');
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
