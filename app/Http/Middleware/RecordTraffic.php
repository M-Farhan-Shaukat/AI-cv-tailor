<?php

namespace App\Http\Middleware;

use App\Services\TrafficTracker;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Counts human page views and server errors for the admin dashboard's traffic section.
 * Tracking never breaks a page: failures are logged and ignored.
 */
class RecordTraffic
{
    /**
     * User agents that are crawlers, link previewers or scripts, not visitors.
     */
    protected const BOT_PATTERN = '/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|curl|wget|python|httpclient|okhttp|go-http|java\//i';

    public function __construct(protected TrafficTracker $traffic) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            if ($response->getStatusCode() >= 500) {
                $this->traffic->recordServerError();
            } elseif ($this->isPageView($request, $response)) {
                $this->traffic->recordPageView($request);
            }
        } catch (Throwable $exception) {
            Log::warning('Traffic tracking failed: '.$exception->getMessage());
        }

        return $response;
    }

    protected function isPageView(Request $request, Response $response): bool
    {
        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return false;
        }

        if ($request->is('admin', 'admin/*') || $request->user()?->isAdmin()) {
            return false;
        }

        if ($request->header('Purpose') === 'prefetch' || $request->header('Sec-Purpose') === 'prefetch' || $request->hasHeader('X-Inertia-Partial-Component')) {
            return false;
        }

        $isInertiaVisit = $request->header('X-Inertia') !== null;
        $isHtmlPage = str_contains((string) $response->headers->get('Content-Type'), 'text/html');

        if (! $isInertiaVisit && ($request->expectsJson() || ! $isHtmlPage)) {
            return false;
        }

        return ! preg_match(self::BOT_PATTERN, (string) $request->userAgent());
    }
}
