<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * Google AdSense settings from the admin panel: the publisher ID, whether ads are on, and the ad unit
 * IDs. Ads are never shown to Pro users, and pages decide where an ad slot may appear.
 */
class AdSense
{
    public const SETTINGS_KEY = 'adsense';

    /**
     * Google's certification authority ID, the fixed last field of every AdSense ads.txt line.
     */
    public const CERTIFICATION_ID = 'f08c47fec0942fa0';

    /**
     * Sources AdSense needs on top of the site's own Content Security Policy.
     *
     * @var array<string, array<int, string>>
     */
    protected const CSP_SOURCES = [
        'script-src' => ['https://pagead2.googlesyndication.com', 'https://*.googlesyndication.com', 'https://*.google.com', 'https://*.adtrafficquality.google', 'https://www.googletagservices.com', 'https://fundingchoicesmessages.google.com'],
        'img-src' => ['https:'],
        'frame-src' => ['https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com', 'https://*.googlesyndication.com', 'https://www.google.com', 'https://*.adtrafficquality.google', 'https://fundingchoicesmessages.google.com'],
        'connect-src' => ['https://pagead2.googlesyndication.com', 'https://*.googlesyndication.com', 'https://*.google.com', 'https://*.adtrafficquality.google', 'https://fundingchoicesmessages.google.com'],
    ];

    public function __construct(protected UsageQuota $quota) {}

    /**
     * @return array{enabled: bool, client: string, slot_in_article: string, slot_in_feed: string}
     */
    public function settings(): array
    {
        $saved = (array) Setting::get(self::SETTINGS_KEY, []);

        return [
            'enabled' => (bool) ($saved['enabled'] ?? false),
            'client' => (string) ($saved['client'] ?? ''),
            'slot_in_article' => (string) ($saved['slot_in_article'] ?? ''),
            'slot_in_feed' => (string) ($saved['slot_in_feed'] ?? ''),
        ];
    }

    /**
     * @param  array{enabled: bool, client?: string|null, slot_in_article?: string|null, slot_in_feed?: string|null}  $settings
     */
    public function save(array $settings): void
    {
        Setting::put(self::SETTINGS_KEY, [
            'enabled' => $settings['enabled'],
            'client' => trim((string) ($settings['client'] ?? '')),
            'slot_in_article' => trim((string) ($settings['slot_in_article'] ?? '')),
            'slot_in_feed' => trim((string) ($settings['slot_in_feed'] ?? '')),
        ]);
    }

    /**
     * "ca-pub-123" is the ad client; ads.txt and the verification tag use "pub-123".
     */
    public function publisherId(): ?string
    {
        $client = $this->settings()['client'];

        return $client === '' ? null : preg_replace('/^ca-/', '', $client);
    }

    /**
     * The line AdSense expects in /ads.txt, or null until a publisher ID is set.
     */
    public function adsTxt(): ?string
    {
        $publisherId = $this->publisherId();

        return $publisherId === null ? null : 'google.com, '.$publisherId.', DIRECT, '.self::CERTIFICATION_ID;
    }

    /**
     * Whether pages may load the AdSense script at all (for the CSP and the verification tag).
     */
    public function isActive(): bool
    {
        $settings = $this->settings();

        return $settings['enabled'] && $settings['client'] !== '';
    }

    /**
     * What the front end needs to render ad slots for this visitor, or null for no ads (off, or Pro).
     *
     * @return array{client: string, slots: array{in_article: string, in_feed: string}}|null
     */
    public function forVisitor(Request $request): ?array
    {
        if (! $this->isActive() || $this->quota->isPro($request->user())) {
            return null;
        }

        $settings = $this->settings();

        return [
            'client' => $settings['client'],
            'slots' => [
                'in_article' => $settings['slot_in_article'],
                'in_feed' => $settings['slot_in_feed'],
            ],
        ];
    }

    /**
     * The site's CSP with the AdSense sources added to each directive that needs them.
     */
    public function extendCsp(string $policy): string
    {
        $directives = collect(explode(';', $policy))
            ->map(fn (string $directive): string => trim($directive))
            ->filter()
            ->mapWithKeys(function (string $directive): array {
                $parts = preg_split('/\s+/', $directive);

                return [array_shift($parts) => $parts];
            });

        foreach (self::CSP_SOURCES as $name => $sources) {
            $directives[$name] = array_values(array_unique([...($directives[$name] ?? ["'self'"]), ...$sources]));
        }

        return $directives->map(fn (array $sources, string $name): string => trim($name.' '.implode(' ', $sources)))->implode('; ');
    }
}
