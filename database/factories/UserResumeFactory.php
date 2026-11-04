<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserResume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserResume>
 */
class UserResumeFactory extends Factory
{
    protected $model = UserResume::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'original_filename' => 'cv.docx',
            'extracted_text' => fake()->paragraphs(3, true),
            'is_primary' => false,
        ];
    }

    public function primary(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_primary' => true,
        ]);
    }
}
