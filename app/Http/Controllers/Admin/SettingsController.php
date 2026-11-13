<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SiteSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\StripeClient;
use Throwable;

/**
 * Site settings that used to live in .env: billing and plans, Stripe, email and job provider keys.
 * Super admins only, since these include payment and email credentials.
 */
class SettingsController extends Controller
{
    public function edit(Request $request, SiteSettings $settings): Response
    {
        Gate::authorize('manage-site-settings');

        $tab = $request->string('tab')->toString();

        return Inertia::render('Admin/Settings', [
            'groups' => $settings->forAdmin(),
            'tab' => array_key_exists($tab, SiteSettings::GROUPS) ? $tab : 'billing',
            'webhookUrl' => url('/stripe/webhook'),
            'paymentReturnUrls' => [
                'jazzcash' => route('payments.jazzcash.return'),
                'easypaisa' => route('payments.easypaisa.return'),
            ],
            'seo' => ['title' => 'Settings'],
        ]);
    }

    public function update(Request $request, SiteSettings $settings, string $group): RedirectResponse
    {
        Gate::authorize('manage-site-settings');
        abort_unless(array_key_exists($group, SiteSettings::GROUPS), 404);

        $validated = $request->validate($settings->rules($group), [
            'publishable_key.regex' => 'A publishable key starts with pk_live_ or pk_test_.',
            'secret_key.regex' => 'A secret key starts with sk_live_, sk_test_ or a restricted rk_ key.',
            'webhook_secret.regex' => 'A webhook signing secret starts with whsec_.',
            'price_monthly.regex' => 'A Stripe price ID starts with price_.',
            'price_yearly.regex' => 'A Stripe price ID starts with price_.',
            'merchant_id.regex' => 'The merchant ID has only letters and digits, e.g. MC12345.',
            'store_id.regex' => 'The store ID is a number.',
            'account_number.regex' => 'The account number has only digits.',
            'hash_key.size' => 'The Easypaisa hash key is exactly 16 characters.',
            'iban.regex' => 'A Pakistani IBAN looks like PK36SCBL0000001123456702 (24 characters, no spaces).',
        ]);

        $settings->save($group, $validated);

        return back()->with('status', SiteSettings::GROUPS[$group]['label'].' settings saved.');
    }

    /**
     * Send a test email to the signed-in admin with the current email settings.
     */
    public function testMail(Request $request): RedirectResponse
    {
        Gate::authorize('manage-site-settings');

        try {
            Mail::raw('This is a test email from '.config('app.name').'. Your email settings work.', function ($message) use ($request): void {
                $message->to($request->user()->email)->subject('Test email from '.config('app.name'));
            });
        } catch (Throwable $exception) {
            Log::warning('Test email failed', ['message' => $exception->getMessage()]);

            return back()->withErrors(['mail_test' => 'The test email could not be sent: '.$exception->getMessage()]);
        }

        return back()->with('status', config('mail.default') === 'log'
            ? 'Test email written to the log. Switch "Send email with" to SMTP to deliver real emails.'
            : 'Test email sent to '.$request->user()->email.'. Check your inbox (and spam).');
    }

    /**
     * Check the Stripe secret key and that both price IDs exist.
     */
    public function testStripe(): RedirectResponse
    {
        Gate::authorize('manage-site-settings');

        $secret = config('cashier.secret');

        if (blank($secret)) {
            return back()->withErrors(['stripe_test' => 'Add the Stripe secret key first.']);
        }

        try {
            $stripe = new StripeClient($secret);
            $account = $stripe->accounts->retrieve();
            $missing = collect(['monthly', 'yearly'])
                ->filter(fn (string $interval): bool => filled(config("billing.prices.{$interval}.stripe_price")))
                ->reject(function (string $interval) use ($stripe): bool {
                    try {
                        return (bool) $stripe->prices->retrieve(config("billing.prices.{$interval}.stripe_price"))->active;
                    } catch (Throwable) {
                        return false;
                    }
                })
                ->values();
        } catch (Throwable $exception) {
            return back()->withErrors(['stripe_test' => 'Stripe rejected the key: '.$exception->getMessage()]);
        }

        if ($missing->isNotEmpty()) {
            return back()->withErrors(['stripe_test' => 'Connected, but the '.$missing->implode(' and ').' price ID was not found or is not active in this Stripe account.']);
        }

        $name = $account->settings?->dashboard?->display_name ?? $account->email ?? $account->id;

        return back()->with('status', 'Stripe connected: '.$name.(str_starts_with($secret, 'sk_test_') ? ' (test mode).' : ' (live mode).'));
    }
}
