<?php

namespace Database\Factories;

use App\Models\JobSourceStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSourceStatus>
 */
class JobSourceStatusFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'provider' => fake()->unique()->lexify('provider-????'),
            'last_attempt_at' => now(),
            'last_success_at' => now(),
            'last_error_at' => null,
            'last_status_code' => null,
            'last_error_message' => null,
            'consecutive_failures' => 0,
            'disabled_until' => null,
        ];
    }

    public function coolingDown(): static
    {
        return $this->state(fn (array $attributes): array => [
            'consecutive_failures' => 3,
            'disabled_until' => now()->addMinutes(15),
        ]);
    }
}
