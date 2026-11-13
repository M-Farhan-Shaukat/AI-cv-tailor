<?php

namespace App\Http\Controllers;

use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\Payments\EasypaisaGateway;
use App\Services\Payments\JazzCashGateway;
use App\Services\Payments\LocalPayments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Paying for Pro once, in rupees, through JazzCash, Easypaisa or a bank transfer.
 */
class LocalPaymentController extends Controller
{
    /**
     * Start a payment: gateways open their checkout page, bank transfers show the account details.
     */
    public function store(Request $request, LocalPayments $payments, string $channel, string $interval): Response
    {
        $paymentChannel = PaymentChannel::tryFrom($channel);
        abort_if($paymentChannel === null || ! in_array($interval, LocalPayments::INTERVALS, true), 404);

        $user = $request->user();

        if (! $payments->isAvailable($paymentChannel)) {
            return to_route('pricing')->withErrors(['billing' => $paymentChannel->label().' is not available right now. Please choose another way to pay.']);
        }

        if ($user->subscribed((string) config('billing.subscription_type', 'default'))) {
            return to_route('pricing')->withErrors(['billing' => 'You already have a Pro subscription by card. Manage it from the billing page.']);
        }

        $payment = $paymentChannel === PaymentChannel::BankTransfer
            ? $user->payments()->where('channel', PaymentChannel::BankTransfer)->where('interval', $interval)->where('status', PaymentStatus::Pending)->latest()->first()
            : null;
        $payment ??= $payments->create($user, $paymentChannel, $interval);

        return $paymentChannel->isGateway()
            ? Inertia::location(route('billing.payments.checkout', $payment))
            : to_route('billing.payments.show', $payment);
    }

    /**
     * An auto-submitting form that posts the signed request to JazzCash or Easypaisa.
     */
    public function checkout(Request $request, Payment $payment, JazzCashGateway $jazzCash, EasypaisaGateway $easypaisa): Response
    {
        $this->authorizeOwner($request, $payment);

        if ($payment->status !== PaymentStatus::Pending || ! $payment->channel->isGateway()) {
            return to_route('billing.payments.show', $payment);
        }

        [$action, $fields] = match ($payment->channel) {
            PaymentChannel::JazzCash => [$jazzCash->checkoutUrl(), $jazzCash->checkoutFields($payment, route('payments.jazzcash.return'))],
            PaymentChannel::Easypaisa => [$easypaisa->url('checkout'), $easypaisa->checkoutFields($payment, route('payments.easypaisa.return'), $request->user()->email)],
        };

        return response()->view('payments.redirect', [
            'gateway' => $payment->channel->label(),
            'amount' => LocalPayments::formatAmount($payment->amount),
            'action' => $action,
            'fields' => $fields,
        ])->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, Payment $payment, LocalPayments $payments): InertiaResponse
    {
        $this->authorizeOwner($request, $payment);

        return Inertia::render('Billing/Payment', [
            'payment' => $this->present($payment),
            'bank' => $payment->channel === PaymentChannel::BankTransfer ? $payments->bankDetails() : null,
            'proUntil' => $request->user()->pro_paid_until?->toIso8601String(),
            'seo' => ['title' => 'Payment '.$payment->reference],
        ]);
    }

    /**
     * The payer's bank transfer reference and an optional screenshot, for an admin to check.
     */
    public function submitProof(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorizeOwner($request, $payment);

        if ($payment->channel !== PaymentChannel::BankTransfer || $payment->status !== PaymentStatus::Pending) {
            throw ValidationException::withMessages(['payer_reference' => 'This payment is not waiting for transfer details.']);
        }

        $validated = $request->validate([
            'payer_reference' => ['required', 'string', 'max:100', Rule::unique('payments', 'payer_reference')->where('channel', PaymentChannel::BankTransfer->value)->whereNot('status', PaymentStatus::Rejected->value)],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ], [
            'payer_reference.unique' => 'This transaction reference has already been submitted.',
        ]);

        $payment->forceFill([
            'payer_reference' => trim($validated['payer_reference']),
            'proof_path' => $request->file('proof')?->store('payment-proofs', 'local'),
            'status' => PaymentStatus::AwaitingReview,
        ])->save();

        return back()->with('status', 'Thanks! We will check your transfer and switch on Pro, usually within a few hours.');
    }

    /**
     * Ask Easypaisa again about a payment that is still open.
     */
    public function refresh(Request $request, Payment $payment, LocalPayments $payments): RedirectResponse
    {
        $this->authorizeOwner($request, $payment);

        if ($payment->channel === PaymentChannel::Easypaisa && $payment->status === PaymentStatus::Pending) {
            $payments->confirmWithEasypaisa($payment);
        }

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    protected function present(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'reference' => $payment->reference,
            'channel' => $payment->channel->value,
            'channel_label' => $payment->channel->label(),
            'interval' => $payment->interval,
            'amount' => $payment->amount,
            'amount_label' => LocalPayments::formatAmount($payment->amount),
            'status' => $payment->status->value,
            'status_label' => $payment->status->label(),
            'payer_reference' => $payment->payer_reference,
            'admin_note' => $payment->admin_note,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }

    protected function authorizeOwner(Request $request, Payment $payment): void
    {
        abort_unless($payment->user_id === $request->user()->id, 404);
    }
}
