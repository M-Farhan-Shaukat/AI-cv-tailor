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
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Where JazzCash and Easypaisa send the payer back. These requests come from the gateway's site, so
 * they run without the session (a cross-site POST does not carry the login cookie, and starting a
 * new session here would sign the payer out). Nothing in them is trusted until it is verified: the
 * JazzCash signature, or Easypaisa's inquiry API. The payer then lands on their payment page.
 */
class PaymentCallbackController extends Controller
{
    public function jazzCash(Request $request, JazzCashGateway $jazzCash, LocalPayments $payments): RedirectResponse
    {
        $reply = Arr::where($request->all(), fn (mixed $value): bool => is_scalar($value));

        if (! $jazzCash->verify($reply)) {
            Log::warning('JazzCash reply with an invalid signature', ['reference' => $reply['pp_TxnRefNo'] ?? null]);

            return to_route('pricing', ['payment' => 'invalid']);
        }

        $payment = Payment::query()
            ->where('channel', PaymentChannel::JazzCash)
            ->where('reference', (string) ($reply['pp_TxnRefNo'] ?? ''))
            ->first();

        if ($payment === null) {
            return to_route('pricing', ['payment' => 'invalid']);
        }

        $outcome = (string) ($reply['pp_Amount'] ?? '') === (string) ($payment->amount * 100) ? $jazzCash->outcome($reply) : 'failed';
        $stored = Arr::except($reply, ['pp_Password', 'pp_SecureHash']);

        match ($outcome) {
            'paid' => $payments->markPaid($payment, (string) ($reply['pp_RetreivalReferenceNo'] ?? $reply['pp_TxnRefNo']), $stored),
            'failed' => $payments->close($payment, PaymentStatus::Failed, $stored),
            default => $payment->status === PaymentStatus::Pending ? $payment->forceFill(['gateway_response' => $stored])->save() : null,
        };

        return to_route('billing.payments.show', $payment);
    }

    /**
     * Easypaisa returns here twice: first with an auth_token, which is posted to its Confirm page, and
     * then with the result, which is checked with Easypaisa's inquiry API.
     */
    public function easypaisa(Request $request, EasypaisaGateway $easypaisa, LocalPayments $payments): Response
    {
        $authToken = $request->input('auth_token');

        if (is_string($authToken) && $authToken !== '') {
            return response()->view('payments.redirect', [
                'gateway' => 'Easypaisa',
                'amount' => 'your payment',
                'action' => $easypaisa->url('confirm'),
                'fields' => $easypaisa->confirmFields($authToken, route('payments.easypaisa.return')),
            ])->header('Cache-Control', 'no-store');
        }

        $payment = Payment::query()
            ->where('channel', PaymentChannel::Easypaisa)
            ->where('reference', (string) $request->input('orderRefNumber', $request->input('orderRefNum', '')))
            ->first();

        if ($payment === null) {
            return to_route('pricing', ['payment' => 'invalid']);
        }

        if ($payment->status === PaymentStatus::Pending) {
            $payments->confirmWithEasypaisa($payment);
        }

        return to_route('billing.payments.show', $payment);
    }
}
