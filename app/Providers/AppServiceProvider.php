<?php

namespace App\Providers;

use App\Models\User;
use App\Services\LlmUsageTracker;
use App\Services\SiteSettings;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(LlmUsageTracker::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Settings saved in Admin → Settings (Stripe, email, billing, job providers) override .env.
        $this->app->make(SiteSettings::class)->apply();

        Gate::define('manage-roles', fn (User $actor): bool => $actor->isSuperAdmin());
        Gate::define('manage-ai-keys', fn (User $actor): bool => $actor->isSuperAdmin());
        Gate::define('manage-site-settings', fn (User $actor): bool => $actor->isSuperAdmin());

        // Admins manage regular users; super admins also manage admins. Accounts listed in
        // JOB_ADMIN_EMAILS are managed through config only, never from the panel.
        Gate::define('manage-user', fn (User $actor, User $target): bool => ! $target->isConfiguredAdmin()
            && ($actor->isSuperAdmin() || ! $target->isAdmin()));

        RateLimiter::for('resume-tailor', function (Request $request) {
            $key = $request->user() !== null ? 'user:'.$request->user()->id : 'ip:'.$request->ip();

            return Limit::perMinute(20)->by('resume-tailor:'.$key);
        });

        RateLimiter::for('job-scan', function (Request $request) {
            $key = $request->user() !== null ? 'user:'.$request->user()->id : 'ip:'.$request->ip();

            return Limit::perMinutes(10, 5)->by('job-scan:'.$key);
        });
    }
}
