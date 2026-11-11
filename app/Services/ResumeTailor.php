<?php

namespace App\Services;

/**
 * Runs the full tailoring pipeline: JD keyword extraction, original score, AI rewrite,
 * deterministic post-processing, ATS rendering and re-scoring.
 */
class ResumeTailor
{
    public const CORE_COMPETENCIES = 'Core Competencies';

    public function __construct(public GroqService $groq, public AtsScorer $scorer, public JobKeywordAnalyzer $analyzer) {}

    /**
     * Score a CV against a job description without rewriting it: one cached keyword extraction,
     * then the deterministic scorer. Gives the same score as the "before" score of tailoring.
     *
     * @return array{job_title: string, keywords: array<int, array<string, mixed>>, report: array<string, mixed>}
     */
    public function scan(string $cvText, string $jobDescription): array
    {
        $analysis = $this->analyzer->analyzeText($jobDescription);

        return [
            'job_title' => $analysis['job_title'],
            'keywords' => $analysis['keywords'],
            'report' => $this->scorer->score($cvText, $analysis['keywords'], $analysis['job_title']),
        ];
    }

    /**
     * @param  array{job_title: string, keywords: array<int, array<string, mixed>>}|null  $jobAnalysis  Reuse a previous analysis of the same JD.
     * @param  array<int, string>  $confirmedSkills
     * @param  array<string, mixed>  $design  Design of the uploaded CV (see {@see ResumeDesign}); the tailored resume is rendered in it.
     * @return array{
     *     job_title: string,
     *     keywords: array<int, array<string, mixed>>,
     *     original: array<string, mixed>,
     *     tailored: array<string, mixed>,
     *     resume: array<string, mixed>,
     *     design: array<string, mixed>,
     *     html: string,
     *     plain_text: string,
     *     added_keywords: array<int, array{term: string, importance: string, evidence: string}>
     * }
     */
    public function tailor(string $cvText, string $jobDescription, ?array $jobAnalysis = null, array $confirmedSkills = [], array $design = []): array
    {
        $design = ResumeDesign::normalize($design);
        $jobAnalysis ??= $this->analyzer->analyzeText($jobDescription);
        $jobTitle = $jobAnalysis['job_title'];
        $keywords = $jobAnalysis['keywords'];

        $original = $this->scorer->score($cvText, $keywords, $jobTitle);
        $resume = $this->groq->tailorResume($cvText, $jobDescription, $jobTitle, $original, $confirmedSkills);

        $resume = $this->restoreMissingProjects($resume, $cvText);
        $resume['experience'] = $this->sortByMostRecent($resume['experience']);
        $resume['headline'] = $resume['headline'] ?: $jobTitle;

        $evidence = $this->verifiedEvidence($resume['keyword_coverage'], $cvText, $confirmedSkills);
        $resume = $this->ensureKeywordCoverage($resume, $keywords, $original, $evidence, $confirmedSkills, $design);

        $html = $this->render($resume, $design);
        $plainText = $this->toPlainText($html);
        $tailored = $this->scorer->score($plainText, $keywords, $jobTitle);

        $originallyMatched = array_column($original['matched'], 'term');
        $addedKeywords = collect($tailored['matched'])
            ->reject(fn (array $keyword) => in_array($keyword['term'], $originallyMatched, true))
            ->map(fn (array $keyword) => [
                'term' => $keyword['term'],
                'importance' => $keyword['importance'],
                'evidence' => $evidence[mb_strtolower($keyword['term'])] ?? '',
            ])
            ->values()
            ->all();

        if ($addedKeywords !== [] && $tailored['score'] > AtsScorer::ADDED_KEYWORD_MAX_SCORE) {
            $tailored['score'] = AtsScorer::ADDED_KEYWORD_MAX_SCORE;
            $tailored['cap_reason'] = 'Capped at '.AtsScorer::ADDED_KEYWORD_MAX_SCORE.' because '
                .count($addedKeywords).' keywords were added by the tailoring step.';
        }

        return [
            'job_title' => $jobTitle,
            'keywords' => $keywords,
            'original' => $original,
            'tailored' => $tailored,
            'resume' => $resume,
            'design' => $design,
            'html' => $html,
            'plain_text' => $plainText,
            'added_keywords' => $addedKeywords,
        ];
    }

