<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GroqService
{
    /**
     * Groq's free tier limits requests to roughly 8,000 tokens per minute. These conservative
     * character caps (about 3.3 characters per token) keep the prompt well inside that budget.
     */
    protected const MAX_KEYWORD_JD_CHARACTERS = 8000;

    /**
     * Room for the reasoning plus up to 40 keywords with aliases. With less, a long JD can exhaust the budget
     * mid-JSON and Groq rejects the reply (json_validate_failed). Keyword listing needs little reasoning, so
     * that step runs at low effort.
     */
    protected const KEYWORD_COMPLETION_TOKENS = 3000;

    /**
     * The rewrite already receives the extracted JD keywords, so most of the budget goes to the CV:
     * trimming the CV drops its middle sections (often Projects) from the tailored resume.
     */
    protected const MAX_REWRITE_JD_CHARACTERS = 2000;

    protected const MAX_REWRITE_CV_CHARACTERS = 7500;

    protected ?string $apiKey;

    protected string $model;

    protected string $apiUrl;

    protected string $reasoningEffort;

    public function __construct(protected LlmUsageTracker $usage, protected JobDescriptionCondenser $condenser)
    {
        $this->apiKey = config('services.groq.key');
        $this->model = config('services.groq.model') ?: 'openai/gpt-oss-120b';
        $this->apiUrl = config('services.groq.url') ?: 'https://api.groq.com/openai/v1/chat/completions';
        $this->reasoningEffort = config('services.groq.reasoning_effort') ?: 'medium';
    }

    /**
     * Extract the ATS keywords a recruiter's system would search for in this job description.
     *
     * @return array{job_title: string, keywords: array<int, array{term: string, aliases: array<int, string>, category: string, importance: string}>}
     */
    public function extractJobKeywords(string $jobDescription): array
    {
        $systemPrompt = <<<'PROMPT'
        You are an ATS (Applicant Tracking System) keyword analyst, like the parsers used by Workday, Greenhouse, Lever, iCIMS and Taleo.
        Read the job description and list the keywords a recruiter would filter or rank candidates by.

        WHAT TO EXTRACT:
        - Hard skills, programming languages, frameworks, tools, platforms, databases, methodologies, practices
          (e.g. "code review", "unit testing", "documentation", "debugging"), domain knowledge, certifications,
          degree level and field of study (e.g. "Bachelor's degree", "Computer Science"), and the job title itself.
        - Only the 3-5 most important soft skills, phrased as an ATS would search them ("communication", "problem-solving").
        - Aim for 15-35 keywords and never more than 40. A short or vague JD gives fewer keywords; never pad the list.

        WHAT TO IGNORE (never return these):
        - Company marketing, benefits, culture, EEO statements and application/referral instructions
          ("share this opportunity", "refer candidates", "network", "great opportunity", "learn and grow").
        - Generic verbs and filler: "contribute", "develop", "learn", "work", "team", "motivated", "passionate", "eagerness to learn".
        - Years of experience ("3+ years"); those are knock-out questions, not keywords.

        FORMAT RULES:
        - "term": 1-3 words, spelled EXACTLY as the JD writes it (e.g. "Node.js", "CI/CD", "REST APIs").
          Use the core phrase an ATS would search: "code review" not "participate in code reviews",
          "microservices" not "microservices architecture".
        - One concept per keyword: split "MySQL or PostgreSQL" into "MySQL" and "PostgreSQL", "Agile/Scrum" into "Agile" and "Scrum".
          Standard combined terms like "CI/CD" stay as one.
        - "aliases": alternative spellings, abbreviations and close variants an ATS also accepts, e.g.
          "JavaScript" -> ["JS"], "Amazon Web Services" -> ["AWS"], "Bachelor's degree" -> ["Bachelor", "BS", "BSc", "B.S."],
          "software development" -> ["software engineering"], "code review" -> ["code reviews", "peer review"]. At most 3; empty array if none.
        - "category": one of hard_skill, tool, soft_skill, certification, education, job_title.
        - "importance": "required" if the JD marks it as must-have/required/qualification or repeats it, otherwise "preferred".
          For "X or Y" alternatives mark each "preferred".
        - "job_title": the exact role title from the JD, without location or company.

        Return ONLY JSON: {"job_title": string, "keywords": [{"term": string, "aliases": [string], "category": string, "importance": "required"|"preferred"}]}
        PROMPT;

        $shrink = fn (): array => [$systemPrompt, "JOB DESCRIPTION:\n".$this->condenser->condense($jobDescription, 4000), self::KEYWORD_COMPLETION_TOKENS];

        $result = $this->chatJson(
            $systemPrompt,
            "JOB DESCRIPTION:\n".$this->condenser->condense($jobDescription, self::MAX_KEYWORD_JD_CHARACTERS),
            self::KEYWORD_COMPLETION_TOKENS,
            $shrink,
            'keyword',
            reasoningEffort: 'low',
        );

        $keywords = collect($result['keywords'] ?? [])
            ->filter(fn ($keyword) => is_array($keyword) && filled($keyword['term'] ?? null))
            ->map(fn (array $keyword) => [
                'term' => $this->toAtsSafeText((string) $keyword['term']),
                'aliases' => array_values(array_filter(array_map(fn ($alias) => $this->toAtsSafeText((string) $alias), (array) ($keyword['aliases'] ?? [])))),
                'category' => (string) ($keyword['category'] ?? 'hard_skill'),
                'importance' => ($keyword['importance'] ?? '') === 'required' ? 'required' : 'preferred',
            ])
            ->unique(fn (array $keyword) => mb_strtolower($keyword['term']))
            ->values()
            ->all();

        if ($keywords === []) {
            throw new RuntimeException('The AI could not extract keywords from the job description. Please paste the full JD and try again.');
        }

        return [
            'job_title' => $this->toAtsSafeText((string) ($result['job_title'] ?? '')),
            'keywords' => $keywords,
        ];
    }

    /**
     * Rewrite the CV into a structured, ATS-friendly resume aligned with the job description.
     *
     * @param  array{matched: array<int, array<string, string>>, missing: array<int, array<string, string>>}  $keywordReport
     * @param  array<int, string>  $confirmedSkills  Skills the candidate confirmed they have although the CV does not mention them.
     * @return array<string, mixed>
     */
    public function tailorResume(string $cvText, string $jobDescription, string $jobTitle, array $keywordReport, array $confirmedSkills = []): array
    {
        $systemPrompt = <<<'PROMPT'
        You are a senior resume writer and ATS optimization specialist. Rewrite the candidate's CV so it gets the HIGHEST
        possible ATS match for the target job (Workday, Greenhouse, Lever, iCIMS, Taleo) while staying 100% truthful.

        GOAL: every JD keyword the candidate genuinely has must appear, spelled exactly like the JD, in the resume -
        ideally in the summary, the skills section AND at least one experience or project bullet (ATS rank keywords
        higher when they appear in context, not only in a skills list).

        TRUTHFULNESS:
        - Never invent employers, job titles, dates, degrees, certifications, metrics, tools or responsibilities.
        - A JD keyword counts as SUPPORTED when the CV shows it directly, under another name, or as a clear, necessary part
          of the work described. Examples: "MySQL" supports "SQL" and "relational databases"; "GitHub Actions" supports
          "CI/CD"; "Built RESTful APIs" supports "software development" and "backend development"; "debugging, testing"
          supports "debugging" and "testing"; "Laravel, PHP" supports "programming fundamentals" and "OOP" only if MVC/OOP
          frameworks are listed; a degree named "ADPCS"/"BSCS"/"BS CS" supports "Computer Science"; 4 years of work supports
          "1+ years of experience".
        - SKILLS THE CANDIDATE CONFIRMED (listed in the user message) are true facts: add them to skills and, where they fit
          naturally, to the summary and a relevant bullet.
        - Not supported = leave it out. A keyword you mark "supported": false must NOT appear anywhere in the resume text.
          Do not claim practices like "code review", "mentoring", "monitoring", "Agile" without evidence, and do not list
          soft skills or traits ("attention to detail", "time management") unless the CV demonstrates them.
        - Contact details, locations and spoken languages: copy only what the CV states.

        COMPLETENESS (never drop content):
        - The tailored resume must contain EVERY section and EVERY entry of the CV: all roles, all projects, all degrees,
          all certifications/courses, all languages, and any other section (achievements, awards, publications,
          volunteering, activities, interests, references, etc.). Tailoring changes wording and order of emphasis, it
          never removes sections or entries, even ones that look irrelevant to the job.
        - Sections that do not fit the fields below go in "additional_sections" with the CV's own heading as "title"
          and one string per entry in "items".

        REWRITE RULES (be thorough - a lightly edited CV is a failure):
        - "headline": the exact JD job title when the candidate's background fits it (even if more senior), else their closest real title.
        - "summary": 3-4 sentences, no first person. Start with the exact JD job title. Include years of experience if derivable
          from CV dates, and as many SUPPORTED JD keywords as read naturally (aim for 8+).
        - "skills": 3-6 categories, each with at least 2 items. Put JD keywords first, using the JD's exact spelling; then every
          other skill from the CV. Plain words only, no ratings.
        - "experience": keep every role with original title, company and dates ("Mon YYYY" or "Present"), most recent first.
          Rewrite EVERY bullet - do not copy CV bullets verbatim. Start each with a strong action verb, mirror the JD's
          responsibility wording where the CV supports it, keep real metrics, and weave in JD keywords.
          3-6 bullets per role (2-4 for internships). If the CV lists achievements separately from roles, attach them to the right role.
        - "cv_project_names": first list the name of EVERY project in the CV, in CV order, copied as written.
        - "projects": one entry for EACH name in "cv_project_names" - never merge, skip or shortlist projects, even ones
          unrelated to the job. 2-4 rewritten bullets each with JD keywords (1-3 when the CV has more than 4 projects).
        - "education": keep every entry. Expand an abbreviated degree name when it is unambiguous and keep the abbreviation,
          e.g. "Associate Degree Program in Computer Science (ADPCS)".
        - Use the JD's spelling for every keyword (e.g. "Node.js" not "NodeJS"); write full form plus acronym once,
          e.g. "Continuous Integration/Continuous Deployment (CI/CD)".
        - Plain ASCII text in every field: no markdown, emojis, bullet symbols or tables; normal "-" hyphens only.

        "keyword_coverage": one entry for EVERY JD keyword in the user message, with "supported" true/false and "evidence":
        a short VERBATIM quote (3-12 words) copied from the CV, or from the confirmed skills, that proves it. "" when unsupported.

        Return ONLY JSON with exactly this shape (use "" or [] when the CV has no data):
        {
          "name": string,
          "headline": string,
          "contact": {"email": string, "phone": string, "location": string, "linkedin": string, "github": string, "website": string},
          "summary": string,
          "skills": [{"category": string, "items": [string]}],
          "experience": [{"title": string, "company": string, "location": string, "start_date": string, "end_date": string, "bullets": [string]}],
          "cv_project_names": [string],
          "projects": [{"name": string, "technologies": [string], "link": string, "bullets": [string]}],
          "education": [{"degree": string, "institution": string, "location": string, "start_date": string, "end_date": string, "details": string}],
          "certifications": [string],
          "languages": [string],
          "additional_sections": [{"title": string, "items": [string]}],
          "keyword_coverage": [{"term": string, "supported": boolean, "evidence": string}],
          "changes": [string]
        }
        "changes": 4-6 short notes telling the candidate what you changed and why.
        PROMPT;

        $formatKeywords = fn (array $keywords) => collect($keywords)
            ->map(fn (array $keyword) => '- '.$keyword['term'].' ('.$keyword['importance'].')')
            ->implode("\n");

        $buildUserPrompt = function (float $scale) use ($jobTitle, $formatKeywords, $keywordReport, $confirmedSkills, $jobDescription, $cvText): string {
            $cvText = $this->limitForPrompt($cvText, (int) round(self::MAX_REWRITE_CV_CHARACTERS * $scale));
            $jobDescription = $this->condenser->condense($jobDescription, (int) round(self::MAX_REWRITE_JD_CHARACTERS * $scale));

            return 'TARGET JOB TITLE: '.($jobTitle ?: 'see JD')."\n\n"
                ."JD KEYWORDS ALREADY IN THE CV (keep them and make them prominent):\n".($formatKeywords($keywordReport['matched']) ?: 'none')."\n\n"
                ."JD KEYWORDS MISSING FROM THE CV (add each one the CV or confirmed skills support):\n".($formatKeywords($keywordReport['missing']) ?: 'none')."\n\n"
                .($confirmedSkills !== [] ? "SKILLS THE CANDIDATE CONFIRMED THEY HAVE:\n".implode(', ', $confirmedSkills)."\n\n" : '')
                ."JOB DESCRIPTION:\n".$jobDescription."\n\n"
                ."CANDIDATE CV:\n".$cvText;
        };

        $shrink = fn (): array => [$systemPrompt, $buildUserPrompt(0.6), 2000];

        return $this->normalizeResume($this->chatJson($systemPrompt, $buildUserPrompt(1.0), 3000, $shrink, 'tailor'));
    }

    /**
     * Keep the most useful parts of an oversized input instead of letting Groq reject the request.
     */
    protected function limitForPrompt(string $text, int $maxCharacters): string
    {
        $text = trim(preg_replace('/[ \t]+/u', ' ', $text));
        $text = trim(preg_replace("/\n{3,}/u", "\n\n", $text));

        if (mb_strlen($text) <= $maxCharacters) {
            return $text;
        }

        $headLength = (int) floor($maxCharacters * 0.65);
        $tailLength = max(0, $maxCharacters - $headLength - 48);

        return mb_substr($text, 0, $headLength)
            ."\n[... trimmed to fit the AI token limit ...]\n"
            .mb_substr($text, -$tailLength);
    }

    /**
     * @param  (callable(): array{0: string, 1: string, 2: int})|null  $shrink  Rebuilds a smaller prompt when Groq rejects the request size.
     * @return array<string, mixed>
     */
    protected function chatJson(string $systemPrompt, string $userPrompt, int $maxTokens, ?callable $shrink = null, string $scope = 'llm', ?string $reasoningEffort = null): array
    {
        if (empty($this->apiKey)) {
            throw new RuntimeException('GROQ_API_KEY is missing. Please set it in your .env file.');
        }

        $this->usage->ensureBudget();

        $attempts = $shrink === null ? 1 : 2;
        $startedAt = microtime(true);

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            $payload = [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.2,
                'max_completion_tokens' => $maxTokens,
                'response_format' => ['type' => 'json_object'],
            ];

            if (str_contains($this->model, 'gpt-oss')) {
                $payload['reasoning_effort'] = $reasoningEffort ?? $this->reasoningEffort;
            }

            $startedAt = microtime(true);

            try {
                $response = Http::withToken($this->apiKey)
                    ->acceptJson()
                    ->connectTimeout(15)
                    ->timeout(120)
                    ->retry(3, function (int $attempt, \Throwable $exception) {
                        $retryAfter = $exception instanceof RequestException
                            ? (int) $exception->response->header('retry-after')
                            : 0;

                        return min(max($retryAfter, $attempt * 3), 60) * 1000;
                    }, function (\Throwable $exception) {
                        return $exception instanceof RequestException
                            && (in_array($exception->response->status(), [429, 500, 502, 503], true)
                                || $exception->response->json('error.code') === 'json_validate_failed');
                    })
                    ->post($this->apiUrl, $payload);
            } catch (RequestException $exception) {
                $response = $exception->response;
            } catch (ConnectionException $exception) {
                $this->usage->recordFailure($scope, null, $exception->getMessage(), $this->durationMs($startedAt));
                Log::error('Groq connection error', ['message' => $exception->getMessage()]);

                throw new RuntimeException('Could not reach the Groq API. Check your internet connection and try again.');
            }

            if ($response->status() === 413 && $attempt < $attempts && $shrink !== null) {
                Log::notice('Groq rejected the prompt size, retrying with a smaller prompt');
                [$systemPrompt, $userPrompt, $maxTokens] = $shrink();

                continue;
            }

            break;
        }

        $duration = $this->durationMs($startedAt);
        $usage = (array) ($response->json('usage') ?? []);

        if ($response->failed()) {
            $message = $this->friendlyError($response);
            $this->usage->recordFailure($scope, $response->status(), $message, $duration, $usage);
            Log::error('Groq API error', ['status' => $response->status(), 'body' => $response->body()]);

            throw new RuntimeException($message);
        }

        $finishReason = (string) $response->json('choices.0.finish_reason');
        $content = trim((string) $response->json('choices.0.message.content'));
        $content = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $content);
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            $message = $finishReason === 'length'
                ? 'The AI response was cut off because the resume is too long. Please shorten the job description and try again.'
                : 'The AI returned an unexpected response. Please try again.';

            $this->usage->recordFailure($scope, $response->status(), $message, $duration, $usage);
            Log::error('Groq returned invalid JSON', [
                'finish_reason' => $finishReason,
                'usage' => $response->json('usage'),
                'content' => mb_substr($content, 0, 2000),
            ]);

            throw new RuntimeException($message);
        }

        $this->usage->recordSuccess($scope, $usage, $duration);

        return $decoded;
    }

    protected function durationMs(float $startedAt): int
    {
        return (int) round((microtime(true) - $startedAt) * 1000);
    }

    protected function friendlyError(Response $response): string
    {
        return match (true) {
            $response->status() === 401 => 'Groq rejected the API key. Check GROQ_API_KEY in your .env file.',
            $response->status() === 413 => 'The request is still too large for Groq\'s free-tier token limit. Please shorten the job description and try again.',
            $response->status() === 429 => 'Groq rate limit reached. Please wait a minute and try again.',
            $response->json('error.code') === 'json_validate_failed' => 'The AI could not produce a valid resume for this CV and job description. Please try again, or shorten the job description.',
            default => 'AI request failed ('.$response->status().'): '.($response->json('error.message') ?? 'unknown error'),
        };
    }

    /**
     * Replace typographic characters that some ATS parsers mangle with plain equivalents.
     */
    public function toAtsSafeText(string $value): string
    {
        $value = strtr($value, [
            "\u{2010}" => '-', "\u{2011}" => '-', "\u{2012}" => '-', "\u{2013}" => '-', "\u{2014}" => '-', "\u{2212}" => '-',
            "\u{2018}" => "'", "\u{2019}" => "'", "\u{201C}" => '"', "\u{201D}" => '"',
            "\u{2022}" => '', "\u{25CF}" => '', "\u{00A0}" => ' ', "\u{202F}" => ' ', "\u{2026}" => '...',
        ]);

        return trim(preg_replace('/\s+/u', ' ', preg_replace('/^[\s\-*]+/u', '', $value)));
    }

    /**
     * Coerce the model output into a predictable shape so the template never breaks.
     *
     * @param  array<string, mixed>  $resume
     * @return array<string, mixed>
     */
    protected function normalizeResume(array $resume): array
    {
        $string = fn ($value) => is_scalar($value) ? $this->toAtsSafeText((string) $value) : '';
        $strings = fn ($value) => array_values(array_filter(array_map($string, is_array($value) ? $value : []), 'strlen'));
        $list = fn ($value) => array_values(array_filter(is_array($value) ? $value : [], 'is_array'));
        $contact = is_array($resume['contact'] ?? null) ? $resume['contact'] : [];

        return [
            'name' => $string($resume['name'] ?? ''),
            'headline' => $string($resume['headline'] ?? ''),
            'contact' => collect(['email', 'phone', 'location', 'linkedin', 'github', 'website'])
                ->mapWithKeys(fn (string $key) => [$key => $string($contact[$key] ?? '')])
                ->all(),
            'summary' => $string($resume['summary'] ?? ''),
            'skills' => collect($list($resume['skills'] ?? []))
                ->map(fn (array $group) => ['category' => $string($group['category'] ?? ''), 'items' => $strings($group['items'] ?? [])])
                ->filter(fn (array $group) => $group['items'] !== [])
                ->values()
                ->all(),
            'experience' => collect($list($resume['experience'] ?? []))
                ->map(fn (array $job) => [
                    'title' => $string($job['title'] ?? ''),
                    'company' => $string($job['company'] ?? ''),
                    'location' => $string($job['location'] ?? ''),
                    'start_date' => $string($job['start_date'] ?? ''),
                    'end_date' => $string($job['end_date'] ?? ''),
                    'bullets' => $strings($job['bullets'] ?? []),
                ])
                ->all(),
            'cv_project_names' => $strings($resume['cv_project_names'] ?? []),
            'projects' => collect($list($resume['projects'] ?? []))
                ->map(fn (array $project) => [
                    'name' => $string($project['name'] ?? ''),
                    'technologies' => $strings($project['technologies'] ?? []),
                    'link' => $string($project['link'] ?? ''),
                    'bullets' => $strings($project['bullets'] ?? []),
                ])
                ->all(),
            'education' => collect($list($resume['education'] ?? []))
                ->map(fn (array $degree) => [
                    'degree' => $string($degree['degree'] ?? ''),
                    'institution' => $string($degree['institution'] ?? ''),
                    'location' => $string($degree['location'] ?? ''),
                    'start_date' => $string($degree['start_date'] ?? ''),
                    'end_date' => $string($degree['end_date'] ?? ''),
                    'details' => $string($degree['details'] ?? ''),
                ])
                ->all(),
            'certifications' => $strings($resume['certifications'] ?? []),
            'languages' => $strings($resume['languages'] ?? []),
            'additional_sections' => collect($list($resume['additional_sections'] ?? []))
                ->map(fn (array $section) => ['title' => $string($section['title'] ?? ''), 'items' => $strings($section['items'] ?? [])])
                ->filter(fn (array $section) => $section['title'] !== '' && $section['items'] !== [])
                ->values()
                ->all(),
            'keyword_coverage' => collect($list($resume['keyword_coverage'] ?? []))
                ->filter(fn (array $item) => $string($item['term'] ?? '') !== '')
                ->map(fn (array $item) => [
                    'term' => $string($item['term']),
                    'supported' => filter_var($item['supported'] ?? false, FILTER_VALIDATE_BOOLEAN),
                    'evidence' => $string($item['evidence'] ?? ''),
                ])
                ->values()
                ->all(),
            'changes' => $strings($resume['changes'] ?? []),
        ];
    }
}
