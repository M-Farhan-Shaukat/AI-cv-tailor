<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\SiteSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected const SECRET = 'sk_test_51SecretKeyValue000000ab12';

    public function test_only_super_admins_can_open_and_change_settings(): void
    {
        $this->actingAs(User::factory()->admin()->create())->get('/admin/settings')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->put('/admin/settings/billing', ['free_monthly_tailors' => 5])->assertForbidden();

        $this->actingAs(User::factory()->superAdmin()->create())
            ->get('/admin/settings?tab=stripe')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Settings', false)
                ->where('tab', 'stripe')
                ->has('groups.billing.fields.free_monthly_tailors')
                ->has('groups.mail.fields.password')
                ->has('groups.jobs.fields.jooble_key'));
    }

    public function test_stripe_secrets_are_encrypted_applied_and_never_sent_back(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)->put('/admin/settings/stripe', [
            'publishable_key' => 'pk_test_123',
            'secret_key' => self::SECRET,
            'currency' => 'eur',
            'price_monthly' => 'price_monthly123',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame(self::SECRET, config('cashier.secret'));
        $this->assertSame('pk_test_123', config('cashier.key'));
        $this->assertSame('eur', config('cashier.currency'));
        $this->assertSame('price_monthly123', config('billing.prices.monthly.stripe_price'));
        $this->assertStringNotContainsString(self::SECRET, (string) DB::table('settings')->where('key', 'site.stripe')->value('value'));

        $this->actingAs($superAdmin)
            ->get('/admin/settings?tab=stripe')
            ->assertDontSee(self::SECRET)
            ->assertInertia(fn (Assert $page) => $page
                ->where('groups.stripe.fields.secret_key.value', '')
                ->where('groups.stripe.fields.secret_key.is_set', true)
                ->where('groups.stripe.fields.secret_key.hint', '…ab12'));
    }

    public function test_an_empty_secret_keeps_the_saved_one_and_clear_removes_it(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        config(['cashier.secret' => null]);

        $this->actingAs($superAdmin)->put('/admin/settings/stripe', ['secret_key' => self::SECRET]);
        $this->actingAs($superAdmin)->put('/admin/settings/stripe', ['secret_key' => '', 'currency' => 'gbp']);
        $this->assertSame(self::SECRET, $this->freshlyApplied('cashier.secret'));
        $this->assertSame('gbp', $this->freshlyApplied('cashier.currency'));

        $this->actingAs($superAdmin)->put('/admin/settings/stripe', ['clear' => ['secret_key']]);
        $this->assertArrayNotHasKey('secret_key', (array) Setting::get('site.stripe'));
    }

    public function test_settings_are_validated(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->put('/admin/settings/stripe', ['publishable_key' => 'sk_live_wrong', 'webhook_secret' => 'nope', 'price_yearly' => 'prod_123'])
            ->assertSessionHasErrors(['publishable_key', 'webhook_secret', 'price_yearly']);

        $this->actingAs($superAdmin)
            ->put('/admin/settings/mail', ['mailer' => 'sendmail', 'port' => 'abc', 'from_address' => 'not-an-email'])
            ->assertSessionHasErrors(['mailer', 'port', 'from_address']);

        $this->actingAs($superAdmin)->put('/admin/settings/unknown', [])->assertNotFound();
    }

    public function test_mail_billing_and_job_provider_settings_take_effect(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)->put('/admin/settings/mail', [
            'mailer' => 'smtp', 'host' => 'smtp.example.com', 'port' => 465, 'scheme' => 'smtps',
            'username' => 'mailer@example.com', 'password' => 'app-password', 'from_address' => 'hello@resumetailor.test', 'from_name' => 'ResumeTailor AI',
        ])->assertSessionHasNoErrors();

        $this->actingAs($superAdmin)->put('/admin/settings/billing', ['free_monthly_tailors' => 3, 'guest_limit_by_ip' => false, 'pro_monthly_amount' => 'Rs 2,799'])->assertSessionHasNoErrors();
        $this->actingAs($superAdmin)->put('/admin/settings/jobs', ['jooble_key' => 'jooble-secret', 'adzuna_country' => 'in'])->assertSessionHasNoErrors();

        $this->assertSame('smtp', $this->freshlyApplied('mail.default'));
        $this->assertSame(465, $this->freshlyApplied('mail.mailers.smtp.port'));
        $this->assertSame('smtps', $this->freshlyApplied('mail.mailers.smtp.scheme'));
        $this->assertSame('app-password', $this->freshlyApplied('mail.mailers.smtp.password'));
        $this->assertSame('hello@resumetailor.test', $this->freshlyApplied('mail.from.address'));
        $this->assertSame(3, $this->freshlyApplied('billing.free_monthly_tailors'));
        $this->assertFalse($this->freshlyApplied('billing.guest_limit_by_ip'));
        $this->assertSame('Rs 2,799', $this->freshlyApplied('billing.prices.monthly.amount'));
        $this->assertSame('jooble-secret', $this->freshlyApplied('services.jooble.key'));
        $this->assertSame('in', $this->freshlyApplied('services.adzuna.country'));

        $this->get('/pricing')->assertInertia(fn (Assert $page) => $page->where('limits.free_monthly_tailors', 3)->where('prices.0.amount', 'Rs 2,799'));
    }

    public function test_a_preset_provider_needs_only_an_email_and_a_key(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)->put('/admin/settings/mail', [
            'provider' => 'gmail',
            'email' => 'team@gmail.com',
            'password' => 'abcd efgh ijkl mnop',
        ])->assertSessionHasNoErrors();

        $this->assertSame('smtp', $this->freshlyApplied('mail.default'));
        $this->assertSame('smtp.gmail.com', $this->freshlyApplied('mail.mailers.smtp.host'));
        $this->assertSame(587, $this->freshlyApplied('mail.mailers.smtp.port'));
        $this->assertNull($this->freshlyApplied('mail.mailers.smtp.scheme'));
        $this->assertSame('team@gmail.com', $this->freshlyApplied('mail.mailers.smtp.username'));
        $this->assertSame('team@gmail.com', $this->freshlyApplied('mail.from.address'));
        $this->assertSame('abcd efgh ijkl mnop', $this->freshlyApplied('mail.mailers.smtp.password'));
        $this->assertStringNotContainsString('abcd efgh', (string) DB::table('settings')->where('key', 'site.mail')->value('value'));

        $this->actingAs($superAdmin)->put('/admin/settings/mail', ['provider' => 'sendgrid', 'email' => 'hello@resumetailor.test']);
        $this->assertSame('apikey', $this->freshlyApplied('mail.mailers.smtp.username'));
        $this->assertSame('smtp.sendgrid.net', $this->freshlyApplied('mail.mailers.smtp.host'));
        $this->assertSame('abcd efgh ijkl mnop', $this->freshlyApplied('mail.mailers.smtp.password'));

        $this->actingAs($superAdmin)->put('/admin/settings/mail', ['provider' => 'resend', 'email' => 'hello@resumetailor.test']);
        $this->assertSame(465, $this->freshlyApplied('mail.mailers.smtp.port'));
        $this->assertSame('smtps', $this->freshlyApplied('mail.mailers.smtp.scheme'));

        $this->actingAs($superAdmin)->put('/admin/settings/mail', ['provider' => 'log']);
        $this->assertSame('log', $this->freshlyApplied('mail.default'));
    }

    public function test_a_preset_provider_requires_the_email_address(): void
    {
        $this->actingAs(User::factory()->superAdmin()->create())
            ->put('/admin/settings/mail', ['provider' => 'gmail', 'email' => '', 'password' => 'secret-key'])
            ->assertSessionHasErrors('email');
    }

    public function test_the_ai_model_settings_show_their_defaults_locked_and_can_be_changed(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        config(['services.groq.model' => null, 'services.groq.url' => null, 'services.groq.reasoning_effort' => null]);

        $this->actingAs($superAdmin)
            ->get('/admin/settings?tab=ai')
            ->assertInertia(fn (Assert $page) => $page
                ->where('groups.ai.fields.model.value', 'openai/gpt-oss-120b')
                ->where('groups.ai.fields.model.default', 'openai/gpt-oss-120b')
                ->where('groups.ai.fields.model.locked', true)
                ->where('groups.ai.fields.api_url.value', 'https://api.groq.com/openai/v1/chat/completions')
                ->where('groups.ai.fields.reasoning_effort.value', 'medium'));

        config(['services.groq.model' => 'from-env-model']);
        $this->actingAs($superAdmin)->put('/admin/settings/ai', [
            'model' => 'llama-3.3-70b-versatile',
            'api_url' => 'https://api.groq.com/openai/v1/chat/completions',
            'reasoning_effort' => 'low',
        ])->assertSessionHasNoErrors();

        $this->assertSame('llama-3.3-70b-versatile', $this->freshlyApplied('services.groq.model'));
        $this->assertSame('low', $this->freshlyApplied('services.groq.reasoning_effort'));

        $this->actingAs($superAdmin)
            ->put('/admin/settings/ai', ['model' => 'bad model name!', 'api_url' => 'http://example.com/chat', 'reasoning_effort' => 'max'])
            ->assertSessionHasErrors(['model', 'api_url', 'reasoning_effort']);
    }

    public function test_the_test_email_uses_the_saved_settings(): void
    {
        config(['mail.default' => 'log']);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->post('/admin/settings/mail/test')
            ->assertRedirect()
            ->assertSessionHas('status', 'Test email written to the log. Switch "Send email with" to SMTP to deliver real emails.');
    }

    public function test_the_stripe_test_asks_for_a_secret_key_first(): void
    {
        config(['cashier.secret' => null]);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->post('/admin/settings/stripe/test')
            ->assertSessionHasErrors(['stripe_test' => 'Add the Stripe secret key first.']);
    }

    /**
     * Read a config value the way a new request would: reset it, clear the cache and apply the saved settings.
     */
    protected function freshlyApplied(string $key): mixed
    {
        config([$key => null]);
        Cache::forget(SiteSettings::CACHE_KEY);
        app(SiteSettings::class)->apply();

        return config($key);
    }
}
