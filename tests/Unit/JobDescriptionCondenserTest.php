<?php

namespace Tests\Unit;

use App\Services\JobDescriptionCondenser;
use PHPUnit\Framework\TestCase;

class JobDescriptionCondenserTest extends TestCase
{
    public function test_short_postings_lose_only_boilerplate_and_duplicates(): void
    {
        $posting = implode("\n", [
            'Senior Laravel Developer',
            'Requirements',
            '- 5+ years of PHP and Laravel',
            '- 5+ years of PHP and Laravel',
            '- Experience with Redis queues',
            'Benefits',
            '- Health insurance and 25 days of paid time off',
            '- Gym membership',
            'We are an equal opportunity employer regardless of race or gender.',
        ]);

        $this->assertSame(
            "Senior Laravel Developer\nRequirements\n- 5+ years of PHP and Laravel\n- Experience with Redis queues",
            (new JobDescriptionCondenser)->condense($posting, 8000),
        );
    }

    public function test_long_postings_keep_requirements_from_the_middle_within_the_budget(): void
    {
        $about = collect(range(1, 400))->map(fn (int $i) => "Story {$i}: our people enjoy a friendly culture with many shared moments together.");
        $filler = collect(range(1, 400))->map(fn (int $i) => "Paragraph {$i} describes how the team spends a typical week in the office together.");

        $posting = implode("\n", [
            'Platform Engineer',
            'About us',
            ...$about,
            'Overview',
            ...$filler->take(200),
            'Must-have qualifications',
            '- Strong hands-on experience with Kubernetes and Terraform',
            '- Proficiency in Go or Python',
            ...$filler->skip(200),
        ]);

        $condensed = (new JobDescriptionCondenser)->condense($posting, 2000);

        $this->assertLessThanOrEqual(2000, mb_strlen($condensed));
        $this->assertStringStartsWith('Platform Engineer', $condensed);
        $this->assertStringContainsString('Kubernetes and Terraform', $condensed);
        $this->assertStringContainsString('Proficiency in Go or Python', $condensed);
        $this->assertStringNotContainsString('friendly culture', $condensed);
        $this->assertLessThan(strpos($condensed, 'Proficiency in Go'), strpos($condensed, 'Kubernetes'));
    }
}
