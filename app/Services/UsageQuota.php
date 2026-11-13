<?php

namespace App\Services;

use App\Enums\ResumeTemplate;
use App\Models\TailoredResume;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * What the visitor's plan allows: how many tailored CVs they may create and which templates they may
 * use. Free covers guests and signed-in users without Pro. Pro comes from, in order: being an admin, an
 * active Stripe subscription, a one-off rupee payment (JazzCash, Easypaisa or bank transfer), a trial
 * an admin gave the account, or a trial an admin opened for every account. Limits are counted per calendar month, except for a trial with its own CV limit, which is
 * counted from the start of the trial until it ends.
 *
 * Signed-in users are counted by account. Guests are counted by browser session and, unless
 * disabled in config/billing.php, by IP address so clearing cookies does not reset the quota.
 */
class UsageQuota
{
    public const FREE = 'free';

    public const PRO = 'pro';

    public const SOURCE_FREE = 'free';

    public const SOURCE_ADMIN = 'admin';

    public const SOURCE_SUBSCRIPTION = 'subscription';

    public const SOURCE_PAID = 'paid';

    public const SOURCE_GIFT = 'gift';

    public const SOURCE_TRIAL = 'trial';

    public function __construct(protected ProTrial $proTrial) {}

    public function isPro(?User $user): bool
    {
        return $this->entitlement($user)['plan'] === self::PRO;
    }

    public function plan(Request $request): string
    {
        return $this->entitlement($request->user())['plan'];
    }

    /**
     * The plan an account (or a guest, for null) is on, where it comes from, its CV limit (0 means
     * unlimited) and the window that limit is counted in.
     *
     * @return array{plan: string, source: string, limit: int, counts_from: Carbon, resets_at: Carbon, trial_ends_at: Carbon|null, limit_covers_trial: bool, paid_until: Carbon|null}
     */
    public function entitlement(?User $user): array
    {
        if ($user !== null && ($user->isAdmin() || $user->subscribed((string) config('billing.subscription_type', 'default')))) {
            return $this->monthly(self::PRO, $user->isAdmin() ? self::SOURCE_ADMIN : self::SOURCE_SUBSCRIPTION, (int) config('billing.pro_monthly_tailors', 0));
        }

        if ($user !== null && $user->hasPaidPro()) {
            return [...$this->monthly(self::PRO, self::SOURCE_PAID, (int) config('billing.pro_monthly_tailors', 0)), 'paid_until' => $user->pro_paid_until];
        }

        if ($user !== null && $user->hasComplimentaryPro()) {
            return $this->trial(self::SOURCE_GIFT, $user->pro_started_at, $user->pro_until, $user->pro_tailor_limit);
        }

        $siteTrial = $user !== null ? $this->proTrial->active() : null;

        if ($siteTrial !== null) {
            return $this->trial(self::SOURCE_TRIAL, $siteTrial['starts_at'], $siteTrial['ends_at'], $siteTrial['tailor_limit']);
        }

        return $this->monthly(self::FREE, self::SOURCE_FREE, (int) config('billing.free_monthly_tailors', 1));
    }

    /**
     * Tailored CVs allowed in the current window on the visitor's plan; 0 means unlimited.
     */
    public function limit(Request $request): int
    {
        return $this->entitlement($request->user())['limit'];
    }

    public function used(Request $request): int
    {
        return $this->usage($request, $this->entitlement($request->user())['counts_from'])->count();
    }

    /**
     * Tailored CVs left in the current window, or null when the plan is unlimited.
     */
    public function remaining(Request $request): ?int
    {
        return $this->summary($request)['remaining'];
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
     * @return array{plan: string, source: string, limit: int, used: int, remaining: int|null, resets_at: string, trial_ends_at: string|null, limit_covers_trial: bool, paid_until: string|null}
     */
    public function summary(Request $request): array
    {
        $entitlement = $this->entitlement($request->user());

        return $this->buildSummary($entitlement, $this->usage($request, $entitlement['counts_from'])->count());
    }

    /**
     * The same summary for any account, as the admin panel shows it.
     *
     * @return array{plan: string, source: string, limit: int, used: int, remaining: int|null, resets_at: string, trial_ends_at: string|null, limit_covers_trial: bool, paid_until: string|null}
     */
    public function summaryForUser(User $user): array
    {
        $entitlement = $this->entitlement($user);
        $used = TailoredResume::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $entitlement['counts_from'])
            ->count();

        return $this->buildSummary($entitlement, $used);
    }

    /**
     * @return array{plan: string, source: string, limit: int, counts_from: Carbon, resets_at: Carbon, trial_ends_at: Carbon|null, limit_covers_trial: bool, paid_until: Carbon|null}
     */
    protected function monthly(string $plan, string $source, int $limit): array
    {
        return [
            'plan' => $plan,
            'source' => $source,
            'limit' => $limit,
            'counts_from' => now()->startOfMonth(),
            'resets_at' => now()->startOfMonth()->addMonth(),
            'trial_ends_at' => null,
            'limit_covers_trial' => false,
            'paid_until' => null,
        ];
    }

    /**
     * Pro until the trial ends. Without its own CV limit it follows the normal monthly Pro limit;
     * with one, every CV tailored since the trial started counts.
     *
     * @return array{plan: string, source: string, limit: int, counts_from: Carbon, resets_at: Carbon, trial_ends_at: Carbon|null, limit_covers_trial: bool, paid_until: Carbon|null}
     */
    protected function trial(string $source, ?Carbon $startsAt, Carbon $endsAt, ?int $tailorLimit): array
    {
        if ($tailorLimit === null) {
            return [...$this->monthly(self::PRO, $source, (int) config('billing.pro_monthly_tailors', 0)), 'trial_ends_at' => $endsAt];
        }

        return [
            'plan' => self::PRO,
            'source' => $source,
            'limit' => $tailorLimit,
            'counts_from' => $startsAt ?? now()->startOfMonth(),
            'resets_at' => $endsAt,
            'trial_ends_at' => $endsAt,
            'limit_covers_trial' => true,
            'paid_until' => null,
        ];
    }

    /**
     * @param  array{plan: string, source: string, limit: int, counts_from: Carbon, resets_at: Carbon, trial_ends_at: Carbon|null, limit_covers_trial: bool, paid_until: Carbon|null}  $entitlement
     * @return array{plan: string, source: string, limit: int, used: int, remaining: int|null, resets_at: string, trial_ends_at: string|null, limit_covers_trial: bool, paid_until: string|null}
     */
    protected function buildSummary(array $entitlement, int $used): array
    {
        $limit = $entitlement['limit'];

        return [
            'plan' => $entitlement['plan'],
            'source' => $entitlement['source'],
            'limit' => $limit,
            'used' => $used,
            'remaining' => $limit === 0 ? null : max(0, $limit - $used),
            'resets_at' => $entitlement['resets_at']->toDateString(),
            'trial_ends_at' => $entitlement['trial_ends_at']?->toIso8601String(),
            'limit_covers_trial' => $entitlement['limit_covers_trial'],
            'paid_until' => $entitlement['paid_until']?->toIso8601String(),
        ];
    }

    /**
     * @return Builder<TailoredResume>
     */
    protected function usage(Request $request, Carbon $since): Builder
    {
        $user = $request->user();
        $query = TailoredResume::query()->where('created_at', '>=', $since);

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
