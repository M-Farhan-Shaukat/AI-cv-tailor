<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGroqApiKeyRequest;
use App\Models\GroqApiKey;
use App\Services\GroqKeyPool;
use App\Services\LlmUsageTracker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The Groq key pool: keys from .env (read-only here) and keys added in the panel, which super admins
 * can add, rename, disable and delete. Keys are only ever shown by their last four characters.
 */
class AiKeyController extends Controller
{
    public function index(Request $request, GroqKeyPool $keys, LlmUsageTracker $usage): Response
    {
        $inRotation = collect($keys->statuses());
        $disabled = GroqApiKey::query()->where('is_active', false)->with('addedBy:id,name')->oldest('id')->get();
        $panelKeys = GroqApiKey::query()->with('addedBy:id,name')->get()->keyBy('id');

        $rows = $inRotation
            ->map(fn (array $status): array => [
                ...$status,
                'is_active' => true,
                'added_by' => $status['id'] ? $panelKeys->get($status['id'])?->addedBy?->name : null,
                'created_at' => $status['id'] ? $panelKeys->get($status['id'])?->created_at?->toIso8601String() : null,
            ])
            ->concat($disabled->map(fn (GroqApiKey $key): array => [
                'position' => null,
                'label' => 'key (...'.$key->last_four.')',
                'source' => 'panel',
                'id' => $key->id,
                'name' => $key->name,
                'paused_seconds' => 0,
                'is_active' => false,
                'added_by' => $key->addedBy?->name,
                'created_at' => $key->created_at?->toIso8601String(),
            ]))
            ->values();

        return Inertia::render('Admin/AiKeys', [
            'keys' => $rows,
            'today' => $usage->today(),
            'model' => (string) config('services.groq.model'),
            'budgets' => [
                'daily_token_limit' => (int) config('llm.daily_token_limit', 0),
                'daily_request_limit' => (int) config('llm.daily_request_limit', 0),
            ],
            'canManage' => $request->user()->can('manage-ai-keys'),
            'seo' => ['title' => 'AI keys'],
        ]);
    }

    public function store(StoreGroqApiKeyRequest $request): RedirectResponse
    {
        $key = $request->validated('key');

        GroqApiKey::query()->create([
            'name' => $request->validated('name'),
            'key' => $key,
            'fingerprint' => GroqApiKey::fingerprintOf($key),
            'last_four' => substr($key, -4),
            'is_active' => true,
            'added_by' => $request->user()->id,
        ]);

        return back()->with('status', 'Key added and checked with Groq. It is now in rotation.');
    }

    /**
     * Rename a panel key, or take it out of / back into rotation without deleting it.
     */
    public function update(Request $request, GroqApiKey $groqApiKey): RedirectResponse
    {
        Gate::authorize('manage-ai-keys');

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $groqApiKey->update($validated);

        return back()->with('status', match (true) {
            ! array_key_exists('is_active', $validated) => 'Key renamed.',
            $groqApiKey->is_active => 'Key enabled and back in rotation.',
            default => 'Key disabled. It will not be used until you enable it.',
        });
    }

    public function destroy(GroqApiKey $groqApiKey): RedirectResponse
    {
        Gate::authorize('manage-ai-keys');

        $groqApiKey->delete();

        return back()->with('status', 'Key deleted.');
    }

    /**
     * Put a paused key back into rotation straight away, e.g. after fixing it in the Groq console.
     */
    public function resume(GroqKeyPool $keys, int $position): RedirectResponse
    {
        abort_unless($keys->resume($position), 404);

        return back()->with('status', 'Key #'.$position.' is back in rotation.');
    }
}
