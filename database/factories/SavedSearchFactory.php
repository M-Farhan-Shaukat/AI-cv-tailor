<?php

namespace Database\Factories;

use App\Models\SavedSearch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedSearch>
 */
class SavedSearchFactory extends Factory
{
    protected $model = SavedSearch::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => 'Laravel roles',
            'query' => 'Laravel',
            'filters' => [
                'location' => '',
                'remote' => false,
            ],
            'min_score' => 60,
            'alerts_enabled' => true,
            'last_run_at' => null,
        ];
    }

    public function disabled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'alerts_enabled' => false,
        ]);
    }
}
