<?php

namespace App\Services\Payments;

use App\Models\Payment;

/**
 * JazzCash hosted checkout ("Page Redirection", API version 1.1). The browser posts a signed form to
 * JazzCash; after paying, JazzCash posts the result back to the return URL, signed the same way.
 *
 * The signature (pp_SecureHash) is an uppercase HMAC-SHA256, keyed with the integrity salt, of the
 * integrity salt followed by every non-empty pp* field value, sorted by field name and joined with "&".
 */
class JazzCashGateway
{
    public const VERSION = '1.1';

    public const SUCCESS = '000';

    /**
     * Voucher (OTC) payments: the order is placed and is paid later at a shop.
     *
     * @var array<int, string>
     */
    public const PENDING = ['124', '157'];

    public function isConfigured(): bool
    {
        return filled(config('billing.channels.jazzcash.merchant_id'))
            && filled(config('billing.channels.jazzcash.password'))
            && filled(config('billing.channels.jazzcash.integrity_salt'));
    }

    public function checkoutUrl(): string
    {
        $mode = config('billing.channels.jazzcash.mode') === 'live' ? 'live' : 'sandbox';

        return (string) config("billing.channels.jazzcash.urls.{$mode}");
    }

    /**
     * The signed form fields that send the payer to JazzCash.
     *
     * @return array<string, string>
     */
    public function checkoutFields(Payment $payment, string $returnUrl): array
    {
        $now = now('Asia/Karachi');

        $fields = [
            'pp_Version' => self::VERSION,
            'pp_TxnType' => '',
            'pp_Language' => 'EN',
            'pp_MerchantID' => (string) config('billing.channels.jazzcash.merchant_id'),
            'pp_SubMerchantID' => '',
            'pp_Password' => (string) config('billing.channels.jazzcash.password'),
            'pp_BankID' => '',
            'pp_ProductID' => '',
            'pp_TxnRefNo' => $payment->reference,
            'pp_Amount' => (string) ($payment->amount * 100),
            'pp_TxnCurrency' => 'PKR',
            'pp_TxnDateTime' => $now->format('YmdHis'),
            'pp_BillReference' => 'pro'.$payment->id,
            'pp_Description' => 'Pro plan '.$payment->interval,
            'pp_TxnExpiryDateTime' => $now->copy()->addDay()->format('YmdHis'),
            'pp_ReturnURL' => $returnUrl,
            'ppmpf_1' => '',
            'ppmpf_2' => '',
            'ppmpf_3' => '',
            'ppmpf_4' => '',
            'ppmpf_5' => '',
        ];

        $fields['pp_SecureHash'] = $this->secureHash($fields);

        return $fields;
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    public function secureHash(array $fields): string
    {
        $salt = (string) config('billing.channels.jazzcash.integrity_salt');

        $values = collect($fields)
            ->filter(fn (mixed $value, string $key): bool => str_starts_with($key, 'pp') && $key !== 'pp_SecureHash' && is_scalar($value) && (string) $value !== '')
            ->sortKeys()
            ->map(fn (mixed $value): string => (string) $value)
            ->implode('&');

        return strtoupper(hash_hmac('sha256', $salt.'&'.$values, $salt));
    }

    /**
     * Whether the reply really came from JazzCash, for this merchant.
     *
     * @param  array<string, mixed>  $reply
     */
    public function verify(array $reply): bool
    {
        $hash = $reply['pp_SecureHash'] ?? null;

        return $this->isConfigured()
            && is_string($hash)
            && $hash !== ''
            && hash_equals($this->secureHash($reply), strtoupper($hash))
            && (string) ($reply['pp_MerchantID'] ?? '') === (string) config('billing.channels.jazzcash.merchant_id');
    }

    /**
     * "paid", "pending" or "failed" for a verified reply.
     *
     * @param  array<string, mixed>  $reply
     */
    public function outcome(array $reply): string
    {
        $code = (string) ($reply['pp_ResponseCode'] ?? '');

        return match (true) {
            $code === self::SUCCESS => 'paid',
            in_array($code, self::PENDING, true) => 'pending',
            default => 'failed',
        };
    }
}
