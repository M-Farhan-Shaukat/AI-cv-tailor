<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Settings an admin manages in the panel instead of .env: billing and plans, Stripe, email and the job
 * providers. Values are stored in the settings table (secrets encrypted with APP_KEY) and, when filled
 * in, override the matching config values on every request. Empty fields fall back to config defaults.
 */
class SiteSettings
{
    public const CACHE_KEY = 'site-settings:v1';

    /**
     * SMTP details for the providers in the Email tab, so the admin only enters an email and a key.
     * A null username means "use the email address".
     *
     * @var array<string, array{host: string, port: int, scheme: string|null, username: string|null}>
     */
    public const MAIL_PRESETS = [
        'gmail' => ['host' => 'smtp.gmail.com', 'port' => 587, 'scheme' => null, 'username' => null],
        'zoho' => ['host' => 'smtp.zoho.com', 'port' => 465, 'scheme' => 'smtps', 'username' => null],
        'sendgrid' => ['host' => 'smtp.sendgrid.net', 'port' => 587, 'scheme' => null, 'username' => 'apikey'],
        'resend' => ['host' => 'smtp.resend.com', 'port' => 465, 'scheme' => 'smtps', 'username' => 'resend'],
        'mailgun' => ['host' => 'smtp.mailgun.org', 'port' => 587, 'scheme' => null, 'username' => null],
    ];

