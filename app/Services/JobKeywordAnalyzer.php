<?php

namespace App\Services;

use App\Models\JobPosting;

/**
 * Extracts ATS keywords for a posting once and caches them, because keyword
 * extraction is the expensive part of scanning many jobs.
 */
class JobKeywordAnalyzer
{
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
}
