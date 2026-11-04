<?php

namespace Database\Factories;

use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<JobPosting>
 */
class JobPostingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->jobTitle();
        $company = fake()->company();
        $location = fake()->city().', '.fake()->countryCode();

        return [
            'provider' => fake()->randomElement(['adzuna', 'jooble', 'remotive']),
            'external_id' => (string) fake()->unique()->numerify('########'),
            'fingerprint' => hash('sha256', Str::lower($title.'|'.$company.'|'.$location.'|'.fake()->unique()->uuid())),
            'title' => $title,
            'company' => $company,
            'location' => $location,
            'is_remote' => fake()->boolean(30),
            'employment_type' => fake()->randomElement(['full_time', 'part_time', 'contract']),
            'salary_min' => fake()->numberBetween(30000, 80000),
            'salary_max' => fake()->numberBetween(80001, 150000),
            'currency' => 'USD',
            'description' => fake()->paragraphs(4, true),
            'apply_url' => fake()->url(),
            'keywords' => null,
            'keywords_hash' => null,
            'posted_at' => fake()->dateTimeBetween('-30 days'),
            'last_seen_at' => now(),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the posting is no longer listed by its source.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the posting is remote.
     */
    public function remote(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_remote' => true,
        ]);
    }
}
