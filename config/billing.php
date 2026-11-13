<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Plans
    |--------------------------------------------------------------------------
    |
    | Two plans: Free and Pro. A limit of 0 means unlimited. Tailored CVs are
    | counted per calendar month; refinements and design changes of an
    | existing CV are not counted. Scans are free and unlimited for everyone.
    |
    */

    'free_monthly_tailors' => (int) env('BILLING_FREE_MONTHLY_TAILORS', 1),

    // Fair-use cap for Pro, so one account cannot exhaust the AI budget. 0 = unlimited.
    'pro_monthly_tailors' => (int) env('BILLING_PRO_MONTHLY_TAILORS', 200),

    // Guests are counted by browser session. With this on, they are also counted by IP address,
    // which stops cookie clearing but can block guests who share an IP (offices, mobile networks).
    'guest_limit_by_ip' => (bool) env('BILLING_GUEST_LIMIT_BY_IP', true),

    // Missing job keywords a Free user can see (most important first). Pro sees all of them. The rest
    // are removed on the server, so they are not in the page or the network response.
    'free_visible_missing_keywords' => (int) env('BILLING_FREE_VISIBLE_MISSING_KEYWORDS', 3),

    // Templates available on the Free plan. Every other template needs Pro.
    'free_templates' => ['original', 'modern', 'classic', 'minimal'],

    /*
    |--------------------------------------------------------------------------
    | Prices (Pakistani rupees)
    |--------------------------------------------------------------------------
    |
    | Pro costs these whole-rupee amounts. JazzCash, Easypaisa and bank
    | transfers charge exactly this amount, once, for one month or one year
    | (no auto-renewal). Stripe charges whatever its price ID is set to, so
    | create PKR prices in Stripe with the same amounts.
    |
    */

    'currency' => 'PKR',

    'subscription_type' => 'default',

    'prices' => [
        'monthly' => [
            'stripe_price' => env('STRIPE_PRICE_PRO_MONTHLY'),
            'amount' => (int) env('BILLING_PRO_MONTHLY_PKR', 2799),
            'period' => 'month',
            'note' => null,
        ],
        'yearly' => [
            'stripe_price' => env('STRIPE_PRICE_PRO_YEARLY'),
            'amount' => (int) env('BILLING_PRO_YEARLY_PKR', 21999),
            'period' => 'year',
            'note' => env('BILLING_PRO_YEARLY_NOTE', 'Save 35%'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment channels
    |--------------------------------------------------------------------------
    |
    | Each channel is switched on and set up in Admin → Settings. A channel is
    | offered only when it is enabled and has the details it needs. "mode"
    | picks the gateway's sandbox or live URLs below.
    |
    */

    'channels' => [
        'stripe' => [
            'enabled' => (bool) env('BILLING_STRIPE_ENABLED', true),
        ],

        'jazzcash' => [
            'enabled' => (bool) env('JAZZCASH_ENABLED', false),
            'mode' => env('JAZZCASH_MODE', 'sandbox'),
            'merchant_id' => env('JAZZCASH_MERCHANT_ID'),
            'password' => env('JAZZCASH_PASSWORD'),
            'integrity_salt' => env('JAZZCASH_INTEGRITY_SALT'),
            'urls' => [
                'sandbox' => 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
                'live' => 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
            ],
        ],

        'easypaisa' => [
            'enabled' => (bool) env('EASYPAISA_ENABLED', false),
            'mode' => env('EASYPAISA_MODE', 'sandbox'),
            'store_id' => env('EASYPAISA_STORE_ID'),
            'hash_key' => env('EASYPAISA_HASH_KEY'),
            // API credentials from the Easypaisa merchant portal, used to confirm each payment with
            // Easypaisa before Pro is given, since the browser redirect alone can be faked.
            'username' => env('EASYPAISA_USERNAME'),
            'password' => env('EASYPAISA_PASSWORD'),
            'account_number' => env('EASYPAISA_ACCOUNT_NUMBER'),
            'urls' => [
                'sandbox' => [
                    'checkout' => 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf',
                    'confirm' => 'https://easypaystg.easypaisa.com.pk/easypay/Confirm.jsf',
                    'inquire' => 'https://easypaystg.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction',
                ],
                'live' => [
                    'checkout' => 'https://easypay.easypaisa.com.pk/easypay/Index.jsf',
                    'confirm' => 'https://easypay.easypaisa.com.pk/easypay/Confirm.jsf',
                    'inquire' => 'https://easypay.easypaisa.com.pk/easypay-service/rest/v4/inquire-transaction',
                ],
            ],
        ],

        'bank_transfer' => [
            'enabled' => (bool) env('BANK_TRANSFER_ENABLED', false),
            'bank_name' => env('BANK_TRANSFER_BANK_NAME'),
            'account_title' => env('BANK_TRANSFER_ACCOUNT_TITLE'),
            'account_number' => env('BANK_TRANSFER_ACCOUNT_NUMBER'),
            'iban' => env('BANK_TRANSFER_IBAN'),
            'instructions' => env('BANK_TRANSFER_INSTRUCTIONS'),
        ],
    ],

];
