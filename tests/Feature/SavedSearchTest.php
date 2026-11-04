<?php

namespace Tests\Feature;

use App\Jobs\RunSavedSearch;
use App\Models\SavedSearch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SavedSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_saved_searches(): void
    {
        $this->get('/saved-searches')->assertRedirect(route('login'));
    }

    public function test_a_user_can_create_a_saved_search_with_filters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/saved-searches', [
                'name' => 'Remote Laravel roles',
                'query' => 'Laravel',
                'filters' => [
                    'location' => 'Berlin',
                    'remote' => true,
                    'employment_type' => 'full_time',
                    'salary_min' => 50000,
                    'salary_max' => 120000,
                    'posted_within_days' => 7,
                ],
                'min_score' => 70,
                'alerts_enabled' => true,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $savedSearch = SavedSearch::query()->firstOrFail();

        $this->assertSame($user->id, $savedSearch->user_id);
        $this->assertSame('Remote Laravel roles', $savedSearch->name);
        $this->assertSame('Laravel', $savedSearch->query);
        $this->assertSame(70, $savedSearch->min_score);
        $this->assertTrue($savedSearch->alerts_enabled);
        $this->assertSame('Berlin', $savedSearch->filters['location']);
        $this->assertTrue($savedSearch->filters['remote']);
        $this->assertSame(7, $savedSearch->filters['posted_within_days']);
    }

    public function test_a_user_can_update_and_delete_a_saved_search(): void
    {
        $user = User::factory()->create();
        $savedSearch = SavedSearch::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->patch("/saved-searches/{$savedSearch->id}", [
                'name' => 'Updated search',
                'query' => 'Symfony',
                'filters' => ['remote' => true],
                'min_score' => 80,
                'alerts_enabled' => false,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $savedSearch->refresh();

        $this->assertSame('Updated search', $savedSearch->name);
        $this->assertSame('Symfony', $savedSearch->query);
        $this->assertSame(80, $savedSearch->min_score);
        $this->assertFalse($savedSearch->alerts_enabled);

        $this->actingAs($user)
            ->delete("/saved-searches/{$savedSearch->id}")
            ->assertRedirect();

        $this->assertDatabaseCount('saved_searches', 0);
    }

    public function test_a_user_cannot_manage_another_users_saved_search(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $savedSearch = SavedSearch::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/saved-searches/{$savedSearch->id}", [
                'name' => 'Hijacked',
                'query' => 'Laravel',
                'min_score' => 10,
                'alerts_enabled' => false,
            ])
            ->assertNotFound();

        $this->actingAs($other)
            ->delete("/saved-searches/{$savedSearch->id}")
            ->assertNotFound();

        $this->actingAs($other)
            ->post("/saved-searches/{$savedSearch->id}/run")
            ->assertNotFound();

        $this->assertDatabaseHas('saved_searches', ['id' => $savedSearch->id, 'name' => $savedSearch->name]);
    }

    public function test_running_a_saved_search_queues_the_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $savedSearch = SavedSearch::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post("/saved-searches/{$savedSearch->id}/run")
            ->assertRedirect();

        Queue::assertPushed(
            RunSavedSearch::class,
            fn (RunSavedSearch $job): bool => $job->savedSearchId === $savedSearch->id,
        );
    }

    public function test_the_search_name_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/saved-searches', ['query' => 'Laravel'])
            ->assertSessionHasErrors('name');
    }

    public function test_the_saved_searches_page_only_lists_the_users_searches(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $savedSearch = SavedSearch::factory()->create(['user_id' => $user->id]);

        SavedSearch::factory()->create(['user_id' => $other->id]);

        $this->actingAs($user)
            ->get('/saved-searches')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SavedSearches/Index', false)
                ->has('searches', 1)
                ->where('searches.0.id', $savedSearch->id)
            );
    }
}
