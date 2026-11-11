<?php

namespace App\Http\Middleware;

use App\Services\AdSense;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * @var array<int, string>
     */
    public const PRIVATE_PATHS = [
        'admin', 'admin/*', 'login', 'register', 'forgot-password', 'reset-password/*', 'verify-email', 'verify-email/*',
        'confirm-password', 'profile', 'resumes', 'resumes/*', 'saved-jobs', 'saved-jobs/*', 'saved-searches', 'saved-searches/*',
        'tailor/*', 'download/*', 'jobs', 'jobs/*', 'billing/*', 'scan',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        if (config('security.csp_enabled', true)) {
            $policy = (string) config('security.csp_policy');
            $adSense = app(AdSense::class);

            $response->headers->set('Content-Security-Policy', $adSense->isActive() ? $adSense->extendCsp($policy) : $policy);
        }

        if ($this->isPrivatePath($request)) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }

    /**
     * Tools, accounts, personal results and admin pages: useful to users, but not content for search
     * engines or ad reviewers, so they are kept out of the index.
     */
    protected function isPrivatePath(Request $request): bool
    {
        return $request->is(self::PRIVATE_PATHS);
    }
}
