<?php

namespace Database\Factories;

use App\Models\JobMatch;
use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<JobMatch>
 */
class JobMatchFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'session_id' => Str::random(40),
            'matcher_key' => hash('sha256', Str::random(40)),
            'resume_hash' => hash('sha256', Str::random(40)),
            'job_posting_id' => JobPosting::factory(),
            'score' => fake()->numberBetween(0, 100),
            'breakdown' => [
                'keywords' => ['score' => 80, 'weight' => 70, 'label' => 'Keyword match', 'detail' => '4 of 5 JD keywords found'],
            ],
            'matched_keywords' => [
                ['term' => 'Laravel', 'importance' => 'required', 'in_context' => true],
            ],
            'missing_keywords' => [
                ['term' => 'Docker', 'importance' => 'preferred'],
            ],
            'computed_at' => now(),
        ];
    }
}
