<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Easypaisa hosted checkout. The browser posts a form to Easypaisa's Index page, signed with
 * merchantHashedReq: the sorted "name=value&..." request encrypted with AES-128-ECB using the store's
 * hash key, base64 encoded. Easypaisa sends the payer back with an auth_token, which is posted to the
 * Confirm page; Easypaisa then sends the payer back again with the result.
 *
 * That last redirect is not signed, so it is never trusted on its own: every payment is confirmed
 * with Easypaisa's transaction inquiry API before Pro is given.
 */
class EasypaisaGateway
{
    public const PAID = 'PAID';

    /**
     * @var array<int, string>
     */
    public const FAILED = ['FAILED', 'REVERSED', 'EXPIRED', 'DROPPED'];

    public function isConfigured(): bool
    {
        return filled(config('billing.channels.easypaisa.store_id'))
            && strlen((string) config('billing.channels.easypaisa.hash_key')) === 16
            && filled(config('billing.channels.easypaisa.username'))
            && filled(config('billing.channels.easypaisa.password'))
            && filled(config('billing.channels.easypaisa.account_number'));
    }

    public function url(string $name): string
    {
        $mode = config('billing.channels.easypaisa.mode') === 'live' ? 'live' : 'sandbox';

        return (string) config("billing.channels.easypaisa.urls.{$mode}.{$name}");
    }

    /**
     * The signed form fields that send the payer to Easypaisa.
     *
     * @return array<string, string>
     */
    public function checkoutFields(Payment $payment, string $postBackUrl, string $email): array
    {
        $fields = [
            'amount' => number_format($payment->amount, 1, '.', ''),
            'autoRedirect' => '1',
            'emailAddr' => $email,
            'expiryDate' => now('Asia/Karachi')->addDay()->format('Ymd His'),
            'orderRefNum' => $payment->reference,
            'postBackURL' => $postBackUrl,
            'storeId' => (string) config('billing.channels.easypaisa.store_id'),
        ];

        $fields['merchantHashedReq'] = $this->hashRequest($fields);

        return $fields;
    }

    /**
     * The form that confirms the payment after Easypaisa returns the payer with an auth_token.
     *
     * @return array<string, string>
     */
    public function confirmFields(string $authToken, string $postBackUrl): array
    {
        return ['auth_token' => $authToken, 'postBackURL' => $postBackUrl];
    }

    /**
     * @param  array<string, string>  $fields
     */
    public function hashRequest(array $fields): string
    {
        ksort($fields);

        $request = collect($fields)
            ->filter(fn (string $value): bool => $value !== '')
            ->map(fn (string $value, string $key): string => "{$key}={$value}")
            ->implode('&');

        $encrypted = openssl_encrypt($request, 'AES-128-ECB', (string) config('billing.channels.easypaisa.hash_key'), OPENSSL_RAW_DATA);

        return base64_encode((string) $encrypted);
    }

    /**
     * Ask Easypaisa what happened to the payment: "paid", "failed", or null while it is still open or
     * Easypaisa cannot be reached. Paid also requires the amount to match.
     *
     * @return array{outcome: string|null, transaction_id: string|null, response: array<string, mixed>}
     */
    public function inquire(Payment $payment): array
    {
        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['Credentials' => base64_encode(config('billing.channels.easypaisa.username').':'.config('billing.channels.easypaisa.password'))])
                ->post($this->url('inquire'), [
                    'orderId' => $payment->reference,
                    'storeId' => (string) config('billing.channels.easypaisa.store_id'),
                    'accountNum' => (string) config('billing.channels.easypaisa.account_number'),
                ]);
        } catch (Throwable $exception) {
            Log::warning('Easypaisa inquiry failed', ['payment' => $payment->reference, 'message' => $exception->getMessage()]);

            return ['outcome' => null, 'transaction_id' => null, 'response' => []];
        }

        $body = (array) $response->json();
        $status = strtoupper((string) ($body['transactionStatus'] ?? ''));
        $isSuccessfulReply = $response->successful() && ($body['responseCode'] ?? null) === '0000';
        $amountMatches = isset($body['transactionAmount']) && abs((float) $body['transactionAmount'] - $payment->amount) < 0.01;

        $outcome = match (true) {
            $isSuccessfulReply && $status === self::PAID && $amountMatches => 'paid',
            $isSuccessfulReply && in_array($status, self::FAILED, true) => 'failed',
            default => null,
        };

        if ($isSuccessfulReply && $status === self::PAID && ! $amountMatches) {
            Log::warning('Easypaisa reported a different amount', ['payment' => $payment->reference, 'amount' => $body['transactionAmount'] ?? null]);
        }

        return [
            'outcome' => $outcome,
            'transaction_id' => isset($body['transactionId']) ? (string) $body['transactionId'] : null,
            'response' => $body,
        ];
    }
}
