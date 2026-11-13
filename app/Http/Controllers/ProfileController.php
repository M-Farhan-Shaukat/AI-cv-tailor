<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Payment;
use App\Services\Payments\LocalPayments;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'hasBillingAccount' => $request->user()->hasStripeId(),
            'subscriptionEndsAt' => $request->user()->subscription((string) config('billing.subscription_type', 'default'))?->ends_at?->toDateString(),
            'payments' => $request->user()->payments()->latest()->limit(10)->get()->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'channel_label' => $payment->channel->label(),
                'interval' => $payment->interval,
                'amount_label' => LocalPayments::formatAmount($payment->amount),
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'created_at' => $payment->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        $subscription = $user->subscription((string) config('billing.subscription_type', 'default'));

        if ($subscription !== null && $subscription->valid() && ! $subscription->onGracePeriod()) {
            throw ValidationException::withMessages([
                'password' => 'Cancel your Pro subscription from the billing page before deleting your account, so you are not charged again.',
            ]);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