    /**
     * Render the resume in the design of the uploaded CV: its fonts, colours, layout, section order and headings.
     *
     * @param  array<string, mixed>  $resume
     * @param  array<string, mixed>  $design
     */
    public function render(array $resume, array $design = []): string
    {
        $design = ResumeDesign::normalize($design);

        $sections = collect($design['section_order'])
            ->filter(fn (string $section) => filled($resume[$section] ?? null))
            ->mapWithKeys(fn (string $section) => [$section => ResumeDesign::title($design, $section, $this->scorer)])
            ->all();

        $needsUnicodeFont = (bool) preg_match('/[^\x{0000}-\x{00FF}]/u', (string) json_encode($resume, JSON_UNESCAPED_UNICODE));

        return view('resume.ats', [
            'resume' => $resume,
            'design' => $design,
            'sections' => $sections,
            'fontStack' => ResumeDesign::fontStack($design, $needsUnicodeFont),
        ])->render();
    }

    /**
     * Mirror what an ATS parser sees: the visible text of the resume, one block per line.
     */
    public function toPlainText(string $html): string
    {
        $body = preg_replace('/<head\b.*?<\/head>/is', '', $html);
        $body = preg_replace('/<\/(h1|h2|h3|p|li|ul)>/i', "\n", $body);
        $text = html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/[ \t]+/', ' ', $text);

        return trim(preg_replace('/\s*\n\s*/', "\n", $text));
    }

    /**
     * Keep only AI "supported" claims whose evidence really appears in the CV (or the candidate's confirmed skills).
     *
     * @param  array<int, array{term: string, supported: bool, evidence: string}>  $coverage
     * @param  array<int, string>  $confirmedSkills
     * @return array<string, string> Lower-cased term => evidence quote.
     */
    protected function verifiedEvidence(array $coverage, string $cvText, array $confirmedSkills): array
    {
        $source = $this->comparable($cvText.' '.implode(' ', $confirmedSkills));
        $sourceWords = array_flip(explode(' ', $source));

        return collect($coverage)
            ->filter(function (array $item) use ($source, $sourceWords) {
                $evidence = $this->comparable($item['evidence']);
                if (! $item['supported'] || $evidence === '') {
                    return false;
                }
                if (str_contains($source, $evidence)) {
                    return true;
                }

                $words = array_filter(explode(' ', $evidence), fn (string $word) => mb_strlen($word) >= 3);

                return $words !== [] && count(array_filter($words, fn (string $word) => isset($sourceWords[$word]))) / count($words) >= 0.7;
            })
            ->mapWithKeys(fn (array $item) => [mb_strtolower($item['term']) => $item['evidence']])
            ->all();
    }

