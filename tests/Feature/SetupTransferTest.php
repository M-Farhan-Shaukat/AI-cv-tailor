<?php

namespace Tests\Feature;

use App\Models\GroqApiKey;
use App\Models\Post;
use App\Models\Setting;
use App\Models\User;
use App\Services\GroqKeyPool;
use App\Services\JobFeedSync;
use App\Services\SiteSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SetupTransferTest extends TestCase
{
    use RefreshDatabase;

    protected string $path;

    protected function setUp(): void
    {
        parent::setUp();

        $this->path = sys_get_temp_dir().'/site-setup-'.uniqid().'.json';
        config(['services.groq.key' => 'gsk_env_key_one_aaaa', 'services.groq.keys' => [], 'job_scan.admin_emails' => []]);
    }

    protected function tearDown(): void
    {
        @unlink($this->path);

        parent::tearDown();
    }

    public function test_the_setup_moves_to_a_fresh_installation_without_ordinary_users(): void
    {
        User::factory()->superAdmin()->create(['name' => 'Owner', 'email' => 'owner@example.com', 'password' => 'owner-password']);
        User::factory()->create(['email' => 'customer@example.com']);
        GroqApiKey::factory()->create(['name' => 'Panel key']);
        app(SiteSettings::class)->save('mail', ['provider' => 'gmail', 'email' => 'owner@gmail.com', 'password' => 'app-password-1234']);
        app(SiteSettings::class)->save('stripe', ['secret_key' => 'sk_test_secretvalue9999', 'currency' => 'gbp']);
        app(JobFeedSync::class)->saveSettings(['queries' => ['Laravel developer'], 'per_page' => 50, 'auto_sync' => true, 'interval_hours' => 6]);
        Post::factory()->create(['slug' => 'what-is-an-ats', 'title' => 'What is an ATS?']);

        $this->artisan('app:export-setup', ['--path' => $this->path])->assertSuccessful();

        $export = json_decode((string) file_get_contents($this->path), true);
        $this->assertCount(1, $export['super_admins']);
        $this->assertCount(2, $export['groq_keys']);
        $this->assertSame('app-password-1234', $export['site_settings']['mail']['password']);
        $this->assertStringNotContainsString('customer@example.com', (string) file_get_contents($this->path));

        $this->wipeDatabase();
        config(['services.groq.key' => '']);

        $this->artisan('app:import-setup', ['--path' => $this->path])->assertSuccessful();
        Cache::forget(SiteSettings::CACHE_KEY);
        app(SiteSettings::class)->apply();

        $owner = User::query()->sole();
        $this->assertSame('owner@example.com', $owner->email);
        $this->assertTrue($owner->isSuperAdmin());
        $this->assertTrue($owner->hasVerifiedEmail());
        $this->assertTrue(Hash::check('owner-password', $owner->password));

        $this->assertCount(2, app(GroqKeyPool::class)->keys());
        $this->assertContains('gsk_env_key_one_aaaa', app(GroqKeyPool::class)->keys());
        $this->assertSame('smtp.gmail.com', config('mail.mailers.smtp.host'));
        $this->assertSame('app-password-1234', config('mail.mailers.smtp.password'));
        $this->assertSame('sk_test_secretvalue9999', config('cashier.secret'));
        $this->assertStringNotContainsString('app-password-1234', (string) DB::table('settings')->where('key', 'site.mail')->value('value'));
        $this->assertSame(['Laravel developer'], app(JobFeedSync::class)->settings()['queries']);
        $this->assertSame('What is an ATS?', Post::query()->where('slug', 'what-is-an-ats')->value('title'));
    }

    public function test_importing_twice_adds_nothing_twice_and_can_reset_passwords(): void
    {
        User::factory()->superAdmin()->create(['email' => 'owner@example.com']);
        $this->artisan('app:export-setup', ['--path' => $this->path])->assertSuccessful();

        $this->artisan('app:import-setup', ['--path' => $this->path])->assertSuccessful();
        $this->artisan('app:import-setup', ['--path' => $this->path, '--reset-password' => true])
            ->expectsOutputToContain('New password for owner@example.com')
            ->assertSuccessful();

        $this->assertSame(1, User::query()->count());
        $this->assertSame(1, count(app(GroqKeyPool::class)->keys()));
    }

    public function test_a_missing_or_foreign_file_is_refused(): void
    {
        $this->artisan('app:import-setup', ['--path' => $this->path])->assertFailed();

        file_put_contents($this->path, json_encode(['hello' => 'world']));
        $this->artisan('app:import-setup', ['--path' => $this->path])->assertFailed();
    }

    protected function wipeDatabase(): void
    {
        foreach (['posts', 'groq_api_keys', 'settings', 'subscriptions', 'users'] as $table) {
            DB::table($table)->delete();
        }

        Cache::flush();
        $this->assertSame(0, Setting::query()->count());
    }
}
