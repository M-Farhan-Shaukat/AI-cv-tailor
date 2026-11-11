<?php

namespace App\Services;

use App\Enums\ResumeTemplate;
use App\Models\TailoredResume;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * What the visitor's plan allows: how many tailored CVs they may create this calendar month and which
 * templates they may use. Free covers guests and signed-in users without a subscription; Pro is an
 * active Stripe subscription (admins are treated as Pro).
 *
 * Signed-in users are counted by account. Guests are counted by browser session and, unless
 * disabled in config/billing.php, by IP address so clearing cookies does not reset the quota.
 */
class UsageQuota
{
    public const FREE = 'free';

    public const PRO = 'pro';

    public function isPro(?User $user): bool
    {
        return $user !== null
            && ($user->isAdmin() || $user->hasComplimentaryPro() || $user->subscribed((string) config('billing.subscription_type', 'default')));
    }

    public function plan(Request $request): string
    {
        return $this->isPro($request->user()) ? self::PRO : self::FREE;
    }

    /**
     * Tailored CVs allowed per month on the visitor's plan; 0 means unlimited.
     */
    public function monthlyLimit(Request $request): int
    {
        return $this->plan($request) === self::PRO
            ? (int) config('billing.pro_monthly_tailors', 0)
            : (int) config('billing.free_monthly_tailors', 1);
    }

    public function usedThisMonth(Request $request): int
    {
        return $this->monthlyUsage($request)->count();
    }

    /**
     * Tailored CVs left this month, or null when the plan is unlimited.
     */
    public function remaining(Request $request): ?int
    {
        $limit = $this->monthlyLimit($request);

        return $limit === 0 ? null : max(0, $limit - $this->usedThisMonth($request));
    }

    public function canTailor(Request $request): bool
    {
        return $this->remaining($request) !== 0;
    }

    public function allowsTemplate(Request $request, ResumeTemplate $template): bool
    {
        return ! $template->isPremium() || $this->plan($request) === self::PRO;
    }

    /**
     * What the front end needs to show the plan, the quota and upgrade prompts.
     *
     * @return array{plan: string, limit: int, used: int, remaining: int|null, resets_at: string}
     */
    public function summary(Request $request): array
    {
        return $this->buildSummary($this->plan($request), $this->monthlyLimit($request), $this->usedThisMonth($request));
    }

    /**
     * The same summary for any account, as the admin panel shows it.
     *
     * @return array{plan: string, limit: int, used: int, remaining: int|null, resets_at: string}
     */
    public function summaryForUser(User $user): array
    {
        $plan = $this->isPro($user) ? self::PRO : self::FREE;
        $limit = $plan === self::PRO
            ? (int) config('billing.pro_monthly_tailors', 0)
            : (int) config('billing.free_monthly_tailors', 1);
        $used = TailoredResume::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        return $this->buildSummary($plan, $limit, $used);
    }

    /**
     * @return array{plan: string, limit: int, used: int, remaining: int|null, resets_at: string}
     */
    protected function buildSummary(string $plan, int $limit, int $used): array
    {
        return [
            'plan' => $plan,
            'limit' => $limit,
            'used' => $used,
            'remaining' => $limit === 0 ? null : max(0, $limit - $used),
            'resets_at' => now()->startOfMonth()->addMonth()->toDateString(),
        ];
    }

    /**
     * @return Builder<TailoredResume>
     */
    protected function monthlyUsage(Request $request): Builder
    {
        $user = $request->user();
        $query = TailoredResume::query()->where('created_at', '>=', now()->startOfMonth());

        if ($user !== null) {
            return $query->where('user_id', $user->id);
        }

        $sessionId = $request->hasSession() ? $request->session()->getId() : null;
        $ip = config('billing.guest_limit_by_ip', true) ? $request->ip() : null;

        return $query
            ->whereNull('user_id')
            ->where(function (Builder $query) use ($sessionId, $ip): void {
                $query->where('session_id', $sessionId ?? '')
                    ->when($ip !== null, fn (Builder $query) => $query->orWhere('client_ip', $ip));
            });
    }
}