    /**
     * Guarantee every keyword the candidate verifiably has ends up in the resume text: keywords the CV
     * already contained, keywords with verified evidence and confirmed skills. Any the rewrite left out
     * are listed under "Core Competencies", so the tailored score can never drop below the original.
     *
     * @param  array<string, mixed>  $resume
     * @param  array<int, array<string, mixed>>  $keywords
     * @param  array{matched: array<int, array<string, string>>}  $original
     * @param  array<string, string>  $evidence
     * @param  array<int, string>  $confirmedSkills
     * @param  array<string, mixed>  $design
     * @return array<string, mixed>
     */
    protected function ensureKeywordCoverage(array $resume, array $keywords, array $original, array $evidence, array $confirmedSkills, array $design): array
    {
        $plainText = $this->toPlainText($this->render($resume, $design));
        $originallyMatched = array_map('mb_strtolower', array_column($original['matched'], 'term'));
        $confirmed = array_map('mb_strtolower', $confirmedSkills);

        $missingTerms = collect($keywords)
            ->filter(fn (array $keyword) => in_array(mb_strtolower($keyword['term']), $originallyMatched, true)
                || isset($evidence[mb_strtolower($keyword['term'])])
                || $this->scorer->containsAny(implode(' | ', $confirmed), [$keyword['term'], ...($keyword['aliases'] ?? [])]))
            ->reject(fn (array $keyword) => $this->scorer->containsAny($plainText, [$keyword['term'], ...($keyword['aliases'] ?? [])]))
            ->pluck('term');

        $missingConfirmed = collect($confirmedSkills)
            ->reject(fn (string $skill) => $this->scorer->containsAny($plainText, [$skill]));

        $additions = $missingTerms->merge($missingConfirmed)->unique(fn (string $term) => mb_strtolower($term))->values()->all();

        if ($additions === []) {
            return $resume;
        }

        $existing = collect($resume['skills'])->firstWhere('category', self::CORE_COMPETENCIES);
        $otherGroups = collect($resume['skills'])->reject(fn (array $group) => $group['category'] === self::CORE_COMPETENCIES)->values();

        $resume['skills'] = $otherGroups->prepend([
            'category' => self::CORE_COMPETENCIES,
            'items' => array_values(array_unique([...($existing['items'] ?? []), ...$additions])),
        ])->all();

        return $resume;
    }

    /**
     * The AI sometimes shortlists projects instead of rewriting all of them. It lists every CV project name
     * first ("cv_project_names"); any listed project missing from the rewrite is copied back from the CV
     * as written, and projects are kept in CV order.
     *
     * @param  array<string, mixed>  $resume
     * @return array<string, mixed>
     */
    protected function restoreMissingProjects(array $resume, string $cvText): array
    {
        $names = $resume['cv_project_names'] ?? [];
        unset($resume['cv_project_names']);

        $lines = array_values(array_filter(array_map('trim', preg_split('/\R/u', $cvText) ?: []), 'strlen'));
        $projectsHeading = collect($lines)->search(fn (string $line) => $this->scorer->sectionKeyForHeading($line) === 'projects');
        $firstLine = $projectsHeading === false ? 0 : $projectsHeading + 1;

        $nameLines = collect($names)
            ->mapWithKeys(fn (string $name) => [$name => $this->findProjectLine($lines, $name, $firstLine)])
            ->filter(fn (?int $index) => $index !== null)
            ->sort();

        if ($nameLines->isEmpty()) {
            return $resume;
        }

        $remaining = collect($resume['projects']);
        $ordered = [];
        $restored = [];

        foreach ($nameLines as $name => $index) {
            $matchKey = $remaining->search(fn (array $project) => $this->sameProject($project['name'], $name));

            if ($matchKey !== false) {
                $ordered[] = $remaining->pull($matchKey);

                continue;
            }

            $nextBoundary = $nameLines->first(fn (int $other) => $other > $index) ?? count($lines);
            $ordered[] = $this->projectFromCv(array_slice($lines, $index, $nextBoundary - $index));
            $restored[] = $name;
        }

        $resume['projects'] = [...$ordered, ...$remaining->values()->all()];

        if ($restored !== []) {
            $resume['changes'][] = 'Kept '.count($restored).' project(s) from your CV unchanged because the rewrite left them out: '.implode(', ', $restored).'.';
        }

        return $resume;
    }

    /**
     * @param  array<int, string>  $lines
     */
    protected function findProjectLine(array $lines, string $name, int $firstLine): ?int
    {
        foreach ([$firstLine, 0] as $start) {
            for ($index = $start; $index < count($lines); $index++) {
                if (mb_strlen($lines[$index]) <= 160 && $this->sameProject($lines[$index], $name)) {
                    return $index;
                }
            }
        }

        return null;
    }

