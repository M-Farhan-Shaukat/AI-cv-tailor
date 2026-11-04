<?php

namespace Tests\Feature;

use App\Jobs\RunSavedSearch;
use App\Jobs\SendSavedSearchDigest;
use App\Mail\SavedSearchDigest;
use App\Models\JobPosting;
use App\Models\SavedSearch;
use App\Models\SavedSearchNotification;
use App\Models\User;
use App\Models\UserResume;
use App\Services\SavedSearchRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SavedSearchRunnerTest extends TestCase
{
    use RefreshDatabase;

    protected const CV_TEXT = 'Laravel developer with Docker experience building REST APIs for three products.';

    public function test_it_creates_one_alert_per_new_match_and_emails_it_once(): void
    {
        Mail::fake();

        [$savedSearch, $posting] = $this->savedSearchWithResume(['query' => 'Laravel', 'min_score' => 0]);

        $runner = app(SavedSearchRunner::class);

        $this->assertSame(1, $runner->run($savedSearch));
        $this->assertDatabaseHas('saved_search_notifications', [
            'saved_search_id' => $savedSearch->id,
            'job_posting_id' => $posting->id,
            'sent_at' => null,
        ]);
        $this->assertNotNull($savedSearch->fresh()->last_run_at);

        (new SendSavedSearchDigest($savedSearch->id))->handle();

        Mail::assertSent(SavedSearchDigest::class, 1);
        Mail::assertSent(SavedSearchDigest::class, fn (SavedSearchDigest $mail): bool => $mail->postings->count() === 1);
        $this->assertNotNull(SavedSearchNotification::query()->firstOrFail()->sent_at);

        $this->assertSame(0, $runner->run($savedSearch->fresh()));
        (new SendSavedSearchDigest($savedSearch->id))->handle();

        Mail::assertSent(SavedSearchDigest::class, 1);
        $this->assertDatabaseCount('saved_search_notifications', 1);
    }

    public function test_it_only_scores_postings_that_match_the_saved_search_filters(): void
    {
        [$savedSearch, $matching] = $this->savedSearchWithResume([
            'query' => 'Laravel',
            'min_score' => 0,
            'filters' => ['location' => 'Berlin', 'remote' => true],
        ]);

        $other = $this->posting([
            'title' => 'Laravel Developer',
            'location' => 'Paris, FR',
            'is_remote' => true,
        ]);

        $created = app(SavedSearchRunner::class)->run($savedSearch);

        $this->assertSame(1, $created);
        $this->assertDatabaseHas('saved_search_notifications', ['job_posting_id' => $matching->id]);
        $this->assertDatabaseMissing('saved_search_notifications', ['job_posting_id' => $other->id]);
    }

    public function test_it_respects_employment_and_salary_filters(): void
    {
        [$savedSearch] = $this->savedSearchWithResume([
            'query' => 'Laravel',
            'min_score' => 0,
            'filters' => ['employment_type' => 'contract', 'salary_min' => 100000],
        ]);

        $contract = $this->posting([
            'employment_type' => 'contract',
            'salary_min' => 100000,
            'salary_max' => 130000,
        ]);

        $fullTime = $this->posting([
            'employment_type' => 'full_time',
            'salary_min' => 100000,
            'salary_max' => 130000,
        ]);

        $this->assertSame(1, app(SavedSearchRunner::class)->run($savedSearch));
        $this->assertDatabaseHas('saved_search_notifications', ['job_posting_id' => $contract->id]);
        $this->assertDatabaseMissing('saved_search_notifications', ['job_posting_id' => $fullTime->id]);
    }

    public function test_it_does_not_alert_for_matches_below_the_score_threshold(): void
    {
        [$savedSearch] = $this->savedSearchWithResume(['query' => 'Laravel', 'min_score' => 100]);

        $created = app(SavedSearchRunner::class)->run($savedSearch);

        $this->assertSame(0, $created);
        $this->assertDatabaseCount('saved_search_notifications', 0);
        $this->assertNotNull($savedSearch->fresh()->last_run_at);
    }

    public function test_the_job_dispatches_a_digest_when_alerts_are_created(): void
    {
        Queue::fake([SendSavedSearchDigest::class]);

        [$savedSearch] = $this->savedSearchWithResume(['query' => 'Laravel', 'min_score' => 0]);

        (new RunSavedSearch($savedSearch->id))->handle(app(SavedSearchRunner::class));

        Queue::assertPushed(
            SendSavedSearchDigest::class,
            fn (SendSavedSearchDigest $job): bool => $job->savedSearchId === $savedSearch->id,
        );
    }

    public function test_disabled_alerts_are_scored_without_sending_email(): void
    {
        Queue::fake();

        [$savedSearch] = $this->savedSearchWithResume(['query' => 'Laravel', 'min_score' => 0, 'alerts_enabled' => false]);

        (new RunSavedSearch($savedSearch->id))->handle(app(SavedSearchRunner::class));

        $this->assertDatabaseCount('saved_search_notifications', 0);
        $this->assertNotNull($savedSearch->fresh()->last_run_at);
        Queue::assertNothingPushed();
    }

    public function test_a_saved_search_without_a_primary_resume_is_skipped(): void
    {
        $savedSearch = SavedSearch::factory()->create(['min_score' => 0]);

        $this->posting(['title' => 'Laravel Developer']);

        $this->assertSame(0, app(SavedSearchRunner::class)->run($savedSearch));
        $this->assertDatabaseCount('saved_search_notifications', 0);
        $this->assertNotNull($savedSearch->fresh()->last_run_at);
    }

    public function test_the_command_queues_only_due_saved_searches(): void
    {
        Queue::fake();

        $due = SavedSearch::factory()->create(['last_run_at' => null]);
        SavedSearch::factory()->create(['last_run_at' => now()]);
        SavedSearch::factory()->disabled()->create(['last_run_at' => null]);

        $this->artisan('jobs:run-saved-searches')->assertSuccessful();

        Queue::assertPushed(RunSavedSearch::class, 1);
        Queue::assertPushed(
            RunSavedSearch::class,
            fn (RunSavedSearch $job): bool => $job->savedSearchId === $due->id,
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array{0: SavedSearch, 1: JobPosting}
     */
    protected function savedSearchWithResume(array $attributes = []): array
    {
        $user = User::factory()->create();

        UserResume::factory()->primary()->create([
            'user_id' => $user->id,
            'original_filename' => 'cv.docx',
            'extracted_text' => self::CV_TEXT,
        ]);

        $posting = $this->posting([
            'title' => 'Laravel Developer',
            'location' => 'Berlin, DE',
            'is_remote' => true,
            'employment_type' => 'full_time',
            'salary_min' => 30000,
            'salary_max' => 60000,
        ]);

        $savedSearch = SavedSearch::factory()->create([
            'user_id' => $user->id,
            'query' => 'Laravel',
            'min_score' => 0,
            ...$attributes,
        ]);

        return [$savedSearch, $posting];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function posting(array $attributes = []): JobPosting
    {
        $description = (string) ($attributes['description'] ?? 'We need Laravel and Docker experience.');

        return JobPosting::factory()->create([
            'title' => 'Laravel Developer',
            'description' => $description,
            'keywords' => [
                ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'Docker', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
                ['term' => 'Kubernetes', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
            ],
            'keywords_hash' => hash('sha256', $description),
            'is_remote' => true,
            ...$attributes,
        ]);
    }
}
