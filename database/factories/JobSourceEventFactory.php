<?php

namespace Database\Factories;

use App\Models\JobSourceEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSourceEvent>
 */
class JobSourceEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'provider' => 'adzuna',
            'successful' => false,
            'status_code' => 500,
            'message' => 'Provider error',
            'context' => null,
        ];
    }

    public function successful(): static
    {
        return $this->state(fn (array $attributes): array => [
            'successful' => true,
            'status_code' => 200,
            'message' => null,
        ]);
    }
}
