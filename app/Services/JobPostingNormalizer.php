<?php

namespace App\Services;

use App\Services\JobSources\JobPostingData;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Throwable;

/**
 * Cleans provider data and builds the provider-independent fingerprint used for deduplication.
 */
class JobPostingNormalizer
{
    /**
     * Legal suffixes that differ between providers for the same employer.
     */
    protected const COMPANY_SUFFIXES = ['inc', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'gmbh', 'plc', 'co', 'company'];

    /**
     * Collapse a single-line field into plain text with no markup or control characters.
     */
    public function text(?string $value, int $maxLength = 255): string
    {
        $value = $this->description($value, $maxLength);

        return trim(preg_replace('/\s+/u', ' ', $value));
    }

    /**
     * Convert provider HTML into readable plain text while keeping paragraph breaks.
     */
    public function description(?string $value, int $maxLength = 100000): string
    {
        $value = (string) $value;
        $value = preg_replace('/<(script|style)\b[^>]*>.*?<\/\1>/is', '', $value);
        $value = preg_replace('/<(br\s*\/?|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/i', "\n", $value);
        $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
        $value = preg_replace('/[ \t\x{00A0}]+/u', ' ', $value);
        $value = preg_replace('/\n{3,}/u', "\n\n", $value);

        return Str::limit(trim($value), $maxLength, '');
    }

    /**
     * Keep only absolute, valid application URLs.
     */
    public function url(?string $value, int $maxLength = 2000): string
    {
        $url = trim((string) $value);

        if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
            return '';
        }

        return Str::limit($url, $maxLength, '');
    }

    /**
     * Stable key used to collapse the same posting returned by different providers.
     */
    public function fingerprint(JobPostingData $posting): string
    {
        $parts = [
            $this->fingerprintPart($posting->title),
            $this->companyPart($posting->company),
            $this->fingerprintPart($posting->location),
        ];

        // Without an employer name, title + location is not distinctive enough to merge across providers.
        if ($parts[1] === '') {
            $parts[] = $this->fingerprintPart($posting->provider.'-'.$posting->externalId);
        }

        return hash('sha256', implode('|', $parts));
    }

    /**
     * Detect remote roles from location, title or description text.
     */
    public function looksRemote(?string ...$values): bool
    {
        $haystack = mb_strtolower(implode(' ', array_filter($values)));

        return (bool) preg_match('/\b(remote|work from home|wfh|anywhere)\b/u', $haystack);
    }

    /**
     * Parse the many date formats providers return, ignoring unparseable values.
     */
    public function date(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($value);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Coerce provider salary values into positive whole numbers.
     */
    public function integer(mixed $value): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        $number = (int) round((float) $value);

        return $number > 0 ? $number : null;
    }

    /**
     * Infer the salary currency from the provider's country code.
     */
    public function currencyForCountry(string $country): string
    {
        return match (mb_strtolower($country)) {
            'gb', 'uk' => 'GBP',
            'us' => 'USD',
            'ca' => 'CAD',
            'au' => 'AUD',
            'in' => 'INR',
            'sg' => 'SGD',
            'nz' => 'NZD',
            default => 'EUR',
        };
    }

    protected function fingerprintPart(?string $value): string
    {
        $value = mb_strtolower((string) $value);
        $value = preg_replace('/[^a-z0-9]+/u', ' ', $value);

        return trim(preg_replace('/\s+/', ' ', $value));
    }

    protected function companyPart(?string $value): string
    {
        $value = $this->fingerprintPart($value);

        if ($value === '') {
            return '';
        }

        $words = explode(' ', $value);

        while ($words !== [] && in_array(end($words), self::COMPANY_SUFFIXES, true)) {
            array_pop($words);
        }

        return implode(' ', $words);
    }
}
