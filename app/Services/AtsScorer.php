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
     * Sections an ATS expects every resume to have.
     */
    protected const REQUIRED_SECTIONS = ['summary', 'experience', 'skills', 'education'];

    /**
     * Heading words an ATS uses to recognise each resume section. Also used to split the resume into
     * context and skills sections for keyword scoring.
     */
    protected const SECTION_START_HEADINGS = [
        'summary' => ['summary', 'profile', 'objective', 'about me', 'overview'],
        'experience' => ['experience', 'employment', 'work history', 'career history', 'internships', 'professional background'],
        'skills' => ['skills', 'competencies', 'technologies', 'expertise', 'proficiencies', 'tech stack'],
        'education' => ['education', 'academic', 'academics', 'qualifications'],
        'projects' => ['projects', 'portfolio'],
        'certifications' => ['certifications', 'certificates', 'licenses', 'courses', 'training'],
        'languages' => ['languages'],
    ];

    /**
     * Words that may surround a heading word ("Relevant Work Experience", "Technical Skills & Tools").
     * A line with more than one word outside this list is a sentence, not a heading.
     */
    protected const HEADING_WORDS = [
        'summary', 'profile', 'objective', 'about', 'me', 'overview', 'experience', 'experiences', 'employment', 'work',
        'history', 'career', 'internships', 'internship', 'background', 'skills', 'skill', 'competencies', 'technologies',
        'expertise', 'proficiencies', 'tech', 'stack', 'education', 'academic', 'academics', 'qualifications',
        'projects', 'project', 'portfolio', 'certifications', 'certificates', 'licenses', 'courses', 'training',
        'languages', 'professional', 'relevant', 'technical', 'core', 'key', 'and', '&', 'of', 'other', 'additional',
        'personal', 'selected', 'notable', 'areas', 'soft', 'hard', 'tools', 'my', 'highlights', 'information', 'the',
    ];

    /**
     * Interchangeable role nouns: "Software Developer" is a near match for "Software Engineer".
     */
    protected const ROLE_SYNONYMS = [
        'developer' => ['engineer', 'programmer'],
        'engineer' => ['developer'],
        'programmer' => ['developer', 'engineer'],
    ];

    /**
     * Suffixes removed by the light stemmer, longest first.
     */
    protected const STEM_SUFFIXES = [
        'izations', 'isations', 'ization', 'isation', 'ations', 'ation', 'ating', 'ators', 'ator', 'ated', 'ates', 'ate',
        'izing', 'ising', 'ized', 'ised', 'izes', 'ises', 'ize', 'ise', 'ments', 'ment', 'ities', 'ity', 'ings', 'ing',
        'ies', 'ied', 'ers', 'er', 'ed', 'es', 's', 'e', 'y',
    ];

    /**
     * Single-word terms whose stem may be matched: derived practice words ("testing", "documentation"),
     * never product names ("Express" must not match "expressed").
     */
    protected const STEMMABLE_ENDINGS = ['ing', 'ings', 'ment', 'ments', 'ation', 'ations', 'tion', 'tions', 'ies', 'ity', 'ities'];

    /**
     * @var array<string, array<int, string>>
     */
    protected array $stemmedHaystacks = [];

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
        $hasPhone = $this->hasPhoneNumber($text);

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
                    $titleScore >= 70 => 'Similar title found, not the exact "'.$jobTitle.'"',
                    $titleScore > 0 => 'Related title found (e.g. Developer vs Engineer), not "'.$jobTitle.'"',
                    default => 'Target title "'.$jobTitle.'" not found',
                },
            ],
            'sections' => [
                'score' => (int) round(100 * count($foundSections) / count(self::REQUIRED_SECTIONS)),
                'label' => 'Standard sections',
                'detail' => count($foundSections) === count(self::REQUIRED_SECTIONS)
                    ? 'Summary, Experience, Skills and Education headings found'
                    : 'Missing: '.implode(', ', array_map('ucfirst', array_diff(self::REQUIRED_SECTIONS, $foundSections))),
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
     * Like an ATS parser it tolerates spelling variants: plurals ("API"/"APIs"), punctuation and spacing
     * ("Node.js"/"NodeJS", "Front-end"/"Frontend", "JavaScript"/"Java Script") and word forms
     * ("testing"/"tested", "technology"/"technologies").
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

            if ($this->matchesExactly($haystack, $term)
                || $this->matchesCompactForm($haystack, $term)
                || $this->matchesStemmed($haystack, $term)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The term as written, its singular when the term is a plural ("REST APIs" matches "REST API"),
     * or its "-ies" plural ("technology" matches "technologies").
     */
    protected function matchesExactly(string $haystack, string $term): bool
    {
        $variants = [$term];
        if (preg_match('/(?<![a-z0-9])[a-z]{2,}[^s]s$/u', $term)) {
            $variants[] = mb_substr($term, 0, -1);
        }
        if (preg_match('/[a-z]{2,}[^aeiou]y$/u', $term)) {
            $variants[] = mb_substr($term, 0, -1).'ie';
        }

        foreach ($variants as $variant) {
            if (preg_match('/(?<![a-z0-9])'.$this->termPattern($variant).'(?:s|es)?(?![a-z0-9])/u', $haystack)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Match the term with separators ignored, so "Node.js", "NodeJS" and "Node JS" are the same keyword.
     * Only for terms of 5+ letters, where a stray separator cannot create a false match.
     */
    protected function matchesCompactForm(string $haystack, string $term): bool
    {
        $compact = preg_replace('/[\s.\-\/]+/u', '', $term);

        if (mb_strlen($compact) < 5 || ! preg_match('/^[a-z0-9]+$/', $compact)) {
            return false;
        }

        $pattern = implode('[.\-\/ ]?', str_split($compact));

        return (bool) preg_match('/(?<![a-z0-9])'.$pattern.'(?:s|es)?(?![a-z0-9])/u', $haystack);
    }

    /**
     * Match word forms of the term ("unit tests" for "unit testing", "deployed" for "deployment").
     */
    protected function matchesStemmed(string $haystack, string $term): bool
    {
        if (! preg_match('/^[a-z]+(?:[\s\-][a-z]+)*$/u', $term)) {
            return false;
        }

        $termWords = preg_split('/[\s\-]+/u', $term);
        $isStemmable = count($termWords) > 1 || collect(self::STEMMABLE_ENDINGS)->contains(fn (string $ending) => str_ends_with($term, $ending));

        if (! $isStemmable) {
            return false;
        }

        $termStems = array_map(fn (string $word) => $this->stem($word), $termWords);
        $haystackStems = $this->stemmedHaystacks[$haystack] ??= array_map(
            fn (string $word) => $this->stem($word),
            preg_split('/[^a-z0-9+#]+/u', $haystack, -1, PREG_SPLIT_NO_EMPTY),
        );

        foreach (array_keys($haystackStems, $termStems[0], true) as $start) {
            if (array_slice($haystackStems, $start, count($termStems)) === $termStems) {
                return true;
            }
        }

        return false;
    }

    /**
     * A deliberately light stemmer: strips one derivational/inflectional suffix, then a trailing "e"/"y".
     */
    protected function stem(string $word): string
    {
        if (strlen($word) < 5 || ! ctype_alpha($word)) {
            return $word;
        }

        foreach (self::STEM_SUFFIXES as $suffix) {
            if ($suffix === 's' && str_ends_with($word, 'ss')) {
                continue;
            }

            if (str_ends_with($word, $suffix) && strlen($word) - strlen($suffix) >= 4) {
                $word = substr($word, 0, -strlen($suffix));

                break;
            }
        }

        return strlen($word) > 4 && in_array(substr($word, -1), ['e', 'y'], true) ? substr($word, 0, -1) : $word;
    }

    /**
     * A phone number has 9-15 digits; a date range such as "2019 - 2022" is not one.
     */
    protected function hasPhoneNumber(string $text): bool
    {
        preg_match_all('/(?<![\w\/])\+?\(?\d[\d\s().\-]{6,}\d(?![\w\/])/u', $text, $matches);

        foreach ($matches[0] as $candidate) {
            $digits = strlen(preg_replace('/\D/', '', $candidate));

            if ($digits >= 9 && $digits <= 15 && ! preg_match('/^\s*(?:19|20)\d{2}\s*[-.]\s*(?:19|20)\d{2}\s*$/', $candidate)) {
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

        if ($coreTitle === '') {
            return 0;
        }

        if ($this->containsAny($haystack, [$coreTitle])) {
            return 70;
        }

        $relatedTitles = [];
        foreach (self::ROLE_SYNONYMS as $role => $synonyms) {
            $rolePattern = '/(?<![a-z])'.$role.'(?![a-z])/';

            if (preg_match($rolePattern, $coreTitle)) {
                foreach ($synonyms as $synonym) {
                    $relatedTitles[] = preg_replace($rolePattern, $synonym, $coreTitle);
                }
            }
        }

        return $relatedTitles !== [] && $this->containsAny($haystack, $relatedTitles) ? 50 : 0;
    }

    /**
     * Required sections that have a recognisable heading line.
     *
     * @return array<int, string>
     */
    protected function findSections(string $text): array
    {
        $found = collect(preg_split('/\R/u', $text) ?: [])
            ->map(fn (string $line) => $this->sectionKeyForHeading($line))
            ->filter()
            ->unique()
            ->all();

        return array_values(array_intersect(self::REQUIRED_SECTIONS, $found));
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

    /**
     * The section a line starts when it is a heading ("Work Experience", "TECHNICAL SKILLS:"), or null for
     * ordinary lines, including sentences that merely mention a heading word ("Software engineer with experience").
     */
    public function sectionKeyForHeading(string $line): ?string
    {
        $line = mb_strtolower(trim($line, " \t:|-*#\u{2022}"));

        if ($line === '' || mb_strlen($line) > 40 || preg_match('/[":,.;!?()\d]/u', $line)) {
            return null;
        }

        $words = preg_split('/[^a-z&]+/u', $line, -1, PREG_SPLIT_NO_EMPTY);
        if ($words === [] || count($words) > 5 || count(array_diff($words, self::HEADING_WORDS)) > 1) {
            return null;
        }

        foreach (self::SECTION_START_HEADINGS as $key => $headingWords) {
            foreach ($headingWords as $word) {
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
