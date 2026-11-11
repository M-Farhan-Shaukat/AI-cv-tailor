<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\TailoredResume;
use App\Models\User;
use App\Models\UserResume;
use App\Services\LlmUsageTracker;
use App\Services\UsageQuota;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    protected const PER_PAGE = 20;

    /**
     * Months of Pro an admin can give without payment; 0 removes it.
     */
    public const COMPLIMENTARY_PRO_MONTHS = [0, 1, 3, 6, 12];

    public function index(Request $request, UsageQuota $quota): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'unverified'])],
            'plan' => ['nullable', Rule::in([UsageQuota::FREE, UsageQuota::PRO])],
        ]);

        $users = User::query()
            ->with('subscriptions')
            ->withCount(['tailoredResumes', 'resumes'])
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"),
            ))
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when(($filters['status'] ?? null) === 'active', fn (Builder $query) => $query->whereNull('suspended_at'))
            ->when(($filters['status'] ?? null) === 'suspended', fn (Builder $query) => $query->whereNotNull('suspended_at'))
            ->when(($filters['status'] ?? null) === 'unverified', fn (Builder $query) => $query->whereNull('email_verified_at'))
            ->when(($filters['plan'] ?? null) === UsageQuota::PRO, fn (Builder $query) => $query->where(fn (Builder $query) => $this->wherePro($query)))
            ->when(($filters['plan'] ?? null) === UsageQuota::FREE, fn (Builder $query) => $query->whereNot(fn (Builder $query) => $this->wherePro($query)))
            ->latest()
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (User $user): array => [
                ...$this->summary($user),
                'plan' => $quota->isPro($user) ? UsageQuota::PRO : UsageQuota::FREE,
                'tailored_resumes_count' => $user->tailored_resumes_count,
                'resumes_count' => $user->resumes_count,
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $filters,
            'roles' => UserRole::options(),
            'seo' => ['title' => 'Users'],
        ]);
    }

    public function show(Request $request, User $user, UsageQuota $quota, LlmUsageTracker $usage): Response
    {
        $subscription = $user->subscription((string) config('billing.subscription_type', 'default'));

        return Inertia::render('Admin/Users/Show', [
            'user' => [
                ...$this->summary($user),
                'pro_until' => $user->pro_until?->toIso8601String(),
                'has_stripe_account' => $user->hasStripeId(),
                'is_configured_admin' => $user->isConfiguredAdmin(),
            ],
            'billing' => $quota->summaryForUser($user),
            'subscription' => $subscription === null ? null : [
                'status' => $subscription->stripe_status,
                'active' => $subscription->valid(),
                'ends_at' => $subscription->ends_at?->toIso8601String(),
                'created_at' => $subscription->created_at?->toIso8601String(),
            ],
            'aiUsageToday' => $usage->today($user->id),
            'counts' => [
                'saved_jobs' => $user->savedJobs()->count(),
                'saved_searches' => $user->savedSearches()->count(),
                'tailored_resumes' => $user->tailoredResumes()->count(),
            ],
            'uploadedResumes' => $user->resumes()->latest()->get()->map(fn (UserResume $resume): array => [
                'id' => $resume->id,
                'original_filename' => $resume->original_filename,
                'is_primary' => $resume->is_primary,
                'characters' => mb_strlen((string) $resume->extracted_text),
                'preview' => mb_substr((string) $resume->extracted_text, 0, 1500),
                'created_at' => $resume->created_at?->toIso8601String(),
            ]),
            'tailoredResumes' => $user->tailoredResumes()->latest()->limit(25)->get()->map(fn (TailoredResume $resume): array => [
                'id' => $resume->id,
                'job_title' => $resume->score_report['job_title'] ?? null,
                'template' => $resume->template?->label(),
                'original_score' => $resume->original_score,
                'match_score' => $resume->match_score,
                'created_at' => $resume->created_at?->toIso8601String(),
            ]),
            'permissions' => [
                'manage' => $request->user()->can('manage-user', $user),
                'manage_roles' => $request->user()->can('manage-roles'),
                'is_self' => $request->user()->is($user),
            ],
            'roles' => UserRole::options(),
            'proMonths' => self::COMPLIMENTARY_PRO_MONTHS,
            'seo' => ['title' => $user->name.' · Users'],
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();
        $role = UserRole::from($validated['role']);

        if ($role !== $user->role) {
            Gate::authorize('manage-roles');
            $this->ensureNotSelf($request, $user, 'You cannot change your own role.');
        }

        $user->forceFill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $role,
            'email_verified_at' => $validated['email_verified'] ? ($user->email_verified_at ?? now()) : null,
        ])->save();

        return back()->with('status', 'User details saved.');
    }

    /**
     * Give (or take away) Pro without a Stripe subscription, for support cases and partners.
     */
    public function complimentaryPro(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-user', $user);

        $months = (int) $request->validate([
            'months' => ['required', 'integer', Rule::in(self::COMPLIMENTARY_PRO_MONTHS)],
        ])['months'];

        $user->forceFill(['pro_until' => $months === 0 ? null : now()->addMonths($months)])->save();

        return back()->with('status', $months === 0 ? 'Complimentary Pro removed.' : "Pro given for {$months} month".($months === 1 ? '' : 's').'.');
    }

    public function suspend(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-user', $user);
        $this->ensureNotSelf($request, $user, 'You cannot suspend your own account.');

        $user->forceFill(['suspended_at' => now()])->save();

        return back()->with('status', $user->name.' is suspended and will be signed out.');
    }

    public function unsuspend(User $user): RedirectResponse
    {
        Gate::authorize('manage-user', $user);

        $user->forceFill(['suspended_at' => null])->save();

        return back()->with('status', $user->name.' can sign in again.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('manage-user', $user);
        $this->ensureNotSelf($request, $user, 'You cannot delete your own account here.');

        $subscription = $user->subscription((string) config('billing.subscription_type', 'default'));

        if ($subscription !== null && $subscription->valid() && ! $subscription->onGracePeriod()) {
            throw ValidationException::withMessages([
                'user' => 'This user has an active Pro subscription. Cancel it in Stripe first so they are not charged again.',
            ]);
        }

        $user->delete();

        return to_route('admin.users.index')->with('status', 'User deleted.');
    }

    public function destroyResume(User $user, UserResume $userResume): RedirectResponse
    {
        Gate::authorize('manage-user', $user);
        abort_unless($userResume->user_id === $user->id, 404);

        $userResume->delete();

        return back()->with('status', 'Uploaded CV deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function summary(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->isConfiguredAdmin() ? 'Super admin (config)' : $user->role->label(),
            'email_verified' => $user->hasVerifiedEmail(),
            'suspended' => $user->isSuspended(),
            'complimentary_pro' => $user->hasComplimentaryPro(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  Builder<User>  $query
     */
    protected function wherePro(Builder $query): void
    {
        $query->where('pro_until', '>', now())
            ->orWhereIn('role', [UserRole::Admin->value, UserRole::SuperAdmin->value])
            ->orWhereHas('subscriptions', fn (Builder $query) => $query->active());
    }

    protected function ensureNotSelf(Request $request, User $user, string $message): void
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => $message]);
        }
    }
}
