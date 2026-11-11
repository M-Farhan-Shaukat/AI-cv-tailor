<?php

namespace App\Services;

use Illuminate\Http\Request;

/**
 * Decides how many missing job keywords the viewer may see. Free users see only the most important
 * few (required first); Pro users see all of them. Hidden keywords are removed on the server, before
 * the response is built, so they never reach the browser: not in the page, the network tab or the console.
 *
 * Only the missing list and the keyword tip name missing keywords, so those are the parts rewritten.
 * Matched keywords are the candidate's own and stay visible.
 */
class KeywordVisibility
{
    public function __construct(protected UsageQuota $quota, protected AtsScorer $scorer) {}

    /**
     * How many missing keywords the viewer may see, or null for all of them.
     */
    public function visibleLimit(Request $request): ?int
    {
        return $this->quota->plan($request) === UsageQuota::PRO
            ? null
            : max(0, (int) config('billing.free_visible_missing_keywords', 3));
    }

    /**
     * A score report (or a job match) with the missing keywords cut down to what the viewer may see.
     * Adds "missing_total" and "missing_hidden" so the page can still say how many there are.
     *
     * @param  array<string, mixed>|null  $report
     * @return array<string, mixed>|null
     */
    public function forViewer(?array $report, Request $request): ?array
    {
        return $report === null ? null : $this->limitMissing($report, $this->visibleLimit($request));
    }

    /**
     * @param  array<string, mixed>  $report
     * @return array<string, mixed>
     */
    public function limitMissing(array $report, ?int $limit): array
    {
        $missing = collect($report['missing'] ?? [])
            ->sortBy(fn (array $keyword): int => ($keyword['importance'] ?? '') === 'required' ? 0 : 1)
            ->values();
        $visible = $limit === null ? $missing : $missing->take($limit);
        $hidden = $missing->count() - $visible->count();

        $report['missing'] = $visible->all();
        $report['missing_total'] = $missing->count();
        $report['missing_hidden'] = $hidden;

        if (isset($report['breakdown']['keywords']) && is_array($report['breakdown']['keywords'])) {
            $skillsOnlyTerms = collect($report['matched'] ?? [])
                ->filter(fn (array $keyword): bool => ($keyword['in_context'] ?? true) === false)
                ->pluck('term')
                ->all();

            $report['breakdown']['keywords']['tip'] = $this->scorer->keywordTip($visible->all(), $skillsOnlyTerms, $hidden);
        }

        return $report;
    }
}
