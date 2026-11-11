<?php

namespace App\Http\Middleware;

use App\Services\AdSense;
use App\Services\UsageQuota;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified' => $user->hasVerifiedEmail(),
                    'is_admin' => $user->isAdmin(),
                    'is_super_admin' => $user->isSuperAdmin(),
                ] : null,
            ],
            'billing' => fn () => app(UsageQuota::class)->summary($request),
            'ads' => fn () => app(AdSense::class)->forVisitor($request),
            'site' => [
                'name' => config('app.name'),
                'url' => rtrim((string) config('app.url'), '/'),
                'canonical' => $request->url(),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
            ],
        ];
    }
}
