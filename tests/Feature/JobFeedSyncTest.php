<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\JobFeedSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobFeedSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        config([
            'job_scan.default_query' => '',
            'services.adzuna.app_id' => null,
            'services.adzuna.app_key' => null,
            'services.jooble.key' => null,
            'services.remotive.base_url' => 'https://remotive.test/api',
        ]);
    }

    public function test_the_job_feeds_page_shows_sync_settings_and_which_providers_need_keys(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get('/admin/jobs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/JobMetrics', false)
                ->where('sync.settings.queries', [])
                ->where('sync.settings.auto_sync', false)
                ->where('sync.last_run', null)
                ->where('sync.scheduler_running', false)
                ->where('providers.0.name', 'adzuna')
                ->where('providers.0.configured', false)
                ->where('providers.2.name', 'remotive')
                ->where('providers.2.configured', true));
    }

    public function test_admins_save_search_terms_and_the_auto_sync_schedule(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->put('/admin/jobs/sync-settings', $this->settings(['queries' => [' Laravel developer ', 'React developer', 'Laravel developer', '']]))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $settings = app(JobFeedSync::class)->settings();
        $this->assertSame(['Laravel developer', 'React developer'], $settings['queries']);
        $this->assertSame('gb', $settings['country']);
        $this->assertTrue($settings['auto_sync']);
        $this->assertSame(6, $settings['interval_hours']);

        $this->actingAs($admin)->put('/admin/jobs/sync-settings', $this->settings(['queries' => []]))->assertSessionHasErrors('queries');
        $this->actingAs($admin)->put('/admin/jobs/sync-settings', $this->settings(['interval_hours' => 5]))->assertSessionHasErrors('interval_hours');
        $this->actingAs(User::factory()->create())->put('/admin/jobs/sync-settings', $this->settings())->assertForbidden();
    }

    public function test_sync_now_fetches_every_search_term_and_records_the_run(): void
    {
        Http::fake(['remotive.test/*' => Http::sequence()
            ->push(['jobs' => [$this->remotiveJob(1, 'Laravel Developer')]])
            ->push(['jobs' => [$this->remotiveJob(2, 'React Developer')]])]);
        app(JobFeedSync::class)->saveSettings($this->settings(['queries' => ['laravel', 'react'], 'location' => '', 'auto_sync' => false]));

        $this->actingAs(User::factory()->admin()->create())
            ->post('/admin/jobs/sync')
            ->assertRedirect()
            ->assertSessionHas('status', 'Sync finished. Adzuna: not configured · Jooble: not configured · Remotive: 2 fetched, 2 new');

        $this->assertDatabaseCount('job_postings', 2);
        Http::assertSentCount(2);

        $lastRun = app(JobFeedSync::class)->lastRun();
        $this->assertSame('manual', $lastRun['trigger']);
        $this->assertSame(2, $lastRun['providers']['remotive']['created']);
    }

    public function test_one_provider_can_be_synced_on_its_own_but_only_when_it_is_configured(): void
    {
        Http::fake(['remotive.test/*' => Http::response(['jobs' => [$this->remotiveJob(1, 'Laravel Developer')]])]);
        app(JobFeedSync::class)->saveSettings($this->settings(['queries' => ['laravel'], 'location' => '']));
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post('/admin/jobs/sync', ['provider' => 'remotive'])
            ->assertSessionHas('status', 'Sync finished. Remotive: 1 fetched, 1 new');

        $this->actingAs($admin)->post('/admin/jobs/sync', ['provider' => 'adzuna'])
            ->assertSessionHasErrors(['sync' => 'Adzuna is not configured. Add its API keys to .env first.']);
        $this->actingAs($admin)->post('/admin/jobs/sync', ['provider' => 'unknown'])->assertSessionHasErrors('provider');
    }

    public function test_sync_now_asks_for_search_terms_first(): void
    {
        Http::fake();

        $this->actingAs(User::factory()->admin()->create())
            ->post('/admin/jobs/sync')
            ->assertSessionHasErrors(['sync' => 'Add at least one search term in the sync settings first.']);

        Http::assertNothingSent();
    }

    public function test_auto_sync_runs_only_when_switched_on_and_due(): void
    {
        Http::fake(['remotive.test/*' => Http::response(['jobs' => [$this->remotiveJob(1, 'Laravel Developer')]])]);
        $sync = app(JobFeedSync::class);

        $this->artisan('jobs:auto-sync')->assertSuccessful();
        Http::assertNothingSent();

        $sync->saveSettings($this->settings(['queries' => ['laravel'], 'location' => '', 'auto_sync' => true, 'interval_hours' => 6]));

        $this->artisan('jobs:auto-sync')->assertSuccessful();
        $this->assertDatabaseCount('job_postings', 1);
        $this->assertSame('auto', $sync->lastRun()['trigger']);

        $this->artisan('jobs:auto-sync')->assertSuccessful();
        Http::assertSentCount(1);

        $this->travel(6)->hours();
        $this->artisan('jobs:auto-sync')->assertSuccessful();
        Http::assertSentCount(2);

        $this->artisan('jobs:auto-sync', ['--force' => true])->assertSuccessful();
        Http::assertSentCount(3);
    }

    public function test_the_env_default_query_is_used_until_settings_are_saved(): void
    {
        config(['job_scan.default_query' => 'php developer']);

        $settings = app(JobFeedSync::class)->settings();

        $this->assertSame(['php developer'], $settings['queries']);
        $this->assertTrue($settings['auto_sync']);
    }

    public function test_the_scheduler_heartbeat_shows_whether_the_scheduler_is_running(): void
    {
        $sync = app(JobFeedSync::class);
        $this->assertFalse($sync->schedulerIsRunning());

        $sync->recordSchedulerHeartbeat();
        $this->assertTrue($sync->schedulerIsRunning());

        $this->travel(6)->minutes();
        $this->assertFalse($sync->schedulerIsRunning());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function settings(array $overrides = []): array
    {
        return [
            'queries' => ['Laravel developer'],
            'location' => 'London',
            'country' => 'GB',
            'remote_only' => false,
            'per_page' => 50,
            'auto_sync' => true,
            'interval_hours' => 6,
            ...$overrides,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function remotiveJob(int $id, string $title): array
    {
        return [
            'id' => $id,
            'title' => $title,
            'company_name' => 'Acme, Inc.',
            'candidate_required_location' => 'Remote (UK)',
            'job_type' => 'full_time',
            'description' => '<p>Build things.</p>',
            'url' => "https://remotive.test/jobs/{$id}",
            'publication_date' => '2026-01-15T10:00:00',
        ];
    }
}