    /**
     * Names match when one starts with the other, or both start with the same word and most words of the
     * shorter one appear in the longer ("SeeATS - AI-Powered ATS" vs "SeeATS — AI-Powered Applicant Tracking
     * System (ATS)"). Bracketed parts and URLs are ignored, so shared domains don't make projects look alike.
     */
    protected function sameProject(string $first, string $second): bool
    {
        $core = fn (string $name) => $this->comparable(preg_replace('/\([^)]*\)|\b(?:https?:\/\/|www\.)?[\w-]+(?:\.[\w-]+)+\S*/iu', ' ', $name));
        $first = $core($first);
        $second = $core($second);

        if ($first === '' || $second === '') {
            return false;
        }

        if (str_starts_with($first.' ', $second.' ') || str_starts_with($second.' ', $first.' ')) {
            return true;
        }

        $firstWords = array_values(array_unique(explode(' ', $first)));
        $secondWords = array_values(array_unique(explode(' ', $second)));

        if ($firstWords[0] !== $secondWords[0]) {
            return false;
        }
        $shorter = count($firstWords) <= count($secondWords) ? $firstWords : $secondWords;
        $longer = $shorter === $firstWords ? $secondWords : $firstWords;

        return count(array_intersect($shorter, $longer)) / count($shorter) >= 0.75;
    }

    /**
     * Build a project entry from its lines in the CV: the name line, a "Technologies:" line, links and bullets.
     * Lines wrapped by the PDF are joined back into one bullet. The block ends at the next section heading.
     *
     * @param  array<int, string>  $block
     * @return array{name: string, technologies: array<int, string>, link: string, bullets: array<int, string>}
     */
    protected function projectFromCv(array $block): array
    {
        $project = ['name' => $this->groq->toAtsSafeText(array_shift($block)), 'technologies' => [], 'link' => '', 'bullets' => []];
        $entries = [];

        foreach ($block as $line) {
            if ($this->scorer->sectionKeyForHeading($line) !== null) {
                break;
            }

            $previous = $entries === [] ? null : $entries[array_key_last($entries)];
            $continues = $previous !== null && (preg_match('/^\p{Ll}/u', $line) || preg_match('/(,|;|&|\(|-|\band|\bwith|\bfor|\bof)$/iu', $previous));

            if ($continues) {
                $entries[array_key_last($entries)] .= ' '.$line;
            } else {
                $entries[] = $line;
            }
        }

        foreach ($entries as $entry) {
            $entry = $this->groq->toAtsSafeText($entry);

            if (preg_match('/^(?:technologies|tech stack|tools|stack|built with)\s*:\s*(.+)$/iu', $entry, $matches)) {
                $project['technologies'] = array_values(array_filter(array_map('trim', explode(',', $matches[1])), 'strlen'));
            } elseif ($project['link'] === '' && preg_match('/^(?:https?:\/\/|www\.)\S+$/iu', $entry)) {
                $project['link'] = $entry;
            } elseif ($entry !== '') {
                $project['bullets'][] = $entry;
            }
        }

        return $project;
    }

    /**
     * Reverse-chronological order by end date, then start date; entries with unreadable dates keep their position.
     *
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<int, array<string, mixed>>
     */
    protected function sortByMostRecent(array $entries): array
    {
        $indexed = array_map(null, array_keys($entries), $entries);

        usort($indexed, function (array $a, array $b) {
            $byEnd = $this->dateRank($b[1]['end_date']) <=> $this->dateRank($a[1]['end_date']);
            $byStart = $this->dateRank($b[1]['start_date']) <=> $this->dateRank($a[1]['start_date']);

            return $byEnd ?: $byStart ?: $a[0] <=> $b[0];
        });

        return array_column($indexed, 1);
    }

    protected function dateRank(string $date): int
    {
        if (preg_match('/present|current|now|ongoing|till date|to date/i', $date)) {
            return PHP_INT_MAX;
        }

        if (! preg_match('/(?:([a-z]{3})[a-z]*\.?\s*)?(\d{4})/i', $date, $matches)) {
            return 0;
        }

        $month = array_search(strtolower($matches[1] ?? ''), ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], true);

        return (int) $matches[2] * 12 + ($month === false ? 0 : $month);
    }

    protected function comparable(string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9+#]+/', ' ', mb_strtolower($text))));
    }
}
