<?php

namespace App\Providers;

use App\Services\LlmUsageTracker;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
