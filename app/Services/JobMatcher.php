<?php

namespace App\Services;

use App\Models\JobPosting;

/**
 * Scores a candidate's CV against a stored job posting using the same
 * deterministic ATS scorer as the resume tailor.
 */
class JobMatcher
{
    public function __construct(
        protected JobKeywordAnalyzer $analyzer,
        protected AtsScorer $scorer,
    ) {}

    /**
     * Stable key for one owner + one resume, so matches never leak between resumes or sessions.
     */
    public function matcherKey(?int $userId, ?string $sessionId, string $resumeHash): string
    {
        $owner = $userId !== null ? 'user:'.$userId : 'session:'.($sessionId ?? 'guest');

        return hash('sha256', $owner.'|'.$resumeHash);
    }

    /**
     * @return array{
     *     score: int,
     *     breakdown: array<string, array<string, mixed>>,
     *     matched: array<int, array<string, mixed>>,
     *     missing: array<int, array<string, mixed>>,
     *     job_title: string
     * }
     */
    public function score(JobPosting $posting, string $cvText): array
    {
        $analysis = $this->analyzer->analyze($posting);
        $report = $this->scorer->score($cvText, $analysis['keywords'], $posting->title);

        return [
            'score' => $report['score'],
            'breakdown' => $report['breakdown'],
            'matched' => $report['matched'],
            'missing' => $report['missing'],
            'job_title' => $posting->title,
        ];
    }
}
