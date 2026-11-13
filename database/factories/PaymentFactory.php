<?php

namespace Database\Factories;

use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'reference' => 'T'.now()->format('YmdHis').Str::upper(Str::random(5)),
            'channel' => PaymentChannel::JazzCash,
            'interval' => 'monthly',
            'amount' => 2799,
            'currency' => 'PKR',
            'status' => PaymentStatus::Pending,
        ];
    }

    public function channel(PaymentChannel $channel): static
    {
        return $this->state(fn (array $attributes) => ['channel' => $channel]);
    }

    public function awaitingReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'channel' => PaymentChannel::BankTransfer,
            'status' => PaymentStatus::AwaitingReview,
            'payer_reference' => 'FT'.fake()->numerify('##########'),
        ]);
    }
}
