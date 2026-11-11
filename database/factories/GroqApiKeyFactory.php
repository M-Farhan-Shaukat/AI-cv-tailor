<?php

namespace Database\Factories;

use App\Models\GroqApiKey;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<GroqApiKey>
 */
class GroqApiKeyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $key = 'gsk_'.Str::random(52);

        return [
            'name' => fake()->words(2, true),
            'key' => $key,
            'fingerprint' => GroqApiKey::fingerprintOf($key),
            'last_four' => substr($key, -4),
            'is_active' => true,
        ];
    }

    public function disabled(): static
    {
        return $this->state(fn (array $attributes): array => ['is_active' => false]);
    }
}
