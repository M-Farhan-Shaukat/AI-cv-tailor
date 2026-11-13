<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * A Pro trial an admin opens for every signed-in account at once, including accounts created while it
 * runs. It lasts a set number of days and can cap how many CVs each account tailors during it.
 */
class ProTrial
{
    public const SETTING_KEY = 'pro_trial';

    public const CACHE_KEY = 'pro-trial:v1';

    public const MAX_DAYS = 365;

    public const MAX_TAILOR_LIMIT = 10000;

    /**
     * The running trial, or null when there is none or it has ended.
     *
     * A null tailor_limit means the normal Pro fair-use limit; 0 means unlimited.
     *
     * @return array{starts_at: Carbon, ends_at: Carbon, tailor_limit: int|null}|null
     */
    public function active(): ?array
    {
        $trial = $this->stored();

        if ($trial === null || ! $trial['ends_at']->isFuture()) {
            return null;
        }

        return $trial;
    }

    public function start(int $days, ?int $tailorLimit): void
    {
        Setting::put(self::SETTING_KEY, [
            'starts_at' => now()->toIso8601String(),
            'ends_at' => now()->addDays($days)->toIso8601String(),
            'tailor_limit' => $tailorLimit,
        ]);

        Cache::forget(self::CACHE_KEY);
    }

    public function stop(): void
    {
        Setting::query()->where('key', self::SETTING_KEY)->delete();

        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array{active: bool, starts_at: string, ends_at: string, tailor_limit: int|null}|null
     */
    public function forAdmin(): ?array
    {
        $trial = $this->active();

        return $trial === null ? null : [
            'active' => true,
            'starts_at' => $trial['starts_at']->toIso8601String(),
            'ends_at' => $trial['ends_at']->toIso8601String(),
            'tailor_limit' => $trial['tailor_limit'],
        ];
    }

    /**
     * @return array{starts_at: Carbon, ends_at: Carbon, tailor_limit: int|null}|null
     */
    protected function stored(): ?array
    {
        try {
            $value = Cache::rememberForever(self::CACHE_KEY, fn (): array => (array) Setting::get(self::SETTING_KEY, []));
        } catch (Throwable) {
            return null;
        }

        if (! isset($value['starts_at'], $value['ends_at'])) {
            return null;
        }

        return [
            'starts_at' => Carbon::parse($value['starts_at']),
            'ends_at' => Carbon::parse($value['ends_at']),
            'tailor_limit' => isset($value['tailor_limit']) ? (int) $value['tailor_limit'] : null,
        ];
    }
}
