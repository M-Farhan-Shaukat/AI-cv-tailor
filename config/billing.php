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
    | Stripe
    |--------------------------------------------------------------------------
    |
    | Create one "Pro" product with a monthly and a yearly recurring price in
    | the Stripe dashboard and put the price IDs here. The amounts are only
    | displayed; Stripe charges whatever the price ID is set to.
    |
    */

    'subscription_type' => 'default',

    'prices' => [
        'monthly' => [
            'stripe_price' => env('STRIPE_PRICE_PRO_MONTHLY'),
            'amount' => env('BILLING_PRO_MONTHLY_AMOUNT', '$9.99'),
            'period' => 'month',
            'note' => null,
        ],
        'yearly' => [
            'stripe_price' => env('STRIPE_PRICE_PRO_YEARLY'),
            'amount' => env('BILLING_PRO_YEARLY_AMOUNT', '$79'),
            'period' => 'year',
            'note' => env('BILLING_PRO_YEARLY_NOTE', 'Save 34%'),
        ],
    ],

];
