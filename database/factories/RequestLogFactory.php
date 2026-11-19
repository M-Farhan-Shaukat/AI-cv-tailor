<?php

namespace Database\Factories;

use App\Models\RequestLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RequestLog>
 */
class RequestLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'source' => RequestLog::SOURCE_SERVER,
            'method' => 'POST',
            'path' => '/tailor',
            'status_code' => 200,
            'duration_ms' => fake()->numberBetween(200, 20000),
            'ip' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
        ];
    }

    public function failed(int $statusCode = 500, string $error = 'Something broke'): static
    {
        return $this->state(fn (): array => ['status_code' => $statusCode, 'error' => $error]);
    }

    public function unfinished(): static
    {
        return $this->state(fn (): array => ['status_code' => null, 'duration_ms' => null]);
    }

    public function fromBrowser(): static
    {
        return $this->state(fn (): array => [
            'source' => RequestLog::SOURCE_BROWSER,
            'status_code' => null,
            'error' => 'Network Error',
            'context' => ['code' => 'ERR_NETWORK', 'elapsed_ms' => 1200, 'online' => true],
        ]);
    }
}
