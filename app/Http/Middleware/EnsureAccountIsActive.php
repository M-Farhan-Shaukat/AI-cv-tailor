<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Signs out a user who was suspended while logged in, on their next request.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isSuspended()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $message = 'This account has been suspended. Please contact support.';

            return $request->expectsJson()
                ? response()->json(['message' => $message], Response::HTTP_FORBIDDEN)
                : redirect()->route('login')->withErrors(['email' => $message]);
        }

        return $next($request);
    }
}
