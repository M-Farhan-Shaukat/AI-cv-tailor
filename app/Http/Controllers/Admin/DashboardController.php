<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\LlmUsageEvent;
use App\Models\Payment;
use App\Models\TailoredResume;
use App\Models\User;
use App\Services\GroqKeyPool;
use App\Services\LlmUsageTracker;
use App\Services\TrafficTracker;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Subscription;

class DashboardController extends Controller
{
    protected const TREND_DAYS = 14;

    public function __invoke(LlmUsageTracker $usage, GroqKeyPool $keys, TrafficTracker $traffic): Response
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
                'paid_pro' => User::query()->where('pro_paid_until', '>', now())->count(),
                'payments_awaiting_review' => Payment::query()->where('status', PaymentStatus::AwaitingReview)->count(),
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
            'traffic' => $traffic->daily(self::TREND_DAYS),
            'signups' => $this->dailySignups(),
            'aiTrend' => $this->dailyAiRequests(),
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
     * New accounts per day for the last two weeks.
     *
     * @return array<int, array{date: string, count: int}>
     */
    protected function dailySignups(): array
    {
        return $this->perDay(User::query(), fn (array $models): array => ['count' => count($models)]);
    }

    /**
     * AI requests per day for the last two weeks, split into succeeded and failed.
     *
     * @return array<int, array{date: string, succeeded: int, failed: int}>
     */
    protected function dailyAiRequests(): array
    {
        return $this->perDay(LlmUsageEvent::query(), function (array $events): array {
            $failed = collect($events)->where('status', '!=', 'success')->count();

            return ['succeeded' => count($events) - $failed, 'failed' => $failed];
        }, ['created_at', 'status']);
    }

    /**
     * Groups a model's rows from the last two weeks by day, oldest first, with empty days filled in.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @param  callable(array<int, TModel>): array<string, int>  $summarize
     * @param  array<int, string>  $columns
     * @return array<int, array<string, int|string>>
     */
    protected function perDay(Builder $query, callable $summarize, array $columns = ['created_at']): array
    {
        $since = now()->subDays(self::TREND_DAYS - 1)->startOfDay();
        $byDay = $query->where('created_at', '>=', $since)
            ->get($columns)
            ->groupBy(fn (Model $model): string => $model->created_at->toDateString());

        return collect(range(0, self::TREND_DAYS - 1))
            ->map(function (int $offset) use ($since, $byDay, $summarize): array {
                $date = Carbon::parse($since)->addDays($offset)->toDateString();

                return ['date' => $date, ...$summarize($byDay->get($date)?->all() ?? [])];
            })
            ->all();
    }
}
