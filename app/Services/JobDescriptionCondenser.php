<?php

namespace App\Services;

/**
 * Shrinks a long job description to the part an ATS keyword analysis needs, without an AI call.
 *
 * Long postings (thousands of words) are mostly boilerplate: company marketing, benefits, EEO statements,
 * application instructions and repeated text. Cutting such a posting by position drops whichever requirements
 * happen to sit in the middle, so instead this removes boilerplate and duplicates, then keeps the most
 * keyword-dense lines (requirement sections, bullets, named technologies) in their original order.
 */
class JobDescriptionCondenser
{
    /**
     * Headings whose sections hold the keywords: responsibilities, requirements, skills.
     */
    protected const RELEVANT_HEADING = '/\b(requirement|qualification|skill|responsibilit|duties|what you( will|\'ll)? (do|bring|need|have)|you will|you have|must[- ]have|nice[- ]to[- ]have|preferred|bonus|experience|technical|tech stack|technolog|tools|the role|about the role|role overview|key (areas|tasks)|competenc|education|certification)/i';

    /**
     * Headings whose sections hold no ATS keywords.
     */
    protected const BOILERPLATE_HEADING = '/\b(benefits?|perks|what we offer|we offer|about (us|the company|our company)|who we are|our (culture|mission|values|story)|why (join|work)|life at|compensation|salary|pay range|equal (employment )?opportunity|eeo|diversity|inclusion|how to apply|application process|privacy|disclaimer|accommodation|recruitment fraud|legal)\b/i';

    /**
     * Single lines that are boilerplate wherever they appear.
     */
    protected const BOILERPLATE_LINE = '/(equal opportunity|regardless of (race|gender|age|religion)|sexual orientation|protected veteran|disabilit(y|ies) status|reasonable accommodation|e-verify|background check|apply (now|today|here)|click (the )?apply|privacy (policy|notice)|cookie|follow us|visit our (website|careers)|https?:\/\/|www\.|\S+@\S+\.\w+|health insurance|dental|vision insurance|401\s?\(?k\)?|paid time off|\bpto\b|parental leave|gym membership|stock options|salary range|\$\s?\d)/i';

    /**
     * Words that signal a requirement.
     */
    protected const REQUIREMENT_WORDS = '/\b(must|required|requirement|proficien|experience (with|in)|knowledge of|familiar|expertise|strong|solid|hands-on|degree|bachelor|master|certif|years|ability to|understanding of)\b/i';

    protected const MAX_LINE_CHARACTERS = 600;

    public function condense(string $jobDescription, int $maxCharacters): string
    {
        $lines = $this->relevantLines($jobDescription);
        $condensed = implode("\n", array_column($lines, 'text'));

        if (mb_strlen($condensed) <= $maxCharacters) {
            return $condensed;
        }

        $byScore = $lines;
        usort($byScore, fn (array $a, array $b) => [$b['score'], $a['position']] <=> [$a['score'], $b['position']]);

        $kept = [];
        $length = 0;

        foreach ($byScore as $line) {
            $lineLength = mb_strlen($line['text']) + 1;

            if ($length + $lineLength > $maxCharacters) {
                continue;
            }

            $kept[$line['position']] = $line['text'];
            $length += $lineLength;
        }

        ksort($kept);

        return implode("\n", $kept);
    }

    /**
     * Every non-boilerplate, non-duplicate line with its original position and a keyword-density score.
     *
     * @return array<int, array{position: int, text: string, score: float}>
     */
    protected function relevantLines(string $jobDescription): array
    {
        $section = 'neutral';
        $seen = [];
        $lines = [];

        foreach ($this->splitLines($jobDescription) as $position => $text) {
            if ($this->isHeading($text)) {
                $section = match (true) {
                    (bool) preg_match(self::BOILERPLATE_HEADING, $text) => 'boilerplate',
                    (bool) preg_match(self::RELEVANT_HEADING, $text) => 'relevant',
                    default => 'neutral',
                };
            }

            if ($section === 'boilerplate' || preg_match(self::BOILERPLATE_LINE, $text)) {
                continue;
            }

            $fingerprint = preg_replace('/[^a-z0-9+#]+/', '', mb_strtolower($text));
            if ($fingerprint === '' || isset($seen[$fingerprint])) {
                continue;
            }
            $seen[$fingerprint] = true;

            $lines[] = ['position' => $position, 'text' => $text, 'score' => $this->score($text, $section, $position)];
        }

        return $lines;
    }

    /**
     * Lines of the posting, with long paragraphs split into sentences so each can be judged on its own.
     *
     * @return array<int, string>
     */
    protected function splitLines(string $jobDescription): array
    {
        $lines = [];

        foreach (preg_split('/\R/u', $jobDescription) ?: [] as $line) {
            $line = trim(preg_replace('/\s+/u', ' ', $line));

            if ($line === '') {
                continue;
            }

            $parts = mb_strlen($line) > 300 ? preg_split('/(?<=[.!?;])\s+(?=\p{Lu})/u', $line) : [$line];

            foreach ($parts as $part) {
                $lines[] = mb_substr(trim($part), 0, self::MAX_LINE_CHARACTERS);
            }
        }

        return $lines;
    }

    protected function isHeading(string $text): bool
    {
        $words = preg_split('/\s+/u', preg_replace('/^[\s:*#\-\x{2022}]+|[\s:*#\-\x{2022}]+$/u', '', $text)) ?: [];

        return $words !== [] && count($words) <= 8 && mb_strlen($text) <= 70 && ! preg_match('/[.,;]$/u', $text);
    }

    protected function score(string $text, string $section, int $position): float
    {
        if ($position === 0) {
            return 100.0;
        }

        $score = 1.0;
        $score += $section === 'relevant' ? 3 : 0;
        $score += $this->isHeading($text) && preg_match(self::RELEVANT_HEADING, $text) ? 6 : 0;
        $score += preg_match('/^\s*([-*\x{2022}\x{25CF}\x{25AA}>]|\d+[.)])/u', $text) ? 1.5 : 0;
        $score += preg_match_all(self::REQUIREMENT_WORDS, $text) * 1.5;

        $technicalTerms = preg_match_all('/\b(?:[A-Z][a-z]+[A-Z]\w*|[A-Z]{2,6}s?|\w+[.#+\/]\w*|\w+\+\+|\d+\+?\s*years?)\b/u', $text);
        $score += min($technicalTerms, 6) * 0.75;

        return $score;
    }
}
