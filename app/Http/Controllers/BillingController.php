<?php

namespace App\Http\Controllers;

use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Services\Payments\LocalPayments;
use App\Services\UsageQuota;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response;

class BillingController extends Controller
{
    public function pricing(Request $request, LocalPayments $payments): InertiaResponse
    {
        $user = $request->user();
        $subscription = $user?->subscription((string) config('billing.subscription_type', 'default'));
        $channels = collect($payments->availableChannels())->map(fn (PaymentChannel $channel): array => [
            'value' => $channel->value,
            'label' => $channel->label(),
        ])->values();

        return Inertia::render('Pricing', [
            'prices' => collect((array) config('billing.prices'))
                ->map(fn (array $price, string $interval): array => [
                    'interval' => $interval,
                    'amount' => (int) $price['amount'],
                    'amount_label' => LocalPayments::formatAmount((int) $price['amount']),
                    'monthly_equivalent_label' => $interval === 'yearly' ? LocalPayments::formatAmount((int) round($price['amount'] / 12)) : null,
                    'period' => $price['period'],
                    'note' => $price['note'],
                    'stripe' => $payments->stripeIsAvailable($interval),
                    'available' => $payments->stripeIsAvailable($interval) || $channels->isNotEmpty(),
                ])
                ->values(),
            'channels' => $channels,
            'paidUntil' => $user?->hasPaidPro() ? $user->pro_paid_until->toIso8601String() : null,
            'openPayment' => $user?->payments()->where('status', PaymentStatus::AwaitingReview)->latest()->first()?->only(['id', 'reference']),
            'limits' => [
                'free_monthly_tailors' => (int) config('billing.free_monthly_tailors', 1),
                'pro_monthly_tailors' => (int) config('billing.pro_monthly_tailors', 0),
                'free_templates' => count((array) config('billing.free_templates', [])),
            ],
            'subscription' => $subscription === null ? null : [
                'active' => $subscription->valid(),
                'ends_at' => $subscription->ends_at?->toDateString(),
                'on_grace_period' => $subscription->onGracePeriod(),
            ],
            'hasBillingAccount' => $user?->hasStripeId() ?? false,
            'checkoutStatus' => in_array($request->query('checkout'), ['success', 'cancelled'], true) ? $request->query('checkout') : null,
            'paymentStatus' => $request->query('payment') === 'invalid' ? 'invalid' : null,
            'seo' => [
                'title' => 'Pricing',
                'description' => 'Check your ATS score free. Tailor one CV free every month, or go Pro in rupees with JazzCash, Easypaisa or bank transfer for more tailored CVs and every design.',
            ],
        ]);
    }

    /**
     * Send the user to Stripe Checkout for the Pro plan. Subscribers go to the billing portal instead,
     * so nobody pays twice.
     */
    public function checkout(Request $request, UsageQuota $quota, LocalPayments $payments, string $interval): Response
    {
        $user = $request->user();
        $priceId = config("billing.prices.{$interval}.stripe_price");

        if ($quota->isPro($user) && $user->hasStripeId() && $user->subscribed((string) config('billing.subscription_type', 'default'))) {
            return Inertia::location(route('billing.portal'));
        }

        if (! $payments->stripeIsAvailable($interval)) {
            return $this->backWithError('Pro checkout is not available yet. Please try again later.');
        }

        try {
            $checkout = $user->newSubscription((string) config('billing.subscription_type', 'default'), $priceId)
                ->allowPromotionCodes()
                ->checkout([
                    'success_url' => route('pricing', ['checkout' => 'success']),
                    'cancel_url' => route('pricing', ['checkout' => 'cancelled']),
                ]);
        } catch (ApiErrorException $exception) {
            Log::error('Stripe checkout could not be started', ['user_id' => $user->id, 'message' => $exception->getMessage()]);

            return $this->backWithError('We could not open the payment page. Please try again in a moment.');
        }

        return Inertia::location($checkout->url);
    }

    /**
     * Stripe's billing portal: change plan, update the card, download invoices or cancel.
     */
    public function portal(Request $request): Response
    {
        $user = $request->user();

        if (! $user->hasStripeId()) {
            return to_route('pricing');
        }

        try {
            return Inertia::location($user->billingPortalUrl(route('pricing')));
        } catch (ApiErrorException $exception) {
            Log::error('Stripe billing portal could not be opened', ['user_id' => $user->id, 'message' => $exception->getMessage()]);

            return $this->backWithError('We could not open the billing page. Please try again in a moment.');
        }
    }

    protected function backWithError(string $message): RedirectResponse
    {
        return to_route('pricing')->withErrors(['billing' => $message]);
    }
}
