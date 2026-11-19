<?php

namespace App\Http\Middleware;

use App\Models\RequestLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Logs every form/API call (POST, PUT, PATCH, DELETE) and every failing GET to request_logs for the admin panel.
 *
 * The row is written when the request arrives and completed when it finishes, so a row left without a
 * status code means PHP was killed mid-request (timeout or crash). Logging never breaks a request.
 */
class LogRequests
{
    /**
     * Paths that are not logged: the browser's own failure reports and Stripe's webhook noise.
     *
     * @var array<int, string>
     */
    protected const SKIPPED_PATHS = ['client-errors', 'stripe/*'];

    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = microtime(true);
        $log = $this->shouldLogOnArrival($request) ? $this->start($request) : null;

        $response = $next($request);

        try {
            if ($log !== null) {
                $log->update($this->outcome($request, $response, $startedAt));
            } elseif ($response->getStatusCode() >= 500 && ! $request->is(self::SKIPPED_PATHS)) {
                $this->start($request)?->update($this->outcome($request, $response, $startedAt));
            }
        } catch (Throwable $exception) {
            Log::warning('Request logging failed: '.$exception->getMessage());
        }

        return $response;
    }

    protected function shouldLogOnArrival(Request $request): bool
    {
        return ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true) && ! $request->is(self::SKIPPED_PATHS);
    }

    protected function start(Request $request): ?RequestLog
    {
        try {
            $this->pruneOccasionally();

            return RequestLog::query()->create([
                'source' => RequestLog::SOURCE_SERVER,
                'method' => $request->method(),
                'path' => Str::limit('/'.ltrim($request->path(), '/'), 250, ''),
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 495, ''),
                'upload' => $this->uploadDetails($request),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Request logging failed: '.$exception->getMessage());

            return null;
        }
    }

    /**
     * @return array{user_id: ?int, status_code: int, duration_ms: int, error: ?string}
     */
    protected function outcome(Request $request, Response $response, float $startedAt): array
    {
        return [
            'user_id' => $this->userId($request),
            'status_code' => $response->getStatusCode(),
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'error' => $this->errorFrom($response),
        ];
    }

    /**
     * The exception (class, message and location) for server errors, or the JSON message for 4xx/5xx replies.
     */
    protected function errorFrom(Response $response): ?string
    {
        if ($response->getStatusCode() < 400) {
            return null;
        }

        $exception = property_exists($response, 'exception') ? $response->exception : null;

        if ($exception instanceof Throwable && $response->getStatusCode() >= 500) {
            return Str::limit(sprintf('%s: %s at %s:%d', $exception::class, $exception->getMessage(), $exception->getFile(), $exception->getLine()), 2000);
        }

        $body = json_decode((string) $response->getContent(), true);

        if (! is_array($body)) {
            return $exception instanceof Throwable ? Str::limit($exception::class.': '.$exception->getMessage(), 2000) : null;
        }

        $firstValidationError = collect($body['errors'] ?? [])->flatten()->first();

        return Str::limit((string) ($firstValidationError ?? $body['message'] ?? ''), 2000) ?: null;
    }

    /**
     * Name, size and type of the first uploaded file, so failures can be matched to the file that caused them.
     *
     * @return array{name: string, size: int|false, type: ?string, valid: bool}|null
     */
    protected function uploadDetails(Request $request): ?array
    {
        $file = collect($request->allFiles())->flatten()->first();

        if (! $file instanceof UploadedFile) {
            return null;
        }

        return [
            'name' => Str::limit($file->getClientOriginalName(), 200, ''),
            'size' => $file->getSize(),
            'type' => $file->getClientMimeType(),
            'valid' => $file->isValid(),
        ];
    }

    /**
     * The signed-in user, read after the request ran because this middleware wraps the session.
     */
    protected function userId(Request $request): ?int
    {
        try {
            return $request->hasSession() ? $request->user()?->id : null;
        } catch (Throwable) {
            return null;
        }
    }

    protected function pruneOccasionally(): void
    {
        if (random_int(1, 50) === 1) {
            RequestLog::query()->where('created_at', '<', now()->subDays(RequestLog::RETENTION_DAYS))->delete();
        }
    }
}
