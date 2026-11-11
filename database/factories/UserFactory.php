<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Admin]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::SuperAdmin]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => ['suspended_at' => now()]);
    }

    /**
     * Indicate that the user has an active Pro subscription, as Cashier stores it after a Stripe webhook.
     */
    public function pro(): static
    {
        return $this->state(fn (array $attributes) => [
            'stripe_id' => 'cus_'.Str::random(14),
        ])->afterCreating(fn (User $user) => $user->subscriptions()->create([
            'type' => 'default',
            'stripe_id' => 'sub_'.Str::random(14),
            'stripe_status' => 'active',
            'stripe_price' => 'price_pro_monthly',
            'quantity' => 1,
        ]));
    }
}
