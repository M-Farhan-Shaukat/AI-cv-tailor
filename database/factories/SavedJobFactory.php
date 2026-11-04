<?php

namespace Database\Factories;

use App\Enums\ApplicationStatus;
use App\Models\JobPosting;
use App\Models\SavedJob;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedJob>
 */
class SavedJobFactory extends Factory
{
    protected $model = SavedJob::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'job_posting_id' => JobPosting::factory(),
            'status' => ApplicationStatus::Saved,
        ];
    }

    public function applied(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ApplicationStatus::Applied,
        ]);
    }
}
