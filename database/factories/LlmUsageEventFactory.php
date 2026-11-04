<?php

namespace Database\Factories;

use App\Models\LlmUsageEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LlmUsageEvent>
 */
class LlmUsageEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $prompt = fake()->numberBetween(100, 800);
        $completion = fake()->numberBetween(50, 600);

        return [
            'user_id' => null,
            'scope' => fake()->randomElement(['keyword', 'tailor']),
            'model' => 'openai/gpt-oss-120b',
            'status' => 'success',
            'status_code' => 200,
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
            'total_tokens' => $prompt + $completion,
            'duration_ms' => fake()->numberBetween(200, 5000),
            'error' => null,
        ];
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'failure',
            'status_code' => 500,
            'error' => 'Provider error',
        ]);
    }
}
