<?php

namespace App\Services\Payments;

use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * One-off Pro payments in rupees through JazzCash, Easypaisa or a bank transfer. Each paid payment
 * moves the user's pro_paid_until forward by a month or a year, starting from today or from the end
 * of the Pro they already paid for, whichever is later.
 */
class LocalPayments
{
    public const INTERVALS = ['monthly', 'yearly'];

    public function __construct(protected JazzCashGateway $jazzCash, protected EasypaisaGateway $easypaisa) {}

    /**
     * Channels that are switched on and have every detail they need.
     *
     * @return array<int, PaymentChannel>
     */
    public function availableChannels(): array
    {
        return array_values(array_filter(PaymentChannel::cases(), fn (PaymentChannel $channel): bool => $this->isAvailable($channel)));
    }

    public function isAvailable(PaymentChannel $channel): bool
    {
        if (! config("billing.channels.{$channel->value}.enabled", false)) {
            return false;
        }

        return match ($channel) {
            PaymentChannel::JazzCash => $this->jazzCash->isConfigured(),
            PaymentChannel::Easypaisa => $this->easypaisa->isConfigured(),
            PaymentChannel::BankTransfer => filled($this->bankDetails()['account_title']) && (filled($this->bankDetails()['account_number']) || filled($this->bankDetails()['iban'])),
        };
    }

    public function stripeIsAvailable(string $interval): bool
    {
        return (bool) config('billing.channels.stripe.enabled', true) && filled(config("billing.prices.{$interval}.stripe_price"));
    }

    /**
     * The Pro price for an interval in whole rupees.
     */
    public function amount(string $interval): int
    {
        return (int) config("billing.prices.{$interval}.amount", 0);
    }

    public static function formatAmount(int $amount): string
    {
        return 'Rs '.number_format($amount);
    }

    /**
     * @return array{bank_name: string|null, account_title: string|null, account_number: string|null, iban: string|null, instructions: string|null}
     */
    public function bankDetails(): array
    {
        $details = (array) config('billing.channels.bank_transfer', []);

        return [
            'bank_name' => $details['bank_name'] ?? null,
            'account_title' => $details['account_title'] ?? null,
            'account_number' => $details['account_number'] ?? null,
            'iban' => $details['iban'] ?? null,
            'instructions' => $details['instructions'] ?? null,
        ];
    }

    public function create(User $user, PaymentChannel $channel, string $interval): Payment
    {
        return $user->payments()->create([
            'reference' => $this->newReference(),
            'channel' => $channel,
            'interval' => $interval,
            'amount' => $this->amount($interval),
            'currency' => (string) config('billing.currency', 'PKR'),
            'status' => PaymentStatus::Pending,
        ]);
    }

    /**
     * Mark the payment paid and extend the user's Pro. Safe to call twice for the same payment, e.g.
     * when a gateway reply and an admin approval arrive together: only the first one extends Pro.
     *
     * @param  array<string, mixed>  $gatewayResponse
     */
    public function markPaid(Payment $payment, ?string $gatewayTransactionId = null, array $gatewayResponse = [], ?User $reviewer = null): bool
    {
        return DB::transaction(function () use ($payment, $gatewayTransactionId, $gatewayResponse, $reviewer): bool {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($locked->status === PaymentStatus::Paid) {
                return false;
            }

            $user = User::query()->lockForUpdate()->findOrFail($locked->user_id);
            $from = $user->hasPaidPro() ? $user->pro_paid_until : now();
            $user->forceFill(['pro_paid_until' => $this->extend($from, $locked->interval)])->save();

            $locked->forceFill([
                'status' => PaymentStatus::Paid,
                'paid_at' => now(),
                'gateway_transaction_id' => $gatewayTransactionId ?? $locked->gateway_transaction_id,
                'gateway_response' => $gatewayResponse === [] ? $locked->gateway_response : $gatewayResponse,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => $reviewer === null ? null : now(),
            ])->save();

            $payment->setRawAttributes($locked->getAttributes(), true);

            return true;
        });
    }

    /**
     * Close an open payment as failed (gateway) or rejected (admin). A paid payment is never changed.
     *
     * @param  array<string, mixed>  $gatewayResponse
     */
    public function close(Payment $payment, PaymentStatus $status, array $gatewayResponse = [], ?User $reviewer = null, ?string $note = null): bool
    {
        return DB::transaction(function () use ($payment, $status, $gatewayResponse, $reviewer, $note): bool {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if (! $locked->status->isOpen()) {
                return false;
            }

            $locked->forceFill([
                'status' => $status,
                'gateway_response' => $gatewayResponse === [] ? $locked->gateway_response : $gatewayResponse,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => $reviewer === null ? null : now(),
                'admin_note' => $note,
            ])->save();

            $payment->setRawAttributes($locked->getAttributes(), true);

            return true;
        });
    }

    /**
     * Ask Easypaisa about an open payment and record the answer. Returns the outcome: "paid",
     * "failed", or null while it is still open or Easypaisa cannot be reached.
     */
    public function confirmWithEasypaisa(Payment $payment): ?string
    {
        $result = $this->easypaisa->inquire($payment);

        match ($result['outcome']) {
            'paid' => $this->markPaid($payment, $result['transaction_id'], $result['response']),
            'failed' => $this->close($payment, PaymentStatus::Failed, $result['response']),
            default => null,
        };

        return $result['outcome'];
    }

    protected function extend(Carbon $from, string $interval): Carbon
    {
        return $interval === 'yearly' ? $from->copy()->addYearNoOverflow() : $from->copy()->addMonthNoOverflow();
    }

    /**
     * "T" plus the Pakistan date and time plus 4 random characters: unique, at most 20 characters
     * (JazzCash's limit) and only letters and digits (Easypaisa's rule).
     */
    protected function newReference(): string
    {
        do {
            $reference = 'T'.now('Asia/Karachi')->format('YmdHis').Str::upper(Str::random(4));
        } while (Payment::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
