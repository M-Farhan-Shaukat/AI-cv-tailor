<?php

namespace App\Services;

use App\Models\JobDescriptionAnalysis;
use App\Models\JobPosting;

/**
 * Extracts ATS keywords for a posting once and caches them, because keyword
 * extraction is the expensive part of scanning many jobs.
 */
class JobKeywordAnalyzer
{
    /**
     * Raise when the keyword extraction prompt changes, so stored analyses are made again.
     */
    public const ANALYSIS_VERSION = 1;

    public function __construct(protected GroqService $groq) {}

    /**
     * @return array{job_title: string, keywords: array<int, array<string, mixed>>}
     */
    public function analyze(JobPosting $posting): array
    {
        $hash = hash('sha256', $posting->description);

        if (is_array($posting->keywords) && $posting->keywords !== [] && $posting->keywords_hash === $hash) {
            return [
                'job_title' => $posting->title,
                'keywords' => $posting->keywords,
            ];
        }

        $analysis = $this->groq->extractJobKeywords($posting->description);

        $posting->forceFill([
            'keywords' => $analysis['keywords'],
            'keywords_hash' => $hash,
        ])->save();

        return $analysis;
    }

    /**
     * Keywords for a pasted job description. Stored by a hash of the text, so the same job description
     * always gets the same keywords and scoring the same CV against it gives the same score every time.
     *
     * @return array{job_title: string, keywords: array<int, array<string, mixed>>}
     */
    public function analyzeText(string $jobDescription): array
    {
        $hash = $this->textHash($jobDescription);
        $stored = JobDescriptionAnalysis::query()->where('hash', $hash)->first();

        if ($stored !== null && $stored->keywords !== []) {
            return [
                'job_title' => $stored->job_title,
                'keywords' => $stored->keywords,
            ];
        }

        $analysis = $this->groq->extractJobKeywords($jobDescription);

        JobDescriptionAnalysis::query()->updateOrCreate(
            ['hash' => $hash],
            ['job_title' => $analysis['job_title'], 'keywords' => $analysis['keywords']],
        );

        return $analysis;
    }

    /**
     * Ignores differences in spacing and line breaks, which change between copy-pastes of the same job.
     * The version prefix lets a change to the extraction prompt start fresh analyses.
     */
    protected function textHash(string $jobDescription): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $jobDescription));

        return hash('sha256', self::ANALYSIS_VERSION.'|'.$text);
    }
}
