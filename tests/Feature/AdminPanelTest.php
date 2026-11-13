<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\GroqApiKey;
use App\Models\TailoredResume;
use App\Models\User;
use App\Models\UserResume;
use App\Services\GroqKeyPool;
use App\Services\UsageQuota;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['job_scan.admin_emails' => ['owner@example.com']]);
    }

    public function test_only_admins_can_open_the_admin_panel(): void
    {
        $this->get('/admin')->assertRedirect(route('login'));
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();

        $this->actingAs(User::factory()->admin()->create())
            ->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Dashboard', false)->has('stats')->has('trend', 14));
    }

    public function test_configured_emails_are_always_super_admins(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.com']);

        $this->assertTrue($owner->isSuperAdmin());
        $this->assertTrue($owner->isAdmin());
        $this->assertFalse(User::factory()->admin()->create()->isSuperAdmin());
    }

    public function test_the_admin_seeder_creates_a_super_admin_and_never_resets_an_existing_password(): void
    {
        $this->seed(AdminUserSeeder::class);

        $admin = User::query()->where('email', AdminUserSeeder::EMAIL)->firstOrFail();
        $this->assertSame(UserRole::SuperAdmin, $admin->role);
        $this->assertTrue($admin->hasVerifiedEmail());

        $admin->forceFill(['password' => 'my-own-password', 'role' => UserRole::User])->save();
        $this->seed(AdminUserSeeder::class);

        $admin->refresh();
        $this->assertSame(UserRole::SuperAdmin, $admin->role);
        $this->assertTrue(Hash::check('my-own-password', $admin->password));
        $this->assertSame(1, User::query()->where('email', AdminUserSeeder::EMAIL)->count());
    }

    public function test_admins_can_search_and_filter_users(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['name' => 'Ayesha Khan', 'email' => 'ayesha@example.com']);
        User::factory()->suspended()->create(['name' => 'Bilal Ahmed']);
        User::factory()->pro()->create(['name' => 'Pro Person']);

        $this->actingAs($admin)
            ->get('/admin/users?search=ayesha')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Users/Index', false)->has('users.data', 1)->where('users.data.0.email', 'ayesha@example.com'));

        $this->actingAs($admin)
            ->get('/admin/users?status=suspended')
            ->assertInertia(fn (Assert $page) => $page->has('users.data', 1)->where('users.data.0.name', 'Bilal Ahmed'));

        $this->actingAs($admin)
            ->get('/admin/users?plan=pro&role=user')
            ->assertInertia(fn (Assert $page) => $page->has('users.data', 1)->where('users.data.0.name', 'Pro Person')->where('users.data.0.plan', 'pro'));
    }

    public function test_an_admin_sees_a_users_resumes_and_usage(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        UserResume::factory()->for($user)->create(['original_filename' => 'jane-cv.pdf']);
        TailoredResume::create(['user_id' => $user->id, 'job_description' => 'JD', 'extracted_cv_text' => 'CV', 'score_report' => ['job_title' => 'Laravel Developer'], 'match_score' => 80, 'original_score' => 40]);

        $this->actingAs($admin)
            ->get("/admin/users/{$user->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users/Show', false)
                ->where('uploadedResumes.0.original_filename', 'jane-cv.pdf')
                ->where('tailoredResumes.0.job_title', 'Laravel Developer')
                ->where('billing.used', 1)
                ->where('permissions.manage', true)
                ->where('permissions.manage_roles', false));
    }

    public function test_admins_edit_users_but_only_super_admins_change_roles(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['email_verified_at' => null]);
        $payload = ['name' => 'New Name', 'email' => 'new@example.com', 'role' => 'user', 'email_verified' => true];

        $this->actingAs($admin)->patch("/admin/users/{$user->id}", $payload)->assertRedirect();
        $user->refresh();
        $this->assertSame('New Name', $user->name);
        $this->assertSame('new@example.com', $user->email);
        $this->assertTrue($user->hasVerifiedEmail());

        $this->actingAs($admin)->patch("/admin/users/{$user->id}", [...$payload, 'role' => 'admin'])->assertForbidden();
        $this->assertSame(UserRole::User, $user->fresh()->role);

        $this->actingAs(User::factory()->superAdmin()->create())
            ->patch("/admin/users/{$user->id}", [...$payload, 'role' => 'admin'])
            ->assertRedirect();
        $this->assertSame(UserRole::Admin, $user->fresh()->role);
    }

    public function test_admins_cannot_manage_other_admins_and_nobody_manages_configured_super_admins(): void
    {
        $admin = User::factory()->admin()->create();
        $otherAdmin = User::factory()->admin()->create();
        $owner = User::factory()->create(['email' => 'owner@example.com']);
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)->post("/admin/users/{$otherAdmin->id}/suspend")->assertForbidden();
        $this->actingAs($superAdmin)->post("/admin/users/{$owner->id}/suspend")->assertForbidden();
        $this->actingAs($superAdmin)->delete("/admin/users/{$owner->id}")->assertForbidden();

        $this->actingAs($superAdmin)->post("/admin/users/{$otherAdmin->id}/suspend")->assertRedirect();
        $this->assertTrue($otherAdmin->fresh()->isSuspended());
    }

    public function test_nobody_can_suspend_delete_or_demote_themselves(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)->post("/admin/users/{$superAdmin->id}/suspend")->assertSessionHasErrors('user');
        $this->actingAs($superAdmin)->delete("/admin/users/{$superAdmin->id}")->assertSessionHasErrors('user');
        $this->actingAs($superAdmin)
            ->patch("/admin/users/{$superAdmin->id}", ['name' => 'Me', 'email' => $superAdmin->email, 'role' => 'user', 'email_verified' => true])
            ->assertSessionHasErrors('user');

        $this->assertFalse($superAdmin->fresh()->isSuspended());
        $this->assertSame(UserRole::SuperAdmin, $superAdmin->fresh()->role);
    }

    public function test_a_suspended_user_cannot_sign_in_and_is_signed_out_of_open_sessions(): void
    {
        $user = User::factory()->suspended()->create();

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->actingAs($user)->get('/profile')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_unsuspending_restores_access(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->suspended()->create();

        $this->actingAs($admin)->delete("/admin/users/{$user->id}/suspend")->assertRedirect();

        $this->assertFalse($user->fresh()->isSuspended());
    }

    public function test_a_pro_trial_lasts_the_chosen_days_with_the_chosen_cv_limit_and_can_be_removed(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $quota = app(UsageQuota::class);

        $this->actingAs($admin)->post("/admin/users/{$user->id}/pro", ['days' => 10, 'tailor_limit' => 5])->assertRedirect();

        $user->refresh();
        $this->assertTrue($quota->isPro($user));
        $this->assertTrue($user->pro_until->between(now()->addDays(10)->subMinute(), now()->addDays(10)->addMinute()));
        $this->assertSame(5, $user->pro_tailor_limit);
        $this->assertSame(5, $quota->summaryForUser($user)['limit']);
        $this->assertSame(UsageQuota::SOURCE_GIFT, $quota->summaryForUser($user)['source']);

        $this->travel(11)->days();
        $this->assertFalse($quota->isPro($user->fresh()));
        $this->travelBack();

        $this->actingAs($admin)->post("/admin/users/{$user->id}/pro", ['days' => 400])->assertSessionHasErrors('days');
        $this->actingAs($admin)->post("/admin/users/{$user->id}/pro", ['days' => 5, 'tailor_limit' => -1])->assertSessionHasErrors('tailor_limit');

        $this->actingAs($admin)->post("/admin/users/{$user->id}/pro", ['days' => 0])->assertRedirect();
        $this->assertFalse($quota->isPro($user->fresh()));
        $this->assertNull($user->fresh()->pro_tailor_limit);
    }

    public function test_a_pro_trial_without_a_cv_limit_uses_the_normal_pro_limit(): void
    {
        config(['billing.pro_monthly_tailors' => 200]);
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $this->actingAs($admin)->post("/admin/users/{$user->id}/pro", ['days' => 30, 'tailor_limit' => null])->assertRedirect();

        $summary = app(UsageQuota::class)->summaryForUser($user->fresh());
        $this->assertSame(200, $summary['limit']);
        $this->assertFalse($summary['limit_covers_trial']);
    }

    public function test_only_super_admins_start_and_end_a_pro_trial_for_everyone(): void
    {
        $admin = User::factory()->admin()->create();
        $superAdmin = User::factory()->superAdmin()->create();
        $user = User::factory()->create();
        $quota = app(UsageQuota::class);

        $this->actingAs($admin)->post('/admin/pro-trial', ['days' => 7, 'tailor_limit' => 3])->assertForbidden();
        $this->assertFalse($quota->isPro($user));

        $this->actingAs($superAdmin)->post('/admin/pro-trial', ['days' => 0])->assertSessionHasErrors('days');
        $this->actingAs($superAdmin)->post('/admin/pro-trial', ['days' => 7, 'tailor_limit' => 3])->assertRedirect();

        $this->assertTrue($quota->isPro($user));
        $this->assertTrue($quota->isPro(User::factory()->create()));
        $this->assertFalse($quota->isPro(null));
        $this->assertSame(3, $quota->summaryForUser($user)['limit']);

        $this->actingAs($admin)->get('/admin/users?plan=free')
            ->assertInertia(fn (Assert $page) => $page->has('users.data', 0)->where('siteTrial.tailor_limit', 3));

        $this->travel(8)->days();
        $this->assertFalse($quota->isPro($user));
        $this->travelBack();

        $this->actingAs($admin)->delete('/admin/pro-trial')->assertForbidden();
        $this->actingAs($superAdmin)->delete('/admin/pro-trial')->assertRedirect();
        $this->assertFalse($quota->isPro($user));
    }

    public function test_an_accounts_own_trial_or_subscription_wins_over_the_trial_for_everyone(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $subscriber = User::factory()->pro()->create();
        $gifted = User::factory()->create(['pro_started_at' => now(), 'pro_until' => now()->addDays(30), 'pro_tailor_limit' => 50]);
        $quota = app(UsageQuota::class);

        $this->actingAs($superAdmin)->post('/admin/pro-trial', ['days' => 7, 'tailor_limit' => 2])->assertRedirect();

        $this->assertSame(UsageQuota::SOURCE_SUBSCRIPTION, $quota->entitlement($subscriber)['source']);
        $this->assertSame(50, $quota->entitlement($gifted)['limit']);
    }

    public function test_deleting_a_user_with_an_active_subscription_is_blocked(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $subscriber = User::factory()->pro()->create();
        $freeUser = User::factory()->create();

        $this->actingAs($superAdmin)->delete("/admin/users/{$subscriber->id}")->assertSessionHasErrors('user');
        $this->assertModelExists($subscriber);

        $this->actingAs($superAdmin)->delete("/admin/users/{$freeUser->id}")->assertRedirect(route('admin.users.index'));
        $this->assertModelMissing($freeUser);
    }

    public function test_an_admin_can_delete_a_users_uploaded_cv_only_through_its_owner(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = UserResume::factory()->for($other)->create();

        $this->actingAs($admin)->delete("/admin/users/{$user->id}/resumes/{$resume->id}")->assertNotFound();
        $this->actingAs($admin)->delete("/admin/users/{$other->id}/resumes/{$resume->id}")->assertRedirect();

        $this->assertModelMissing($resume);
    }

    public function test_admins_change_the_design_of_many_resumes_at_once_without_ai(): void
    {
        $admin = User::factory()->admin()->create();
        $resumes = collect(range(1, 3))->map(fn (int $index) => TailoredResume::create([
            'job_description' => 'JD',
            'extracted_cv_text' => 'CV',
            'tailored_cv_json' => ['name' => "Person {$index}", 'headline' => 'Developer', 'summary' => 'Builds things.', 'skills' => [], 'experience' => []],
            'tailored_cv_html' => '<html>old</html>',
            'match_score' => 70,
        ]));
        $unfinished = TailoredResume::create(['job_description' => 'JD', 'extracted_cv_text' => 'CV']);

        $this->actingAs($admin)
            ->post('/admin/resumes/bulk', ['ids' => [...$resumes->pluck('id'), $unfinished->id], 'action' => 'template', 'template' => 'tech'])
            ->assertRedirect()
            ->assertSessionHas('status', '3 resumes changed to the Tech design. 1 skipped because they were never finished.');

        foreach ($resumes as $resume) {
            $resume->refresh();
            $this->assertSame('tech', $resume->template->value);
            $this->assertStringContainsString('Person', $resume->tailored_cv_html);
            $this->assertSame(70, $resume->match_score);
        }
    }

    public function test_admins_delete_many_resumes_at_once(): void
    {
        $admin = User::factory()->admin()->create();
        $ids = collect(range(1, 2))->map(fn () => TailoredResume::create(['job_description' => 'JD', 'extracted_cv_text' => 'CV'])->id);
        $kept = TailoredResume::create(['job_description' => 'JD', 'extracted_cv_text' => 'CV']);

        $this->actingAs($admin)->post('/admin/resumes/bulk', ['ids' => $ids->all(), 'action' => 'delete'])->assertRedirect();

        $this->assertSame([$kept->id], TailoredResume::query()->pluck('id')->all());
        $this->actingAs(User::factory()->create())->post('/admin/resumes/bulk', ['ids' => [$kept->id], 'action' => 'delete'])->assertForbidden();
    }

    public function test_the_resume_list_filters_by_user_and_job_title(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        TailoredResume::create(['user_id' => $user->id, 'job_description' => 'JD', 'extracted_cv_text' => 'CV', 'score_report' => ['job_title' => 'Laravel Developer']]);
        TailoredResume::create(['job_description' => 'JD', 'extracted_cv_text' => 'CV', 'score_report' => ['job_title' => 'Data Analyst']]);

        $this->actingAs($admin)
            ->get('/admin/resumes?search=analyst')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Resumes/Index', false)->has('resumes.data', 1)->where('resumes.data.0.job_title', 'Data Analyst'));

        $this->actingAs($admin)
            ->get("/admin/resumes?user={$user->id}")
            ->assertInertia(fn (Assert $page) => $page->has('resumes.data', 1)->where('resumes.data.0.user.id', $user->id));
    }

    public function test_admins_can_open_and_download_any_tailored_resume(): void
    {
        $resume = TailoredResume::create([
            'session_id' => 'someone-else',
            'job_description' => 'JD',
            'extracted_cv_text' => 'CV',
            'tailored_cv_html' => '<html><body>Jane</body></html>',
            'tailored_cv_json' => ['name' => 'Jane', 'changes' => []],
            'score_report' => ['job_title' => 'Developer', 'original' => ['score' => 40], 'tailored' => ['score' => 80], 'added_keywords' => []],
        ]);

        $this->actingAs(User::factory()->create())->get("/tailor/{$resume->id}")->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->get("/tailor/{$resume->id}")->assertOk();
    }

    public function test_a_super_admin_adds_a_checked_key_that_is_stored_encrypted_and_used(): void
    {
        config(['services.groq.key' => '', 'services.groq.keys' => [], 'services.groq.url' => 'https://api.groq.test/openai/v1/chat/completions']);
        Http::fake(['api.groq.test/openai/v1/models' => Http::response(['data' => []])]);
        $key = 'gsk_panel_added_key_abcdefghijklmnop9876';

        $this->actingAs(User::factory()->superAdmin()->create())
            ->post('/admin/ai-keys', ['name' => 'Team account', 'key' => "  {$key} "])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $stored = GroqApiKey::query()->firstOrFail();
        $this->assertSame($key, $stored->key);
        $this->assertSame('9876', $stored->last_four);
        $this->assertStringNotContainsString($key, (string) DB::table('groq_api_keys')->value('key'));
        $this->assertSame([$key], app(GroqKeyPool::class)->keys());
        Http::assertSent(fn ($request) => $request->url() === 'https://api.groq.test/openai/v1/models' && $request->hasHeader('Authorization', "Bearer {$key}"));

        $this->get('/admin/ai-keys')
            ->assertDontSee('gsk_panel_added_key')
            ->assertInertia(fn (Assert $page) => $page->where('keys.0.source', 'panel')->where('keys.0.name', 'Team account')->where('keys.0.label', 'key #1 (...9876)'));
    }

    public function test_keys_that_groq_rejects_or_that_already_exist_are_not_added(): void
    {
        config(['services.groq.key' => 'gsk_env_key_already_here_123456', 'services.groq.keys' => [], 'services.groq.url' => 'https://api.groq.test/openai/v1/chat/completions']);
        Http::fake(['api.groq.test/*' => Http::response(['error' => ['message' => 'Invalid API Key']], 401)]);
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)->post('/admin/ai-keys', ['name' => 'Bad', 'key' => 'gsk_revoked_key_000000000000000'])
            ->assertSessionHasErrors(['key' => 'Groq rejected this key. Check that it was copied completely and is not revoked.']);

        $this->actingAs($superAdmin)->post('/admin/ai-keys', ['name' => 'Dupe', 'key' => 'gsk_env_key_already_here_123456'])
            ->assertSessionHasErrors(['key' => 'This key is already added.']);

        $this->assertDatabaseCount('groq_api_keys', 0);
    }

    public function test_only_super_admins_manage_keys(): void
    {
        $admin = User::factory()->admin()->create();
        $key = GroqApiKey::factory()->create();

        $this->actingAs($admin)->post('/admin/ai-keys', ['name' => 'Mine', 'key' => 'gsk_some_key_000000000000000000'])->assertForbidden();
        $this->actingAs($admin)->patch("/admin/ai-keys/{$key->id}", ['is_active' => false])->assertForbidden();
        $this->actingAs($admin)->delete("/admin/ai-keys/{$key->id}")->assertForbidden();
        $this->actingAs($admin)->get('/admin/ai-keys')->assertOk()->assertInertia(fn (Assert $page) => $page->where('canManage', false));
    }

    public function test_disabling_or_deleting_a_panel_key_takes_it_out_of_rotation(): void
    {
        config(['services.groq.key' => '', 'services.groq.keys' => []]);
        $superAdmin = User::factory()->superAdmin()->create();
        $first = GroqApiKey::factory()->create();
        $second = GroqApiKey::factory()->create();

        $this->actingAs($superAdmin)->patch("/admin/ai-keys/{$first->id}", ['is_active' => false])->assertRedirect();
        $this->assertSame([$second->key], app(GroqKeyPool::class)->keys());

        $this->actingAs($superAdmin)
            ->get('/admin/ai-keys')
            ->assertInertia(fn (Assert $page) => $page->has('keys', 2)->where('keys.1.id', $first->id)->where('keys.1.is_active', false));

        $this->actingAs($superAdmin)->patch("/admin/ai-keys/{$first->id}", ['name' => 'Renamed', 'is_active' => true])->assertRedirect();
        $this->assertSame('Renamed', $first->fresh()->name);
        $this->assertCount(2, app(GroqKeyPool::class)->keys());

        $this->actingAs($superAdmin)->delete("/admin/ai-keys/{$second->id}")->assertRedirect();
        $this->assertSame([$first->key], app(GroqKeyPool::class)->keys());
    }

    public function test_the_ai_keys_page_never_shows_full_keys_and_can_resume_a_paused_key(): void
    {
        $this->freezeTime();
        config(['services.groq.key' => 'gsk_first_secret_key_1111', 'services.groq.keys' => ['gsk_second_secret_key_2222']]);
        app(GroqKeyPool::class)->pause('gsk_second_secret_key_2222', 600);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get('/admin/ai-keys')
            ->assertOk()
            ->assertDontSee('gsk_first_secret_key')
            ->assertDontSee('gsk_second_secret_key')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AiKeys', false)
                ->where('keys.0.label', 'key #1 (...1111)')
                ->where('keys.0.paused_seconds', 0)
                ->where('keys.1.paused_seconds', 600));

        $this->actingAs($admin)->delete('/admin/ai-keys/2/pause')->assertRedirect();
        $this->assertSame(0, app(GroqKeyPool::class)->statuses()[1]['paused_seconds']);
        $this->actingAs($admin)->delete('/admin/ai-keys/9/pause')->assertNotFound();
    }
}
