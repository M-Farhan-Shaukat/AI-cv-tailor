<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RequestLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RequestLogController extends Controller
{
    /**
     * Tabs on the request log page.
     *
     * @var array<int, string>
     */
    public const FILTERS = ['all', 'failed', 'succeeded', 'unfinished', 'browser'];

    /**
     * A server row still without a status after this many minutes was killed mid-request.
     */
    public const UNFINISHED_AFTER_MINUTES = 4;

    public function index(Request $request): Response
    {
        $filter = in_array($request->query('filter'), self::FILTERS, true) ? $request->query('filter') : 'all';
        $since = now()->subDay();

        return Inertia::render('Admin/RequestLogs', [
            'logs' => $this->filtered(RequestLog::query(), $filter)
                ->with('user:id,name')
                ->latest('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (RequestLog $log): array => [
                    ...$log->only(['id', 'source', 'method', 'path', 'status_code', 'duration_ms', 'ip', 'user_agent', 'upload', 'error', 'context']),
                    'user' => $log->user?->only(['id', 'name']),
                    'state' => $this->state($log),
                    'created_at' => $log->created_at?->toIso8601String(),
                ]),
            'filter' => $filter,
            'counts' => collect(self::FILTERS)
                ->mapWithKeys(fn (string $name): array => [$name => $this->filtered(RequestLog::query()->where('created_at', '>=', $since), $name)->count()])
                ->all(),
            'retentionDays' => RequestLog::RETENTION_DAYS,
            'seo' => ['title' => 'Request logs'],
        ]);
    }

    /**
     * @param  Builder<RequestLog>  $query
     * @return Builder<RequestLog>
     */
    protected function filtered(Builder $query, string $filter): Builder
    {
        return match ($filter) {
            'failed' => $query->where(fn (Builder $failed) => $failed
                ->where('status_code', '>=', 400)
                ->orWhere('source', RequestLog::SOURCE_BROWSER)
                ->orWhere(fn (Builder $killed) => $this->killed($killed))),
            'succeeded' => $query->where('status_code', '<', 400),
            'unfinished' => $this->killed($query),
            'browser' => $query->where('source', RequestLog::SOURCE_BROWSER),
            default => $query,
        };
    }

    /**
     * @param  Builder<RequestLog>  $query
     * @return Builder<RequestLog>
     */
    protected function killed(Builder $query): Builder
    {
        return $query->where('source', RequestLog::SOURCE_SERVER)
            ->whereNull('status_code')
            ->where('created_at', '<', now()->subMinutes(self::UNFINISHED_AFTER_MINUTES));
    }

    protected function state(RequestLog $log): string
    {
        return match (true) {
            $log->source === RequestLog::SOURCE_BROWSER => 'no_response',
            $log->status_code === null => $log->created_at?->lt(now()->subMinutes(self::UNFINISHED_AFTER_MINUTES)) ? 'killed' : 'running',
            $log->status_code >= 500 => 'server_error',
            $log->status_code >= 400 => 'client_error',
            default => 'success',
        };
    }
}
