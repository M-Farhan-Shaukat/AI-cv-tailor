<?php

namespace App\Http\Controllers;

use App\Models\JobPosting;
use App\Models\JobSourceEvent;
use App\Models\JobSourceStatus;
use App\Models\LlmUsageEvent;
use App\Services\JobFeedSync;
use App\Services\JobSources\JobSourceManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminJobMetricsController extends Controller
{
    public function index(Request $request, JobFeedSync $sync): Response
    {

        return Inertia::render('Admin/JobMetrics', [
            'sync' => [
                'settings' => $sync->settings(),
                'last_run' => $sync->lastRun(),
                'next_auto_sync_at' => $sync->nextAutoSyncAt(),
                'scheduler_running' => $sync->schedulerIsRunning(),
                'intervals' => JobFeedSync::INTERVALS,
                'max_queries' => JobFeedSync::MAX_QUERIES,
            ],
            'generatedAt' => now()->toIso8601String(),
            'providers' => $this->providers(),
            'sourceEvents' => $this->sourceEvents(),
            'usage' => [
                'today' => $this->usageToday(),
                'daily' => $this->dailyUsage(),
                'topUsers' => $this->topUsers(),
            ],
            'budgets' => [
                'daily_token_limit' => (int) config('llm.daily_token_limit', 0),
                'daily_user_token_limit' => (int) config('llm.daily_user_token_limit', 0),
                'daily_request_limit' => (int) config('llm.daily_request_limit', 0),
                'daily_user_request_limit' => (int) config('llm.daily_user_request_limit', 0),
            ],
            'seo' => [
                'title' => 'Job scan operations',
                'description' => 'Provider health, feed sync status and AI usage for the job scan.',
            ],
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function providers(): array
    {
        $counts = JobPosting::query()
            ->where('is_active', true)
            ->selectRaw('provider, COUNT(*) as total')
            ->groupBy('provider')
            ->pluck('total', 'provider');

        $statuses = JobSourceStatus::query()->get()->keyBy('provider');

        $names = collect(array_keys((array) config('job_scan.sources', [])))
            ->merge($counts->keys())
            ->merge($statuses->keys())
            ->unique()
            ->sort()
            ->values();

        $sources = app(JobSourceManager::class)->all();

        return $names->map(function (string $name) use ($counts, $statuses, $sources): array {
            $status = $statuses->get($name);

            return [
                'name' => $name,
                'configured' => isset($sources[$name]) && $sources[$name]->isConfigured(),
                'setup_hint' => match ($name) {
                    'adzuna' => 'Set ADZUNA_APP_ID and ADZUNA_APP_KEY (free at developer.adzuna.com).',
                    'jooble' => 'Set JOOBLE_API_KEY (free at jooble.org/api/about).',
                    default => null,
                },
                'active_postings' => (int) ($counts[$name] ?? 0),
                'last_attempt_at' => $status?->last_attempt_at?->toIso8601String(),
                'last_success_at' => $status?->last_success_at?->toIso8601String(),
                'last_error_at' => $status?->last_error_at?->toIso8601String(),
                'last_status_code' => $status?->last_status_code,
                'last_error_message' => $status?->last_error_message,
                'consecutive_failures' => (int) ($status?->consecutive_failures ?? 0),
                'cooling_down_until' => $status?->disabled_until?->toIso8601String(),
            ];
        })->all();
    }

    /**
     * Fetch postings now for every saved search term, from every provider or just one. Runs in the
     * request, so it works without a queue worker and the admin sees the result straight away.
     */
    public function sync(Request $request, JobFeedSync $sync, JobSourceManager $sources): RedirectResponse
    {
        $validated = $request->validate([
            'provider' => ['nullable', 'string', Rule::in(array_keys($sources->all()))],
        ]);
        $provider = $validated['provider'] ?? null;

        if ($sync->settings()['queries'] === []) {
            return back()->withErrors(['sync' => 'Add at least one search term in the sync settings first.']);
        }

        if ($provider !== null && ! $sources->all()[$provider]->isConfigured()) {
            return back()->withErrors(['sync' => ucfirst($provider).' is not configured. Add its API keys to .env first.']);
        }

        set_time_limit(300);
        $summary = $sync->run('manual', $provider);

        $parts = collect($summary['providers'])
            ->map(fn (array $row, string $name): string => ucfirst($name).': '.match ($row['status']) {
                'ok' => "{$row['fetched']} fetched, {$row['created']} new",
                'unconfigured' => 'not configured',
                'cooling_down' => 'paused after repeated failures',
                default => 'failed',
            })
            ->implode(' · ');

        return back()->with('status', 'Sync finished. '.($parts !== '' ? $parts : 'No provider was available.'));
    }

    public function saveSyncSettings(Request $request, JobFeedSync $sync): RedirectResponse
    {
        $validated = $request->validate([
            'queries' => ['present', 'array', 'max:'.JobFeedSync::MAX_QUERIES],
            'queries.*' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'size:2', 'alpha'],
            'remote_only' => ['required', 'boolean'],
            'per_page' => ['required', 'integer', 'min:10', 'max:100'],
            'auto_sync' => ['required', 'boolean'],
            'interval_hours' => ['required', 'integer', Rule::in(JobFeedSync::INTERVALS)],
        ]);

        if ($validated['auto_sync'] && array_filter(array_map('trim', $validated['queries'])) === []) {
            return back()->withErrors(['queries' => 'Add at least one search term to turn on auto-sync.']);
        }

        $sync->saveSettings($validated);

        return back()->with('status', 'Sync settings saved.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function sourceEvents(): array
    {
        return JobSourceEvent::query()
            ->where('successful', false)
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (JobSourceEvent $event): array => [
                'id' => $event->id,
                'provider' => $event->provider,
                'status_code' => $event->status_code,
                'message' => $event->message,
                'created_at' => $event->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function usageToday(): array
    {
        $row = LlmUsageEvent::query()
            ->where('created_at', '>=', now()->startOfDay())
            ->selectRaw("COUNT(*) as requests, SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failures, COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(prompt_tokens), 0) as prompt_tokens, COALESCE(SUM(completion_tokens), 0) as completion_tokens")
            ->first();

        $prompt = (int) ($row->prompt_tokens ?? 0);
        $completion = (int) ($row->completion_tokens ?? 0);

        return [
            'requests' => (int) ($row->requests ?? 0),
            'failures' => (int) ($row->failures ?? 0),
            'tokens' => (int) ($row->tokens ?? 0),
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
            'estimated_cost' => $this->estimatedCost($prompt, $completion),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function dailyUsage(): array
    {
        return LlmUsageEvent::query()
            ->where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->selectRaw("DATE(created_at) as day, COUNT(*) as requests, SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failures, COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(prompt_tokens), 0) as prompt_tokens, COALESCE(SUM(completion_tokens), 0) as completion_tokens")
            ->groupBy('day')
            ->orderByDesc('day')
            ->get()
            ->map(function (LlmUsageEvent $row): array {
                $prompt = (int) $row->prompt_tokens;
                $completion = (int) $row->completion_tokens;

                return [
                    'date' => (string) $row->day,
                    'requests' => (int) $row->requests,
                    'failures' => (int) $row->failures,
                    'tokens' => (int) $row->tokens,
                    'prompt_tokens' => $prompt,
                    'completion_tokens' => $completion,
                    'estimated_cost' => $this->estimatedCost($prompt, $completion),
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function topUsers(): array
    {
        return LlmUsageEvent::query()
            ->where('created_at', '>=', now()->startOfDay())
            ->whereNotNull('user_id')
            ->selectRaw("user_id, COUNT(*) as requests, SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failures, COALESCE(SUM(total_tokens), 0) as tokens")
            ->groupBy('user_id')
            ->orderByDesc('tokens')
            ->limit(10)
            ->with('user:id,name,email')
            ->get()
            ->map(fn (LlmUsageEvent $row): array => [
                'user_id' => $row->user_id,
                'name' => $row->user?->name,
                'email' => $row->user?->email,
                'requests' => (int) $row->requests,
                'failures' => (int) $row->failures,
                'tokens' => (int) $row->tokens,
            ])
            ->all();
    }

    protected function estimatedCost(int $promptTokens, int $completionTokens): float
    {
        $cost = ($promptTokens / 1_000_000) * (float) config('llm.input_cost_per_million_tokens', 0)
            + ($completionTokens / 1_000_000) * (float) config('llm.output_cost_per_million_tokens', 0);

        return round($cost, 6);
    }
}