    /**
     * Each group's fields: how they are edited and validated, and which config value they set.
     *
     * @var array<string, array{label: string, icon: string, description: string, fields: array<string, array<string, mixed>>}>
     */
    public const GROUPS = [
        'billing' => [
            'label' => 'Billing & plans',
            'icon' => 'bi-stars',
            'description' => 'Plan limits and Pro prices in Pakistani rupees. JazzCash, Easypaisa and bank transfers charge exactly these amounts; Stripe charges whatever its price IDs are set to.',
            'fields' => [
                'free_monthly_tailors' => ['label' => 'Free plan: tailored CVs per month', 'type' => 'integer', 'config' => 'billing.free_monthly_tailors', 'rules' => ['integer', 'min:0', 'max:1000'], 'help' => '0 means unlimited.'],
                'pro_monthly_tailors' => ['label' => 'Pro plan: fair-use limit per month', 'type' => 'integer', 'config' => 'billing.pro_monthly_tailors', 'rules' => ['integer', 'min:0', 'max:100000'], 'help' => '0 means unlimited.'],
                'free_visible_missing_keywords' => ['label' => 'Free plan: missing keywords shown', 'type' => 'integer', 'config' => 'billing.free_visible_missing_keywords', 'rules' => ['integer', 'min:0', 'max:50'], 'help' => 'The rest are blurred with a "Go Pro" note.'],
                'guest_limit_by_ip' => ['label' => 'Also count guests by IP address', 'type' => 'boolean', 'config' => 'billing.guest_limit_by_ip', 'rules' => ['boolean'], 'help' => 'Stops cookie clearing, but guests sharing an IP share the free CV.'],
                'pro_monthly_pkr' => ['label' => 'Pro monthly price (PKR)', 'type' => 'integer', 'config' => 'billing.prices.monthly.amount', 'rules' => ['integer', 'min:1', 'max:10000000'], 'placeholder' => '2799', 'help' => 'Whole rupees, e.g. 2799 for Rs 2,799.'],
                'pro_yearly_pkr' => ['label' => 'Pro yearly price (PKR)', 'type' => 'integer', 'config' => 'billing.prices.yearly.amount', 'rules' => ['integer', 'min:1', 'max:10000000'], 'placeholder' => '21999'],
                'pro_yearly_note' => ['label' => 'Yearly badge', 'type' => 'string', 'config' => 'billing.prices.yearly.note', 'rules' => ['string', 'max:30'], 'placeholder' => 'Save 35%'],
            ],
        ],
        'stripe' => [
            'label' => 'Stripe',
            'icon' => 'bi-credit-card',
            'description' => 'Card payments with auto-renewing subscriptions. Keys from the Stripe dashboard (Developers → API keys) and the Pro product\'s two price IDs, created in PKR. Webhook URL: /stripe/webhook.',
            'fields' => [
                'enabled' => ['label' => 'Offer card payments through Stripe', 'type' => 'boolean', 'config' => 'billing.channels.stripe.enabled', 'rules' => ['boolean'], 'help' => 'Shown only when a price ID is also set.'],
                'publishable_key' => ['label' => 'Publishable key', 'type' => 'string', 'config' => 'cashier.key', 'rules' => ['string', 'max:255', 'regex:/^pk_(test|live)_/'], 'placeholder' => 'pk_live_...'],
                'secret_key' => ['label' => 'Secret key', 'type' => 'secret', 'config' => 'cashier.secret', 'rules' => ['string', 'max:255', 'regex:/^(sk|rk)_(test|live)_/'], 'placeholder' => 'sk_live_...'],
                'webhook_secret' => ['label' => 'Webhook signing secret', 'type' => 'secret', 'config' => 'cashier.webhook.secret', 'rules' => ['string', 'max:255', 'regex:/^whsec_/'], 'placeholder' => 'whsec_...'],
                'currency' => ['label' => 'Currency', 'type' => 'string', 'config' => 'cashier.currency', 'rules' => ['string', 'size:3', 'alpha'], 'placeholder' => 'usd'],
                'price_monthly' => ['label' => 'Pro monthly price ID', 'type' => 'string', 'config' => 'billing.prices.monthly.stripe_price', 'rules' => ['string', 'max:255', 'regex:/^price_/'], 'placeholder' => 'price_...'],
                'price_yearly' => ['label' => 'Pro yearly price ID', 'type' => 'string', 'config' => 'billing.prices.yearly.stripe_price', 'rules' => ['string', 'max:255', 'regex:/^price_/'], 'placeholder' => 'price_...'],
            ],
        ],
        'jazzcash' => [
            'label' => 'JazzCash',
            'icon' => 'bi-phone',
            'description' => 'JazzCash hosted checkout (mobile wallet, card or voucher). Get the merchant ID, password and integrity salt from the JazzCash merchant portal. Payers come back to the return URL below.',
            'fields' => [
                'enabled' => ['label' => 'Offer JazzCash', 'type' => 'boolean', 'config' => 'billing.channels.jazzcash.enabled', 'rules' => ['boolean']],
                'mode' => ['label' => 'Environment', 'type' => 'select', 'config' => 'billing.channels.jazzcash.mode', 'default' => 'sandbox', 'options' => ['sandbox' => 'Sandbox (testing)', 'live' => 'Live'], 'rules' => ['in:sandbox,live']],
                'merchant_id' => ['label' => 'Merchant ID', 'type' => 'string', 'config' => 'billing.channels.jazzcash.merchant_id', 'rules' => ['string', 'max:50', 'regex:/^[A-Za-z0-9]+$/'], 'placeholder' => 'MC12345'],
                'password' => ['label' => 'Password', 'type' => 'secret', 'config' => 'billing.channels.jazzcash.password', 'rules' => ['string', 'max:100']],
                'integrity_salt' => ['label' => 'Integrity salt', 'type' => 'secret', 'config' => 'billing.channels.jazzcash.integrity_salt', 'rules' => ['string', 'max:100'], 'help' => 'Signs every request and checks every reply, so payments cannot be faked.'],
            ],
        ],
        'easypaisa' => [
            'label' => 'Easypaisa',
            'icon' => 'bi-wallet2',
            'description' => 'Easypaisa hosted checkout (mobile account, card or OTC). The store ID and hash key are in the Easypaisa merchant portal; the API username, password and account number let the site confirm each payment with Easypaisa before giving Pro.',
            'fields' => [
                'enabled' => ['label' => 'Offer Easypaisa', 'type' => 'boolean', 'config' => 'billing.channels.easypaisa.enabled', 'rules' => ['boolean']],
                'mode' => ['label' => 'Environment', 'type' => 'select', 'config' => 'billing.channels.easypaisa.mode', 'default' => 'sandbox', 'options' => ['sandbox' => 'Sandbox (testing)', 'live' => 'Live'], 'rules' => ['in:sandbox,live']],
                'store_id' => ['label' => 'Store ID', 'type' => 'string', 'config' => 'billing.channels.easypaisa.store_id', 'rules' => ['string', 'max:20', 'regex:/^[0-9]+$/'], 'placeholder' => '12345'],
                'hash_key' => ['label' => 'Hash key', 'type' => 'secret', 'config' => 'billing.channels.easypaisa.hash_key', 'rules' => ['string', 'size:16'], 'help' => 'The 16-character key from the merchant portal.'],
                'username' => ['label' => 'API username', 'type' => 'string', 'config' => 'billing.channels.easypaisa.username', 'rules' => ['string', 'max:100']],
                'password' => ['label' => 'API password', 'type' => 'secret', 'config' => 'billing.channels.easypaisa.password', 'rules' => ['string', 'max:100']],
                'account_number' => ['label' => 'Merchant account number', 'type' => 'string', 'config' => 'billing.channels.easypaisa.account_number', 'rules' => ['string', 'max:30', 'regex:/^[0-9]+$/']],
            ],
        ],
        'bank' => [
            'label' => 'Bank transfer',
            'icon' => 'bi-bank',
            'description' => 'Payers send the amount to your bank account and submit the transaction reference and a screenshot. Pro starts when an admin approves it under Payments.',
            'fields' => [
                'enabled' => ['label' => 'Offer bank transfer', 'type' => 'boolean', 'config' => 'billing.channels.bank_transfer.enabled', 'rules' => ['boolean']],
                'bank_name' => ['label' => 'Bank name', 'type' => 'string', 'config' => 'billing.channels.bank_transfer.bank_name', 'rules' => ['string', 'max:100'], 'placeholder' => 'Meezan Bank'],
                'account_title' => ['label' => 'Account title', 'type' => 'string', 'config' => 'billing.channels.bank_transfer.account_title', 'rules' => ['string', 'max:100']],
                'account_number' => ['label' => 'Account number', 'type' => 'string', 'config' => 'billing.channels.bank_transfer.account_number', 'rules' => ['string', 'max:40']],
                'iban' => ['label' => 'IBAN', 'type' => 'string', 'config' => 'billing.channels.bank_transfer.iban', 'rules' => ['string', 'max:34', 'regex:/^PK\d{2}[A-Z]{4}[0-9A-Z]{16}$/'], 'placeholder' => 'PK36SCBL0000001123456702'],
                'instructions' => ['label' => 'Extra instructions', 'type' => 'text', 'config' => 'billing.channels.bank_transfer.instructions', 'rules' => ['string', 'max:1000'], 'help' => 'Optional, e.g. "Raast ID 03001234567 also works".'],
            ],
        ],
        'mail' => [
            'label' => 'Email',
            'icon' => 'bi-envelope',
            'description' => 'How the site sends email: password resets, job alerts and contact form messages. Pick your provider, then add your email and key.',
            'fields' => [
                'provider' => ['label' => 'Email provider', 'type' => 'select', 'config' => null, 'default' => 'gmail', 'options' => [
                    'gmail' => 'Gmail / Google Workspace',
                    'zoho' => 'Zoho Mail',
                    'sendgrid' => 'SendGrid',
                    'resend' => 'Resend',
                    'mailgun' => 'Mailgun',
                    'custom' => 'Other (custom SMTP)',
                    'log' => 'Don\'t send (write to the log)',
                ], 'option_help' => [
                    'gmail' => 'Key = a 16-character app password from myaccount.google.com/apppasswords (needs 2-step verification). Not your normal Gmail password.',
                    'zoho' => 'Key = your Zoho Mail password, or an app-specific password if two-factor login is on.',
                    'sendgrid' => 'Key = a SendGrid API key with "Mail Send" permission. Email = a verified sender address.',
                    'resend' => 'Key = a Resend API key. Email = an address on a domain you verified in Resend.',
                    'mailgun' => 'Key = the SMTP password for the address. Email = that SMTP login, e.g. postmaster@mg.yourdomain.com.',
                    'custom' => 'Enter your provider\'s SMTP server details below.',
                    'log' => 'Emails are written to storage/logs/laravel.log instead of being sent. Useful for testing.',
                ], 'rules' => ['in:gmail,zoho,sendgrid,resend,mailgun,custom,log']],
                'email' => ['label' => 'Email address', 'type' => 'string', 'config' => null, 'rules' => ['email', 'max:255', 'required_if:provider,gmail,zoho,sendgrid,resend,mailgun'], 'placeholder' => 'you@gmail.com', 'help' => 'Emails are sent from this address. Also shown as the contact email on the legal pages.', 'show_when' => ['provider' => ['gmail', 'zoho', 'sendgrid', 'resend', 'mailgun']]],
                'password' => ['label' => 'Key (app password or API key)', 'type' => 'secret', 'config' => 'mail.mailers.smtp.password', 'rules' => ['string', 'max:255'], 'show_when' => ['provider' => ['gmail', 'zoho', 'sendgrid', 'resend', 'mailgun', 'custom']]],
                'from_name' => ['label' => 'Sender name', 'type' => 'string', 'config' => 'mail.from.name', 'rules' => ['string', 'max:100'], 'placeholder' => 'ResumeTailor AI', 'show_when' => ['provider' => ['gmail', 'zoho', 'sendgrid', 'resend', 'mailgun', 'custom']]],
                'host' => ['label' => 'SMTP host', 'type' => 'string', 'config' => 'mail.mailers.smtp.host', 'rules' => ['string', 'max:255'], 'placeholder' => 'smtp.example.com', 'show_when' => ['provider' => ['custom']]],
                'port' => ['label' => 'SMTP port', 'type' => 'integer', 'config' => 'mail.mailers.smtp.port', 'rules' => ['integer', 'min:1', 'max:65535'], 'placeholder' => '587', 'show_when' => ['provider' => ['custom']]],
                'scheme' => ['label' => 'Encryption', 'type' => 'select', 'options' => ['' => 'STARTTLS (port 587)', 'smtps' => 'SSL/TLS (port 465)'], 'config' => 'mail.mailers.smtp.scheme', 'rules' => ['in:,smtps'], 'show_when' => ['provider' => ['custom']]],
                'username' => ['label' => 'SMTP username', 'type' => 'string', 'config' => 'mail.mailers.smtp.username', 'rules' => ['string', 'max:255'], 'show_when' => ['provider' => ['custom']]],
                'from_address' => ['label' => 'From address', 'type' => 'string', 'config' => 'mail.from.address', 'rules' => ['email', 'max:255'], 'show_when' => ['provider' => ['custom']]],
                'mailer' => ['label' => 'Send email with', 'type' => 'select', 'options' => ['smtp' => 'SMTP server', 'log' => 'Log file only (testing)'], 'config' => 'mail.default', 'rules' => ['in:smtp,log'], 'show_when' => ['provider' => ['custom']]],
            ],
        ],
        'ai' => [
            'label' => 'AI model',
            'icon' => 'bi-cpu',
            'description' => 'Which Groq model rewrites and analyses CVs. The defaults work well; change them only if you know what you need. API keys are under AI keys.',
            'fields' => [
                'model' => ['label' => 'Model', 'type' => 'string', 'config' => 'services.groq.model', 'default' => 'openai/gpt-oss-120b', 'locked' => true, 'rules' => ['string', 'max:100', 'regex:/^[A-Za-z0-9._\/:-]+$/'], 'suggestions' => ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b'], 'help' => 'Must support JSON output. Groq rate limits differ per model.'],
                'api_url' => ['label' => 'API URL', 'type' => 'string', 'config' => 'services.groq.url', 'default' => 'https://api.groq.com/openai/v1/chat/completions', 'locked' => true, 'rules' => ['url:https', 'max:255', 'ends_with:/chat/completions'], 'help' => 'Groq\'s OpenAI-compatible chat completions endpoint.'],
                'reasoning_effort' => ['label' => 'Reasoning effort', 'type' => 'select', 'config' => 'services.groq.reasoning_effort', 'default' => 'medium', 'locked' => true, 'options' => ['low' => 'Low (fastest, fewest tokens)', 'medium' => 'Medium (recommended)', 'high' => 'High (slowest, most tokens)'], 'rules' => ['in:low,medium,high'], 'help' => 'Used by gpt-oss models only. Higher effort uses more of the per-minute token limit.'],
            ],
        ],
        'jobs' => [
            'label' => 'Job providers',
            'icon' => 'bi-broadcast',
            'description' => 'API keys for the job feeds. Remotive needs no key. Search terms and auto-sync are under Job feeds.',
            'fields' => [
                'adzuna_app_id' => ['label' => 'Adzuna application ID', 'type' => 'string', 'config' => 'services.adzuna.app_id', 'rules' => ['string', 'max:100'], 'help' => 'Free at developer.adzuna.com.'],
                'adzuna_app_key' => ['label' => 'Adzuna application key', 'type' => 'secret', 'config' => 'services.adzuna.app_key', 'rules' => ['string', 'max:255']],
                'adzuna_country' => ['label' => 'Adzuna country', 'type' => 'string', 'config' => 'services.adzuna.country', 'rules' => ['string', 'size:2', 'alpha'], 'placeholder' => 'gb', 'help' => 'Two-letter code, e.g. gb, us, in. Adzuna does not cover Pakistan.'],
                'jooble_key' => ['label' => 'Jooble API key', 'type' => 'secret', 'config' => 'services.jooble.key', 'rules' => ['string', 'max:255'], 'help' => 'Free at jooble.org/api/about.'],
            ],
        ],
    ];

    /**
     * Put every saved value into config. Runs at boot; does nothing until the settings table exists.
     */
    public function apply(): void
    {
        try {
            $stored = $this->stored();
        } catch (Throwable) {
            return;
        }

        foreach (self::GROUPS as $group => $definition) {
            foreach ($definition['fields'] as $field => $meta) {
                $value = $stored[$group][$field] ?? null;

                if ($value === null || $value === '' || $meta['config'] === null) {
                    continue;
                }

                if ($meta['type'] === 'secret') {
                    $value = $this->decrypt($value);

                    if ($value === null) {
                        continue;
                    }
                }

                config([$meta['config'] => $this->cast($meta['type'], $value)]);
            }
        }

        $this->applyMailProvider((array) ($stored['mail'] ?? []));
    }

    /**
     * For a preset provider, fill in the SMTP server details and use the email address as the sender
     * (and as the login where the provider expects it).
     *
     * @param  array<string, mixed>  $mail
     */
    protected function applyMailProvider(array $mail): void
    {
        $provider = $mail['provider'] ?? null;

        if ($provider === 'log') {
            config(['mail.default' => 'log']);

            return;
        }

        $preset = self::MAIL_PRESETS[$provider] ?? null;

        if ($preset === null) {
            return;
        }

        $email = (string) ($mail['email'] ?? '');

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $preset['host'],
            'mail.mailers.smtp.port' => $preset['port'],
            'mail.mailers.smtp.scheme' => $preset['scheme'],
            'mail.mailers.smtp.username' => $preset['username'] ?? $email,
        ]);

