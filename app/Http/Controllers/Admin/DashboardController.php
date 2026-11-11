<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TailoredResume;
use App\Models\User;
use App\Services\GroqKeyPool;
use App\Services\LlmUsageTracker;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Subscription;

class DashboardController extends Controller
{
    protected const TREND_DAYS = 14;

    public function __invoke(LlmUsageTracker $usage, GroqKeyPool $keys): Response
    {
        $monthStart = now()->startOfMonth();
        $improvement = TailoredResume::query()
            ->where('created_at', '>=', $monthStart)
            ->whereNotNull('match_score')
            ->whereNotNull('original_score')
            ->selectRaw('AVG(match_score - original_score) as average')
            ->value('average');

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users' => User::query()->count(),
                'new_users_7_days' => User::query()->where('created_at', '>=', now()->subDays(7))->count(),
                'pro_subscribers' => Subscription::query()->active()->distinct()->count('user_id'),
                'complimentary_pro' => User::query()->where('pro_until', '>', now())->count(),
                'suspended' => User::query()->whereNotNull('suspended_at')->count(),
                'tailored_today' => TailoredResume::query()->where('created_at', '>=', now()->startOfDay())->count(),
                'tailored_month' => TailoredResume::query()->where('created_at', '>=', $monthStart)->count(),
                'tailored_total' => TailoredResume::query()->count(),
                'average_improvement' => $improvement === null ? null : round((float) $improvement, 1),
            ],
            'ai' => [
                'today' => $usage->today(),
                'keys' => count($keys->keys()),
                'paused_keys' => collect($keys->statuses())->where('paused_seconds', '>', 0)->count(),
            ],
            'trend' => $this->dailyTailoring(),
            'recentUsers' => User::query()->latest()->limit(6)->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'created_at' => $user->created_at?->toIso8601String(),
                ]),
            'recentResumes' => TailoredResume::query()->with('user:id,name')->latest()->limit(8)->get()
                ->map(fn (TailoredResume $resume): array => [
                    'id' => $resume->id,
                    'user' => $resume->user?->only(['id', 'name']),
                    'job_title' => $resume->score_report['job_title'] ?? null,
                    'original_score' => $resume->original_score,
                    'match_score' => $resume->match_score,
                    'created_at' => $resume->created_at?->toIso8601String(),
                ]),
            'seo' => ['title' => 'Admin dashboard'],
        ]);
    }

    /**
     * Tailored resumes per day for the last two weeks, oldest first, with empty days filled in.
     *
     * @return array<int, array{date: string, count: int}>
     */
    protected function dailyTailoring(): array
    {
        $since = now()->subDays(self::TREND_DAYS - 1)->startOfDay();
        $counts = TailoredResume::query()
            ->where('created_at', '>=', $since)
            ->get(['created_at'])
            ->countBy(fn (TailoredResume $resume): string => $resume->created_at->toDateString());

        return collect(range(0, self::TREND_DAYS - 1))
            ->map(function (int $offset) use ($since, $counts): array {
                $date = Carbon::parse($since)->addDays($offset)->toDateString();

                return ['date' => $date, 'count' => (int) ($counts[$date] ?? 0)];
            })
            ->all();
    }
}
