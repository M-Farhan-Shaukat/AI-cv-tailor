<?php

namespace App\Http\Controllers;

use App\Models\RequestLog;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * Receives reports from the browser about calls that never got a response (network errors, cancelled
 * uploads, edge timeouts), which the server could not log itself because the request never arrived.
 */
class ClientErrorController extends Controller
{
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'method' => ['required', 'string', 'max:10'],
            'url' => ['required', 'string', 'max:500'],
            'code' => ['nullable', 'string', 'max:60'],
            'message' => ['nullable', 'string', 'max:500'],
            'elapsed_ms' => ['nullable', 'integer', 'min:0'],
            'online' => ['nullable', 'boolean'],
            'connection' => ['nullable', 'string', 'max:30'],
            'page' => ['nullable', 'string', 'max:500'],
            'file' => ['nullable', 'array'],
            'file.name' => ['nullable', 'string', 'max:200'],
            'file.size' => ['nullable', 'integer', 'min:0'],
            'file.type' => ['nullable', 'string', 'max:100'],
            'file.readable' => ['nullable', 'boolean'],
        ]);

        RequestLog::query()->create([
            'source' => RequestLog::SOURCE_BROWSER,
            'method' => Str::upper($validated['method']),
            'path' => Str::limit('/'.ltrim((string) parse_url($validated['url'], PHP_URL_PATH), '/'), 250, ''),
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 495, ''),
            'upload' => $validated['file'] ?? null,
            'error' => trim(($validated['code'] ?? '').' '.($validated['message'] ?? '')) ?: 'No response',
            'context' => collect($validated)->only(['elapsed_ms', 'online', 'connection', 'page', 'code'])->all(),
        ]);

        return response()->noContent();
    }
}