        if ($email !== '') {
            config(['mail.from.address' => $email]);
        }
    }

    /**
     * Groups, fields and current values for the settings page. Secrets are never included: only
     * whether one is set and its last four characters.
     *
     * @return array<string, array<string, mixed>>
     */
    public function forAdmin(): array
    {
        $stored = $this->stored();

        return collect(self::GROUPS)->map(fn (array $definition, string $group): array => [
            'label' => $definition['label'],
            'icon' => $definition['icon'],
            'description' => $definition['description'],
            'fields' => collect($definition['fields'])->map(function (array $meta, string $field) use ($stored, $group): array {
                $saved = $stored[$group][$field] ?? null;
                $base = [
                    'label' => $meta['label'],
                    'type' => $meta['type'],
                    'help' => $meta['help'] ?? null,
                    'placeholder' => $meta['placeholder'] ?? null,
                    'options' => $meta['options'] ?? null,
                    'option_help' => $meta['option_help'] ?? null,
                    'show_when' => $meta['show_when'] ?? null,
                    'default' => $meta['default'] ?? null,
                    'locked' => $meta['locked'] ?? false,
                    'suggestions' => $meta['suggestions'] ?? null,
                ];

                if ($meta['type'] === 'secret') {
                    $secret = filled($saved) ? $this->decrypt($saved) : null;
                    $fallback = filled($secret) ? null : config($meta['config']);

                    return [...$base, 'value' => '', 'is_set' => filled($secret) || filled($fallback), 'hint' => filled($secret) ? '…'.substr($secret, -4) : (filled($fallback) ? 'set in .env' : null)];
                }

                $value = $meta['config'] === null
                    ? ($saved ?? $meta['default'] ?? ($field === 'email' ? config('mail.from.address') : ''))
                    : (config($meta['config']) ?: ($meta['default'] ?? null));

                return [...$base, 'value' => $value ?? '', 'from_panel' => filled($saved) || $saved === false || $saved === 0];
            })->all(),
        ])->all();
    }

    /**
     * Validation rules for one group. Every field is optional: empty keeps the default.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(string $group): array
    {
        return collect(self::GROUPS[$group]['fields'])
            ->mapWithKeys(fn (array $meta, string $field): array => [$field => ['nullable', ...$meta['rules']]])
            ->put('clear', ['nullable', 'array'])
            ->all();
    }

    /**
     * Save one group. Empty secret fields keep the saved secret unless listed in "clear".
     *
     * @param  array<string, mixed>  $input
     */
    public function save(string $group, array $input): void
    {
        $current = (array) Setting::get($this->key($group), []);
        $clear = (array) ($input['clear'] ?? []);

        foreach (self::GROUPS[$group]['fields'] as $field => $meta) {
            if (! array_key_exists($field, $input) && ! in_array($field, $clear, true)) {
                continue;
            }

            $value = $input[$field] ?? null;

            if ($meta['type'] === 'secret') {
                if (in_array($field, $clear, true)) {
                    unset($current[$field]);
                } elseif (filled($value)) {
                    $current[$field] = Crypt::encryptString(trim((string) $value));
                }

                continue;
            }

            if ($value === null || $value === '') {
                unset($current[$field]);
            } else {
                $current[$field] = $this->cast($meta['type'], is_string($value) ? trim($value) : $value);
            }
        }

        Setting::put($this->key($group), $current);
        Cache::forget(self::CACHE_KEY);
        $this->apply();
    }

    /**
     * Every saved value with secrets decrypted, for moving the setup to another installation
     * (php artisan app:export-setup). Only ever written to a private file, never shown in the panel.
     *
     * @return array<string, array<string, mixed>>
     */
    public function export(): array
    {
        Cache::forget(self::CACHE_KEY);

        return collect($this->stored())
            ->map(fn (array $values, string $group): array => collect($values)
                ->map(fn (mixed $value, string $field): mixed => (self::GROUPS[$group]['fields'][$field]['type'] ?? null) === 'secret' ? $this->decrypt($value) : $value)
                ->reject(fn (mixed $value): bool => $value === null)
                ->all())
            ->filter(fn (array $values, string $group): bool => $values !== [] && isset(self::GROUPS[$group]))
            ->all();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    protected function stored(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn (): array => Setting::query()
            ->whereIn('key', array_map(fn (string $group): string => $this->key($group), array_keys(self::GROUPS)))
            ->get()
            ->mapWithKeys(fn (Setting $setting): array => [substr($setting->key, strlen('site.')) => (array) $setting->value])
            ->all());
    }

    protected function key(string $group): string
    {
        return 'site.'.$group;
    }

    protected function cast(string $type, mixed $value): mixed
    {
        return match ($type) {
            'integer' => (int) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            default => (string) $value,
        };
    }

    protected function decrypt(mixed $value): ?string
    {
        try {
            return Crypt::decryptString((string) $value);
        } catch (DecryptException) {
            Log::warning('A saved secret setting could not be decrypted; APP_KEY may have changed. Enter it again in Admin → Settings.');

            return null;
        }
    }
}
