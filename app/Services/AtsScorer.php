<?php

namespace App\Services;

/**
 * Deterministic ATS scorer.
 *
 * Mirrors how ATS systems (Jobscan-style match rates, Workday/Greenhouse ranking) evaluate a resume:
 * mostly keyword coverage, plus job-title match, standard section headings and parseable contact details.
 * Scoring is done in PHP (not by the LLM) so the "before" and "after" scores are comparable and reproducible.
 */
class AtsScorer
{
    public const REQUIRED_WEIGHT = 3;

    public const PREFERRED_WEIGHT = 1;

    /**
     * Share of the overall score each check contributes (sums to 100).
     */
    public const COMPONENT_WEIGHTS = [
        'keywords' => 70,
        'job_title' => 10,
        'sections' => 10,
        'contact' => 10,
    ];

    /**
     * Words that describe seniority rather than the role, stripped to find the core job title.
     */
    protected const SENIORITY_WORDS = ['junior', 'senior', 'sr', 'jr', 'lead', 'principal', 'staff', 'associate', 'entry level', 'mid level', 'intern', 'trainee', 'head', 'chief', 'i', 'ii', 'iii'];

    /**
     * Heading words an ATS uses to recognise each standard resume section.
     */
    protected const SECTION_HEADINGS = [
        'summary' => ['summary', 'profile', 'objective', 'about me'],
        'experience' => ['experience', 'employment', 'work history', 'career history'],
        'skills' => ['skills', 'competencies', 'technologies', 'expertise'],
        'education' => ['education', 'academic', 'qualifications'],
    ];

    /**
     * @param  array<int, array{term: string, aliases?: array<int, string>, category?: string, importance?: string}>  $keywords
     * @return array{
     *     score: int,
     *     breakdown: array<string, array{score: int, weight: int, label: string, detail: string}>,
     *     matched: array<int, array{term: string, category: string, importance: string}>,
     *     missing: array<int, array{term: string, category: string, importance: string}>,
     *     required_total: int,
     *     required_matched: int
     * }
     */
    public function score(string $text, array $keywords, string $jobTitle = ''): array
    {
        $haystack = $this->normalize($text);
        $keywordReport = $this->scoreKeywords($haystack, $keywords);
        $titleScore = $this->scoreJobTitle($haystack, $jobTitle);
        $foundSections = $this->findSections($text);
        $hasEmail = (bool) preg_match('/[\w.+-]+@[\w-]+\.[\w.]+/', $text);
        $hasPhone = (bool) preg_match('/\+?\d[\d\s().-]{7,}\d/', $text);

        $breakdown = [
            'keywords' => [
                'score' => $keywordReport['score'],
                'label' => 'Keyword match',
                'detail' => count($keywordReport['matched']).' of '.count($keywords).' JD keywords found',
            ],
            'job_title' => [
                'score' => $titleScore,
                'label' => 'Job title match',
                'detail' => match (true) {
                    $titleScore === 100 => 'Exact target title "'.$jobTitle.'" found',
                    $titleScore > 0 => 'Similar title found, not the exact "'.$jobTitle.'"',
                    default => 'Target title "'.$jobTitle.'" not found',
                },
            ],
            'sections' => [
                'score' => (int) round(100 * count($foundSections) / count(self::SECTION_HEADINGS)),
                'label' => 'Standard sections',
                'detail' => count($foundSections) === count(self::SECTION_HEADINGS)
                    ? 'Summary, Experience, Skills and Education headings found'
                    : 'Missing: '.implode(', ', array_map('ucfirst', array_diff(array_keys(self::SECTION_HEADINGS), $foundSections))),
            ],
            'contact' => [
                'score' => ($hasEmail ? 50 : 0) + ($hasPhone ? 50 : 0),
                'label' => 'Contact details',
                'detail' => match (true) {
                    $hasEmail && $hasPhone => 'Email and phone are parseable',
                    $hasEmail => 'Phone number not found',
                    $hasPhone => 'Email address not found',
                    default => 'Email and phone not found',
                },
            ],
        ];

        $overall = 0;
        foreach ($breakdown as $key => &$component) {
            $component['weight'] = self::COMPONENT_WEIGHTS[$key];
            $overall += $component['score'] * self::COMPONENT_WEIGHTS[$key] / 100;
        }
        unset($component);

        return [
            'score' => (int) round($overall),
            'breakdown' => $breakdown,
            'matched' => $keywordReport['matched'],
            'missing' => $keywordReport['missing'],
            'required_total' => $keywordReport['required_total'],
            'required_matched' => $keywordReport['required_matched'],
        ];
    }

