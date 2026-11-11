<?php

namespace Tests\Feature;

use App\Models\TailoredResume;
use App\Models\User;
use App\Services\UsageQuota;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;
use ZipArchive;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    protected const CV_TEXT = 'Jane Doe. jane@example.com. Experience: Developer at Acme since 2022. Built web services in Laravel for three internal products used daily by staff.';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.groq.key' => 'test-key',
            'services.groq.url' => 'https://api.groq.test/chat',
            'billing.free_monthly_tailors' => 1,
            'billing.pro_monthly_tailors' => 0,
            'billing.guest_limit_by_ip' => true,
            'billing.free_templates' => ['original', 'modern', 'classic', 'minimal'],
            'billing.prices.monthly.stripe_price' => null,
            'billing.prices.yearly.stripe_price' => null,
        ]);
    }

    public function test_a_guest_gets_one_free_tailored_cv_a_month_and_then_an_upgrade_offer(): void
    {
        $this->fakeGroq();

        $this->postJson('/tailor', $this->payload())->assertOk();

        $this->postJson('/tailor', $this->payload())
            ->assertStatus(402)
            ->assertJsonPath('reason', 'quota')
            ->assertJsonPath('upgrade_url', route('pricing'));

        Http::assertSentCount(2);
        $this->assertSame('127.0.0.1', TailoredResume::firstOrFail()->client_ip);
    }

    public function test_the_free_quota_resets_next_month(): void
    {
        $this->fakeGroq();
        TailoredResume::create(['client_ip' => '127.0.0.1', 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $this->postJson('/tailor', $this->payload())->assertStatus(402);

        $this->travelTo(now()->startOfMonth()->addMonth()->addHour());

        $this->postJson('/tailor', $this->payload())->assertOk();
    }

    public function test_guests_sharing_an_ip_share_the_quota_unless_ip_limiting_is_off(): void
    {
        $this->fakeGroq();
        TailoredResume::create(['session_id' => 'another-browser', 'client_ip' => '127.0.0.1', 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $this->postJson('/tailor', $this->payload())->assertStatus(402);

        config(['billing.guest_limit_by_ip' => false]);

        $this->postJson('/tailor', $this->payload())->assertOk();
    }

    public function test_a_guest_is_counted_by_browser_session(): void
    {
        config(['billing.guest_limit_by_ip' => false]);
        TailoredResume::create(['session_id' => str_repeat('a', 40), 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $quota = app(UsageQuota::class);

        $this->assertSame(0, $quota->remaining($this->guestRequest(str_repeat('a', 40))));
        $this->assertSame(1, $quota->remaining($this->guestRequest(str_repeat('b', 40))));
    }

    public function test_a_signed_in_free_user_is_counted_by_account(): void
    {
        $this->fakeGroq();
        $user = User::factory()->create();
        TailoredResume::create(['user_id' => $user->id, 'session_id' => 'old-session', 'client_ip' => '10.0.0.9', 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $this->actingAs($user)->postJson('/tailor', $this->payload())
            ->assertStatus(402)
            ->assertJsonPath('reason', 'quota');

        $this->actingAs(User::factory()->create())->postJson('/tailor', $this->payload())->assertOk();
    }

    public function test_free_users_cannot_tailor_or_restyle_in_a_premium_design(): void
    {
        Http::fake();

        $this->postJson('/tailor', [...$this->payload(), 'template' => 'tech'])
            ->assertStatus(402)
            ->assertJsonPath('reason', 'template')
            ->assertJsonPath('message', 'The Tech design is part of Pro. Choose a free design or upgrade to use it.');

        $tailored = TailoredResume::create([
            'access_token' => 'secret-token',
            'job_description' => 'JD',
            'extracted_cv_text' => self::CV_TEXT,
            'tailored_cv_json' => ['name' => 'Jane Doe', 'experience' => []],
        ]);

        $this->postJson(route('resume.template', ['tailoredResume' => $tailored, 'token' => 'secret-token']), ['template' => 'royal'])
            ->assertStatus(402)
            ->assertJsonPath('reason', 'template');

        Http::assertNothingSent();
        $this->assertSame('original', $tailored->fresh()->template->value);
    }

    public function test_pro_users_tailor_beyond_the_free_quota_in_any_design(): void
    {
        $this->fakeGroq();
        $user = User::factory()->pro()->create();
        TailoredResume::create(['user_id' => $user->id, 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $this->actingAs($user)->postJson('/tailor', [...$this->payload(), 'template' => 'tech'])
            ->assertOk()
            ->assertJsonPath('template', 'tech');
    }

    public function test_pro_users_hit_the_fair_use_cap_without_an_upgrade_offer(): void
    {
        config(['billing.pro_monthly_tailors' => 1]);
        $user = User::factory()->pro()->create();
        TailoredResume::create(['user_id' => $user->id, 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $response = $this->actingAs($user)->postJson('/tailor', $this->payload())
            ->assertStatus(402)
            ->assertJsonPath('upgrade_url', null);

        $this->assertStringContainsString('fair-use limit of 1', $response->json('message'));
    }

    public function test_a_cancelled_subscription_falls_back_to_free(): void
    {
        $user = User::factory()->pro()->create();
        $user->subscriptions()->update(['stripe_status' => 'canceled', 'ends_at' => now()->subDay()]);

        $this->assertFalse(app(UsageQuota::class)->isPro($user->fresh()));
    }

    public function test_scanning_stays_free_after_the_quota_is_used(): void
    {
        Http::fakeSequence('api.groq.test/*')->push($this->groqReply($this->keywords()));
        TailoredResume::create(['client_ip' => '127.0.0.1', 'job_description' => 'JD', 'extracted_cv_text' => self::CV_TEXT]);

        $this->postJson('/scan', $this->payload())->assertOk();
    }

    public function test_free_users_get_only_the_top_missing_keywords_and_the_rest_never_leave_the_server(): void
    {
        Http::fakeSequence('api.groq.test/*')->push($this->groqReply($this->manyKeywords()));

        $response = $this->postJson('/scan', $this->payload())->assertOk();

        $this->assertSame(['Kubernetes', 'Terraform', 'GraphQL'], array_column($response->json('score.missing'), 'term'));
        $response->assertJsonPath('score.missing_total', 5)->assertJsonPath('score.missing_hidden', 2);
        $this->assertSame(
            'Add these required keywords if you have the experience: Kubernetes, Terraform, GraphQL and 2 more.',
            $response->json('score.breakdown.keywords.tip'),
        );

        foreach (['Redis', 'Kafka'] as $hidden) {
            $this->assertStringNotContainsString($hidden, $response->getContent());
        }
    }

    public function test_pro_users_see_every_missing_keyword(): void
    {
        Http::fakeSequence('api.groq.test/*')->push($this->groqReply($this->manyKeywords()));

        $this->actingAs(User::factory()->pro()->create())
            ->postJson('/scan', $this->payload())
            ->assertOk()
            ->assertJsonCount(5, 'score.missing')
            ->assertJsonPath('score.missing_hidden', 0)
            ->assertSee('Redis')
            ->assertSee('Kafka');
    }

    public function test_the_result_page_never_sends_hidden_missing_keywords_to_free_users(): void
    {
        $missing = collect(['Kubernetes', 'Terraform', 'GraphQL', 'Redis', 'Kafka'])
            ->map(fn (string $term, int $index): array => ['term' => $term, 'category' => 'tool', 'importance' => $index < 3 ? 'required' : 'preferred'])
            ->all();
        $score = ['score' => 40, 'matched' => [], 'missing' => $missing, 'breakdown' => ['keywords' => ['score' => 20, 'tip' => 'Add Kubernetes, Terraform, GraphQL, Redis, Kafka']]];

        $tailored = TailoredResume::create([
            'access_token' => 'secret-token',
            'job_description' => 'JD',
            'extracted_cv_text' => self::CV_TEXT,
            'tailored_cv_html' => '<html><body><h1>Jane Doe</h1></body></html>',
            'tailored_cv_json' => ['name' => 'Jane Doe', 'changes' => []],
            'score_report' => ['job_title' => 'Laravel Developer', 'original' => $score, 'tailored' => $score, 'added_keywords' => []],
        ]);

        $this->get(route('resume.show', ['tailoredResume' => $tailored, 'token' => 'secret-token']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('result.tailored_score.missing', 3)
                ->where('result.tailored_score.missing_hidden', 2)
                ->has('result.original_score.missing', 3))
            ->assertDontSee('Redis')
            ->assertDontSee('Kafka');
    }

    public function test_the_pricing_page_shows_the_plans_and_the_visitors_quota(): void
    {
        config(['billing.prices.monthly.stripe_price' => 'price_monthly']);

        $this->get('/pricing')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Pricing', false)
                ->has('prices', 2)
                ->where('prices.0.interval', 'monthly')
                ->where('prices.0.available', true)
                ->where('prices.1.available', false)
                ->where('billing.plan', 'free')
                ->where('billing.remaining', 1)
                ->where('subscription', null));

        $this->actingAs(User::factory()->pro()->create())
            ->get('/pricing')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('billing.plan', 'pro')
                ->where('billing.remaining', null)
                ->where('subscription.active', true));
    }

    public function test_an_active_subscriber_must_cancel_before_deleting_the_account(): void
    {
        $user = User::factory()->pro()->create();

        $this->actingAs($user)
            ->from('/profile')
            ->delete('/profile', ['password' => 'password'])
            ->assertRedirect('/profile')
            ->assertSessionHasErrors('password');

        $this->assertModelExists($user);

        $user->subscriptions()->update(['ends_at' => now()->addWeek()]);

        $this->actingAs($user->fresh())
            ->delete('/profile', ['password' => 'password'])
            ->assertRedirect('/');

        $this->assertModelMissing($user);
    }

    public function test_the_profile_shows_the_billing_account_and_cancellation_date(): void
    {
        $user = User::factory()->pro()->create();
        $user->subscriptions()->update(['ends_at' => now()->addWeek()]);

        $this->actingAs($user)
            ->get('/profile')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('hasBillingAccount', true)
                ->where('subscriptionEndsAt', now()->addWeek()->toDateString())
                ->where('billing.plan', 'pro'));
    }

    public function test_checkout_needs_an_account_and_a_configured_price(): void
    {
        $this->post('/billing/checkout/monthly')->assertRedirect(route('login'));

        $this->actingAs(User::factory()->create())
            ->post('/billing/checkout/monthly')
            ->assertRedirect(route('pricing'))
            ->assertSessionHasErrors('billing');

        $this->post('/billing/checkout/weekly')->assertNotFound();
    }

    public function test_the_stripe_webhook_endpoint_accepts_events(): void
    {
        $this->postJson('/stripe/webhook', ['type' => 'unhandled.event', 'data' => ['object' => []]])->assertOk();
    }

    protected function guestRequest(string $sessionId): Request
    {
        $session = new Store('test', new ArraySessionHandler(10), $sessionId);
        $request = Request::create('/', 'POST', server: ['REMOTE_ADDR' => '10.1.1.1']);
        $request->setLaravelSession($session);

        return $request;
    }

    protected function fakeGroq(): void
    {
        Http::fake(['api.groq.test/*' => function (\Illuminate\Http\Client\Request $request) {
            $isKeywordRequest = str_contains($request['messages'][0]['content'], 'keyword analyst');

            return Http::response($this->groqReply($isKeywordRequest ? $this->keywords() : [
                'name' => 'Jane Doe',
                'headline' => 'Laravel Developer',
                'contact' => ['email' => 'jane@example.com'],
                'summary' => 'Laravel Developer building web services.',
                'skills' => [['category' => 'Frameworks', 'items' => ['Laravel']]],
                'experience' => [['title' => 'Developer', 'company' => 'Acme', 'start_date' => 'Jan 2022', 'end_date' => 'Present', 'bullets' => ['Built web services in Laravel.']]],
                'keyword_coverage' => [],
                'changes' => ['Tightened the summary.'],
            ]));
        }]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function keywords(): array
    {
        return [
            'job_title' => 'Laravel Developer',
            'keywords' => [['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required']],
        ];
    }

    /**
     * One keyword the CV has (Laravel), three required and two preferred ones it is missing.
     *
     * @return array<string, mixed>
     */
    protected function manyKeywords(): array
    {
        return [
            'job_title' => 'Laravel Developer',
            'keywords' => [
                ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'Redis', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
                ['term' => 'Kubernetes', 'aliases' => [], 'category' => 'tool', 'importance' => 'required'],
                ['term' => 'Kafka', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
                ['term' => 'Terraform', 'aliases' => [], 'category' => 'tool', 'importance' => 'required'],
                ['term' => 'GraphQL', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    protected function groqReply(array $content): array
    {
        return ['choices' => [['message' => ['content' => json_encode($content)]]]];
    }

    /**
     * @return array<string, mixed>
     */
    protected function payload(): array
    {
        return [
            'cv_file' => $this->docx(self::CV_TEXT),
            'job_description' => str_repeat('We need a Laravel developer who builds web services for our products. ', 2),
        ];
    }

    protected function docx(string $text): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'cv').'.docx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE);
        $zip->addFromString('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>'.$text.'</w:t></w:r></w:p></w:body></w:document>');
        $zip->close();

        return new UploadedFile($path, 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
    }
}
