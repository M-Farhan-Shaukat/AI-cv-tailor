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
     * Credit for a keyword that appears only in the skills list, not in the summary or experience.
     * Jobscan-style tools treat listed skills as weaker evidence than demonstrated skills.
     */
    public const SKILLS_ONLY_CREDIT = 0.85;

    /**
     * A resume that only lists a keyword cannot be a perfect match, even if every keyword is present.
     */
    public const SKILLS_ONLY_MAX_SCORE = 95;

    /**
     * Cap for a tailored resume whose match score only became perfect because the tool added keywords.
     */
    public const ADDED_KEYWORD_MAX_SCORE = 95;

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
     * Headings used to split the resume into context and skills sections for keyword scoring.
     */
    protected const SECTION_START_HEADINGS = [
        'summary' => ['summary', 'profile', 'objective', 'about me'],
        'experience' => ['experience', 'employment', 'work history', 'career history'],
        'skills' => ['skills', 'competencies', 'technologies', 'expertise'],
        'education' => ['education', 'academic', 'qualifications'],
        'projects' => ['projects', 'portfolio'],
        'certifications' => ['certifications', 'certificates', 'licenses'],
        'languages' => ['languages'],
    ];

    /**
     * @param  array<int, array{term: string, aliases?: array<int, string>, category?: string, importance?: string}>  $keywords
     * @return array{
     *     score: int,
     *     breakdown: array<string, array{score: int, weight: int, label: string, detail: string}>,
     *     matched: array<int, array{term: string, category: string, importance: string, in_context: bool}>,
     *     missing: array<int, array{term: string, category: string, importance: string}>,
     *     skills_only: int,
     *     required_total: int,
     *     required_matched: int
     * }
     */
    public function score(string $text, array $keywords, string $jobTitle = ''): array
    {
        $haystack = $this->normalize($text);
        $sections = $this->splitSections($text);
        $skillsText = trim($sections['skills'] ?? '');

        $keywordReport = $skillsText === ''
            ? $this->scoreKeywords($haystack, $keywords)
            : $this->scoreKeywords(
                $this->normalize(collect($sections)->except('skills')->implode("\n")),
                $keywords,
                $skillsText,
            );

        $titleScore = $this->scoreJobTitle($haystack, $jobTitle);
        $foundSections = $this->findSections($text);
        $hasEmail = (bool) preg_match('/[\w.+-]+@[\w-]+\.[\w.]+/', $text);
        $hasPhone = (bool) preg_match('/\+?\d[\d\s().-]{7,}\d/', $text);

        $breakdown = [
            'keywords' => [
                'score' => $keywordReport['score'],
                'label' => 'Keyword match',
                'detail' => count($keywordReport['matched']).' of '.count($keywords).' JD keywords found'
                    .($keywordReport['skills_only'] > 0 ? ' ('.$keywordReport['skills_only'].' only in the skills list)' : ''),
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

        if ($keywordReport['skills_only'] > 0) {
            $overall = min($overall, self::SKILLS_ONLY_MAX_SCORE);
        }

        return [
            'score' => (int) round($overall),
            'breakdown' => $breakdown,
            'matched' => $keywordReport['matched'],
            'missing' => $keywordReport['missing'],
            'skills_only' => $keywordReport['skills_only'],
            'required_total' => $keywordReport['required_total'],
            'required_matched' => $keywordReport['required_matched'],
        ];
    }

    /**
     * @param  array<int, array{term: string, aliases?: array<int, string>, category?: string, importance?: string}>  $keywords
     * @return array{score: int, matched: array<int, array{term: string, category: string, importance: string, in_context: bool}>, missing: array<int, array{term: string, category: string, importance: string}>, skills_only: int, skills_only_terms: array<int, string>, required_total: int, required_matched: int}
     */
    public function scoreKeywords(string $haystack, array $keywords, string $skillsHaystack = ''): array
    {
        $haystack = $this->normalize($haystack);
        $skillsHaystack = $this->normalize($skillsHaystack);
        $matched = [];
        $missing = [];
        $skillsOnly = [];
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
            $terms = [$keyword['term'], ...($keyword['aliases'] ?? [])];

            $totalWeight += $weight;
            $requiredTotal += $isRequired ? 1 : 0;

            $inContext = $this->containsAny($haystack, $terms);
            $inSkillsOnly = ! $inContext && $skillsHaystack !== '' && $this->containsAny($skillsHaystack, $terms);

            if ($inContext) {
                $matched[] = $entry + ['in_context' => true];
                $matchedWeight += $weight;
                $requiredMatched += $isRequired ? 1 : 0;
            } elseif ($inSkillsOnly) {
                $matched[] = $entry + ['in_context' => false];
                $skillsOnly[] = $entry;
                $matchedWeight += $weight * self::SKILLS_ONLY_CREDIT;
                $requiredMatched += $isRequired ? 1 : 0;
            } else {
                $missing[] = $entry;
            }
        }

        return [
            'score' => $totalWeight > 0 ? (int) round(100 * $matchedWeight / $totalWeight) : 0,
            'matched' => $matched,
            'missing' => $missing,
            'skills_only' => count($skillsOnly),
            'skills_only_terms' => array_column($skillsOnly, 'term'),
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

            if (preg_match('/(?<![a-z0-9])'.$this->termPattern($term).'(?:s|es)?(?![a-z0-9])/u', $haystack)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Regex for a term whose words may be separated by spaces, hyphens or slashes.
     */
    protected function termPattern(string $term): string
    {
        return implode('[\s\-\/]+', array_map(
            fn (string $part) => preg_quote($part, '/'),
            preg_split('/[\s\-\/]+/', $term) ?: [$term],
        ));
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

    /**
     * Split the visible resume text into its sections so keywords can be judged by where they appear.
     *
     * @return array<string, string>
     */
    protected function splitSections(string $text): array
    {
        $sections = ['preamble' => ''];
        $current = 'preamble';

        foreach (preg_split('/\R/u', $text) ?: [$text] as $line) {
            $key = $this->sectionKeyForHeading($line);

            if ($key !== null) {
                $current = $key;
                $sections[$current] ??= '';

                continue;
            }

            $sections[$current] = trim(($sections[$current] ?? '').' '.$line);
        }

        return array_filter($sections, fn (string $value) => trim($value) !== '');
    }

    protected function sectionKeyForHeading(string $line): ?string
    {
        $line = mb_strtolower(trim($line, " \t:|-"));

        if ($line === '' || mb_strlen($line) > 40 || preg_match('/[":,]/u', $line)) {
            return null;
        }

        foreach (self::SECTION_START_HEADINGS as $key => $words) {
            foreach ($words as $word) {
                if (preg_match('/(?<![a-z0-9])'.$this->termPattern($word).'(?:s)?(?![a-z0-9])/u', $line)) {
                    return $key;
                }
            }
        }

        return null;
    }

    protected function normalize(string $text): string
    {
        $text = mb_strtolower($text);
        $text = str_replace(["\u{2010}", "\u{2011}", "\u{2012}", "\u{2013}", "\u{2014}", "\u{2019}"], ['-', '-', '-', '-', '-', "'"], $text);

        return trim(preg_replace('/\s+/u', ' ', $text));
    }
}