    /**
     * @param  array<int, array{term: string, aliases?: array<int, string>, category?: string, importance?: string}>  $keywords
     * @return array{score: int, matched: array<int, array{term: string, category: string, importance: string}>, missing: array<int, array{term: string, category: string, importance: string}>, required_total: int, required_matched: int}
     */
    public function scoreKeywords(string $haystack, array $keywords): array
    {
        $haystack = $this->normalize($haystack);
        $matched = [];
        $missing = [];
        $totalWeight = 0;
        $matchedWeight = 0;
        $requiredTotal = 0;
        $requiredMatched = 0;

        foreach ($keywords as $keyword) {
            $isRequired = ($keyword['importance'] ?? 'preferred') === 'required';
            $weight = $isRequired ? self::REQUIRED_WEIGHT : self::PREFERRED_WEIGHT;
            $entry = [
                'term' => $keyword['term'],
                'category' => $keyword['category'] ?? 'hard_skill',
                'importance' => $isRequired ? 'required' : 'preferred',
            ];

            $totalWeight += $weight;
            $requiredTotal += $isRequired ? 1 : 0;

            if ($this->containsAny($haystack, [$keyword['term'], ...($keyword['aliases'] ?? [])])) {
                $matched[] = $entry;
                $matchedWeight += $weight;
                $requiredMatched += $isRequired ? 1 : 0;
            } else {
                $missing[] = $entry;
            }
        }

        return [
            'score' => $totalWeight > 0 ? (int) round(100 * $matchedWeight / $totalWeight) : 0,
            'matched' => $matched,
            'missing' => $missing,
            'required_total' => $requiredTotal,
            'required_matched' => $requiredMatched,
        ];
    }

    /**
     * Whether the text contains the term (or one of its aliases) as a whole word or phrase.
     *
     * @param  array<int, string>  $terms
     */
    public function containsAny(string $haystack, array $terms): bool
    {
        $haystack = $this->normalize($haystack);

        foreach ($terms as $term) {
            $term = $this->normalize((string) $term);
            if ($term === '') {
                continue;
            }

            $pattern = implode('[\s\-\/]+', array_map(fn (string $part) => preg_quote($part, '/'), preg_split('/[\s\-\/]+/', $term)));

            if (preg_match('/(?<![a-z0-9])'.$pattern.'(?:s|es)?(?![a-z0-9])/u', $haystack)) {
                return true;
            }
        }

        return false;
    }

    protected function scoreJobTitle(string $haystack, string $jobTitle): int
    {
        if (trim($jobTitle) === '') {
            return 100;
        }

        if ($this->containsAny($haystack, [$jobTitle])) {
            return 100;
        }

        $coreTitle = $this->normalize($jobTitle);
        foreach (self::SENIORITY_WORDS as $word) {
            $coreTitle = preg_replace('/(?<![a-z0-9])'.preg_quote($word, '/').'(?![a-z0-9])\.?/u', ' ', $coreTitle);
        }
        $coreTitle = trim(preg_replace('/\s+/', ' ', $coreTitle));

        return $coreTitle !== '' && $this->containsAny($haystack, [$coreTitle]) ? 70 : 0;
    }

    /**
     * @return array<int, string>
     */
    protected function findSections(string $text): array
    {
        $headingLines = collect(preg_split('/\R/u', mb_strtolower($text)))
            ->map(fn (string $line) => trim($line, " \t:|-"))
            ->filter(fn (string $line) => $line !== '' && mb_strlen($line) <= 40);

        return collect(self::SECTION_HEADINGS)
            ->filter(fn (array $words) => $headingLines->contains(
                fn (string $line) => collect($words)->contains(fn (string $word) => str_contains($line, $word))
            ))
            ->keys()
            ->all();
    }

    protected function normalize(string $text): string
    {
        $text = mb_strtolower($text);
        $text = str_replace(["\u{2010}", "\u{2011}", "\u{2012}", "\u{2013}", "\u{2014}", "\u{2019}"], ['-', '-', '-', '-', '-', "'"], $text);

        return trim(preg_replace('/\s+/u', ' ', $text));
    }
}
