<?php

namespace Tests\Feature;

use App\Models\JobPosting;
use App\Models\LlmUsageEvent;
use App\Models\User;
use App\Services\JobSourceHealth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminJobMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_users_cannot_view_operations_metrics(): void
    {
        config(['job_scan.admin_emails' => ['admin@example.com']]);

        $this->actingAs(User::factory()->create(['email' => 'user@example.com']))
            ->get('/admin/jobs')
            ->assertForbidden();
    }

    public function test_admins_see_provider_health_and_llm_usage(): void
    {
        config(['job_scan.admin_emails' => ['admin@example.com']]);

        $admin = User::factory()->create(['email' => 'admin@example.com']);

        JobPosting::factory()->count(2)->create(['provider' => 'adzuna', 'is_active' => true]);
        JobPosting::factory()->create(['provider' => 'adzuna', 'is_active' => false]);
        JobPosting::factory()->create(['provider' => 'remotive', 'is_active' => true]);

        $health = app(JobSourceHealth::class);
        $health->recordSuccess('adzuna', ['created' => 2]);
        $health->recordFailure('jooble', 503, 'Jooble unavailable');

        LlmUsageEvent::factory()->create(['user_id' => $admin->id, 'total_tokens' => 200]);
        LlmUsageEvent::factory()->failed()->create(['user_id' => $admin->id, 'total_tokens' => 0]);

        $this->actingAs($admin)
            ->get('/admin/jobs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/JobMetrics', false)
                ->has('providers', 3)
                ->where('providers.0.name', 'adzuna')
                ->where('providers.0.active_postings', 2)
                ->where('providers.1.name', 'jooble')
                ->where('providers.1.last_status_code', 503)
                ->where('sourceEvents.0.provider', 'jooble')
                ->where('sourceEvents.0.status_code', 503)
                ->where('usage.today.requests', 2)
                ->where('usage.today.failures', 1)
                ->has('usage.daily')
                ->has('usage.topUsers', 1)
            );
    }
}
