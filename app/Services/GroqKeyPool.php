<?php

namespace App\Services;

use App\Models\GroqApiKey;
use Illuminate\Support\Facades\Cache;

/**
 * The Groq API keys the app may use: GROQ_API_KEY and GROQ_API_KEYS from .env, then the active keys
 * added in the admin panel (stored encrypted in groq_api_keys).
 *
 * Requests rotate across the keys so load is spread evenly. A key that is rate limited or rejected
 * is paused for a while (shared through the cache, so every worker skips it) and callers move on to
 * the next key. Keys themselves are never written to the cache or logs, only a short fingerprint.
 */
class GroqKeyPool
{
    protected const CURSOR_CACHE_KEY = 'groq:key-cursor';

    protected const PAUSE_CACHE_PREFIX = 'groq:key-paused:';

    /**
     * Every configured key, without blanks or duplicates, in configuration order. Both GROQ_API_KEY and
     * GROQ_API_KEYS accept a comma-separated list, so pasting several keys into either one works.
     *
     * @return array<int, string>
     */
    public function keys(): array
    {
        return array_column($this->entries(), 'key');
    }

    /**
     * Every usable key with where it comes from: "env" for .env, "panel" for keys added by an admin.
     *
     * @return array<int, array{key: string, source: string, model: GroqApiKey|null}>
     */
    public function entries(): array
    {
        $settings = [(string) config('services.groq.key'), ...(array) config('services.groq.keys', [])];
        $envKeys = array_merge(...array_map(fn (string $entry): array => explode(',', $entry), $settings));

        $entries = collect($envKeys)
            ->map(fn (string $key): string => trim($key))
            ->filter()
            ->map(fn (string $key): array => ['key' => $key, 'source' => 'env', 'model' => null]);

        $panelKeys = GroqApiKey::query()->where('is_active', true)->oldest('id')->get()
            ->map(fn (GroqApiKey $model): array => ['key' => (string) $model->key, 'source' => 'panel', 'model' => $model]);

        return $entries->concat($panelKeys)->unique('key')->values()->all();
    }

    public function isEmpty(): bool
    {
        return $this->keys() === [];
    }

    /**
     * Keys that are not paused, starting at the next key in the rotation.
     *
     * @return array<int, string>
     */
    public function available(): array
    {
        $keys = $this->keys();

        if (count($keys) > 1) {
            Cache::add(self::CURSOR_CACHE_KEY, 0);
            $start = (int) Cache::increment(self::CURSOR_CACHE_KEY) % count($keys);
            $keys = [...array_slice($keys, $start), ...array_slice($keys, 0, $start)];
        }

        return array_values(array_filter($keys, fn (string $key): bool => $this->pausedUntil($key) === null));
    }

    /**
     * Skip this key until the pause expires.
     */
    public function pause(string $key, int $seconds): void
    {
        $seconds = max(1, $seconds);

        Cache::put(self::PAUSE_CACHE_PREFIX.$this->fingerprint($key), now()->addSeconds($seconds)->getTimestamp(), $seconds);
    }

    /**
     * Each key's label and how long it stays paused, for the admin panel. Never includes the keys.
     *
     * @return array<int, array{position: int, label: string, source: string, id: int|null, name: string|null, paused_seconds: int}>
     */
    public function statuses(): array
    {
        return collect($this->entries())
            ->map(fn (array $entry, int $index): array => [
                'position' => $index + 1,
                'label' => $this->label($entry['key']),
                'source' => $entry['source'],
                'id' => $entry['model']?->id,
                'name' => $entry['model']?->name,
                'paused_seconds' => ($until = $this->pausedUntil($entry['key'])) === null ? 0 : max(0, $until - now()->getTimestamp()),
            ])
            ->all();
    }

    /**
     * Whether this key is already in .env or the panel (active or disabled).
     */
    public function contains(string $key): bool
    {
        return in_array($key, $this->keys(), true)
            || GroqApiKey::query()->where('fingerprint', GroqApiKey::fingerprintOf($key))->exists();
    }

    /**
     * Put a paused key back into rotation, by its 1-based position.
     */
    public function resume(int $position): bool
    {
        $key = $this->keys()[$position - 1] ?? null;

        if ($key === null) {
            return false;
        }

        Cache::forget(self::PAUSE_CACHE_PREFIX.$this->fingerprint($key));

        return true;
    }

    /**
     * Seconds until the first paused key can be used again, or null when no key is paused.
     */
    public function secondsUntilNextKey(): ?int
    {
        $waits = collect($this->keys())
            ->map(fn (string $key): ?int => $this->pausedUntil($key))
            ->filter()
            ->map(fn (int $until): int => max(0, $until - now()->getTimestamp()));

        return $waits->isEmpty() ? null : $waits->min();
    }

    /**
     * A label that identifies the key in logs without revealing it: its position and last four characters.
     */
    public function label(string $key): string
    {
        $position = array_search($key, $this->keys(), true);

        return 'key #'.($position === false ? '?' : $position + 1).' (...'.substr($key, -4).')';
    }

    protected function pausedUntil(string $key): ?int
    {
        $until = Cache::get(self::PAUSE_CACHE_PREFIX.$this->fingerprint($key));

        return is_numeric($until) && (int) $until > now()->getTimestamp() ? (int) $until : null;
    }

    protected function fingerprint(string $key): string
    {
        return GroqApiKey::fingerprintOf($key);
    }
}
