<?php

namespace Database\Factories;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = rtrim(fake()->sentence(6), '.');

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(5)),
            'category' => 'CV tips',
            'excerpt' => fake()->sentence(18),
            'meta_description' => fake()->sentence(12),
            'body' => "## Why it matters\n\n".fake()->paragraphs(3, true)."\n\n## What to do\n\n- ".implode("\n- ", fake()->sentences(3)),
            'status' => Post::PUBLISHED,
            'published_at' => now()->subDay(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes): array => ['status' => Post::DRAFT, 'published_at' => null]);
    }
}
