<?php

namespace Tests\Feature;

use App\Enums\ApplicationStatus;
use App\Models\JobPosting;
use App\Models\SavedJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SavedJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_saved_jobs(): void
    {
        $this->get('/saved-jobs')->assertRedirect(route('login'));
    }

    public function test_a_user_can_save_and_unsave_a_job(): void
    {
        $user = User::factory()->create();
        $job = JobPosting::factory()->create();

        $this->actingAs($user)
            ->post("/jobs/{$job->id}/save")
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $savedJob = SavedJob::query()->firstOrFail();

        $this->assertSame($user->id, $savedJob->user_id);
        $this->assertSame($job->id, $savedJob->job_posting_id);
        $this->assertSame(ApplicationStatus::Saved, $savedJob->status);

        $this->actingAs($user)
            ->delete("/saved-jobs/{$savedJob->id}")
            ->assertRedirect();

        $this->assertDatabaseCount('saved_jobs', 0);
    }

    public function test_saving_the_same_job_twice_does_not_create_a_duplicate(): void
    {
        $user = User::factory()->create();
        $job = JobPosting::factory()->create();

        $this->actingAs($user)->post("/jobs/{$job->id}/save")->assertRedirect();
        $this->actingAs($user)->post("/jobs/{$job->id}/save")->assertRedirect();

        $this->assertDatabaseCount('saved_jobs', 1);
    }

    public function test_a_user_can_track_the_application_status(): void
    {
        $user = User::factory()->create();
        $savedJob = SavedJob::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->patch("/saved-jobs/{$savedJob->id}", ['status' => 'applied'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(ApplicationStatus::Applied, $savedJob->fresh()->status);

        $this->actingAs($user)
            ->patch("/saved-jobs/{$savedJob->id}", ['status' => 'not-a-status'])
            ->assertSessionHasErrors('status');
    }

    public function test_a_user_cannot_change_another_users_saved_job(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $savedJob = SavedJob::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/saved-jobs/{$savedJob->id}", ['status' => 'applied'])
            ->assertNotFound();

        $this->actingAs($other)
            ->delete("/saved-jobs/{$savedJob->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('saved_jobs', ['id' => $savedJob->id]);
    }

    public function test_the_saved_jobs_page_only_lists_the_users_jobs(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $job = JobPosting::factory()->create();

        SavedJob::factory()->create(['user_id' => $user->id, 'job_posting_id' => $job->id]);
        SavedJob::factory()->create(['user_id' => $other->id]);

        $this->actingAs($user)
            ->get('/saved-jobs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SavedJobs/Index', false)
                ->has('savedJobs', 1)
                ->where('savedJobs.0.job.id', $job->id)
                ->where('savedJobs.0.status', 'saved')
            );
    }
}
