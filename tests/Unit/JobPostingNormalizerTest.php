<?php

namespace Tests\Unit;

use App\Services\JobPostingNormalizer;
use App\Services\JobSources\JobPostingData;
use PHPUnit\Framework\TestCase;

class JobPostingNormalizerTest extends TestCase
{
    protected JobPostingNormalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->normalizer = new JobPostingNormalizer;
    }

    public function test_fingerprint_ignores_case_punctuation_and_company_suffixes(): void
    {
        $adzuna = $this->posting('adzuna', 'Senior Laravel Developer', 'Acme, Inc.', 'London, UK', '1');
        $jooble = $this->posting('jooble', ' senior laravel developer ', 'ACME Inc', 'london uk', '99');

        $this->assertSame($this->normalizer->fingerprint($adzuna), $this->normalizer->fingerprint($jooble));
    }

    public function test_fingerprint_differs_for_a_different_role(): void
    {
        $developer = $this->posting('adzuna', 'Senior Laravel Developer', 'Acme', 'London', '1');
        $designer = $this->posting('adzuna', 'Senior Product Designer', 'Acme', 'London', '2');

        $this->assertNotSame($this->normalizer->fingerprint($developer), $this->normalizer->fingerprint($designer));
    }

    public function test_postings_without_a_company_are_not_merged_across_providers(): void
    {
        $adzuna = $this->posting('adzuna', 'Laravel Developer', null, 'Remote', '1');
        $jooble = $this->posting('jooble', 'Laravel Developer', null, 'Remote', '2');

        $this->assertNotSame($this->normalizer->fingerprint($adzuna), $this->normalizer->fingerprint($jooble));
    }

    public function test_text_strips_markup_scripts_and_control_characters(): void
    {
        $text = $this->normalizer->text('<p>Hello&nbsp;<strong>world</strong></p><script>alert(1)</script>'."\x07");

        $this->assertSame('Hello world', $text);
    }

    public function test_description_keeps_paragraph_breaks(): void
    {
        $text = $this->normalizer->description('<p>First line</p><ul><li>One</li><li>Two</li></ul>');

        $this->assertSame("First line\nOne\nTwo", $text);
    }

    public function test_text_is_truncated_to_the_requested_length(): void
    {
        $this->assertSame(10, mb_strlen($this->normalizer->text(str_repeat('a', 50), 10)));
    }

    public function test_url_rejects_relative_and_invalid_values(): void
    {
        $this->assertSame('https://example.com/jobs/1', $this->normalizer->url('https://example.com/jobs/1'));
        $this->assertSame('', $this->normalizer->url('/relative/path'));
        $this->assertSame('', $this->normalizer->url('not a url'));
    }

    public function test_it_detects_remote_roles_from_any_field(): void
    {
        $this->assertTrue($this->normalizer->looksRemote('Remote (EU)'));
        $this->assertTrue($this->normalizer->looksRemote('Backend Engineer', 'Work from home'));
        $this->assertFalse($this->normalizer->looksRemote('Berlin, Germany'));
    }

    public function test_it_parses_provider_values_safely(): void
    {
        $this->assertSame('2026-01-15', $this->normalizer->date('2026-01-15T10:00:00Z')?->toDateString());
        $this->assertNull($this->normalizer->date('not a date'));
        $this->assertNull($this->normalizer->date(null));

        $this->assertSame(50000, $this->normalizer->integer('50000.4'));
        $this->assertNull($this->normalizer->integer('-1'));
        $this->assertNull($this->normalizer->integer('n/a'));

        $this->assertSame('GBP', $this->normalizer->currencyForCountry('gb'));
        $this->assertSame('USD', $this->normalizer->currencyForCountry('US'));
        $this->assertSame('EUR', $this->normalizer->currencyForCountry('de'));
    }

    protected function posting(string $provider, string $title, ?string $company, ?string $location, string $externalId): JobPostingData
    {
        return new JobPostingData(
            provider: $provider,
            title: $title,
            description: 'A role.',
            applyUrl: 'https://example.com/jobs/'.$externalId,
            externalId: $externalId,
            company: $company,
            location: $location,
        );
    }
}
