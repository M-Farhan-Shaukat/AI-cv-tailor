<?php

namespace App\Services;

use App\Models\TailoredResume;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Daily site traffic for the admin dashboard: page views, unique visitors, ATS scans and server errors.
 * Stored as one counter row per day; visitors are counted with a salted daily hash, never a raw IP.
 */
class TrafficTracker
{
    /**
     * Days of visitor hashes kept for unique counting; older ones are pruned.
     */
    protected const VISITOR_RETENTION_DAYS = 30;

    public function recordPageView(Request $request): void
    {
        $date = now()->toDateString();
        $visitorHash = hash_hmac('sha256', $date.'|'.$request->ip().'|'.$request->userAgent(), (string) config('app.key'));

        $isNewVisitor = DB::table('daily_visitors')->insertOrIgnore(['date' => $date, 'visitor_hash' => $visitorHash]) > 0;

        $this->increment($date, $isNewVisitor ? ['page_views', 'visitors'] : ['page_views']);
    }

    public function recordScan(): void
    {
        $this->increment(now()->toDateString(), ['scans']);
    }

    public function recordServerError(): void
    {
        $this->increment(now()->toDateString(), ['server_errors']);
    }

    /**
     * Counters for the last $days days, oldest first, with empty days filled in.
     *
     * @return array<int, array{date: string, page_views: int, visitors: int, scans: int, tailored: int, server_errors: int}>
     */
    public function daily(int $days): array
    {
        $since = now()->subDays($days - 1)->startOfDay();

        $rows = DB::table('daily_traffic')
            ->where('date', '>=', $since->toDateString())
            ->get()
            ->keyBy(fn (object $row): string => Carbon::parse($row->date)->toDateString());

        $tailored = TailoredResume::query()
            ->where('created_at', '>=', $since)
            ->get(['created_at'])
            ->countBy(fn (TailoredResume $resume): string => $resume->created_at->toDateString());

        return collect(range(0, $days - 1))
            ->map(function (int $offset) use ($since, $rows, $tailored): array {
                $date = $since->copy()->addDays($offset)->toDateString();
                $row = $rows->get($date);

                return [
                    'date' => $date,
                    'page_views' => (int) ($row->page_views ?? 0),
                    'visitors' => (int) ($row->visitors ?? 0),
                    'scans' => (int) ($row->scans ?? 0),
                    'tailored' => (int) ($tailored[$date] ?? 0),
                    'server_errors' => (int) ($row->server_errors ?? 0),
                ];
            })
            ->all();
    }

    /**
     * Adds one to each column of the day's row, creating the row (and pruning old visitor hashes) on the day's first hit.
     *
     * @param  array<int, string>  $columns
     */
    protected function increment(string $date, array $columns): void
    {
        $updated = DB::table('daily_traffic')
            ->where('date', $date)
            ->update([
                ...collect($columns)->mapWithKeys(fn (string $column): array => [$column => DB::raw($column.' + 1')])->all(),
                'updated_at' => now(),
            ]);

        if ($updated > 0) {
            return;
        }

        $inserted = DB::table('daily_traffic')->insertOrIgnore([
            'date' => $date,
            ...collect($columns)->mapWithKeys(fn (string $column): array => [$column => 1])->all(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted === 0) {
            $this->increment($date, $columns);

            return;
        }

        DB::table('daily_visitors')
            ->where('date', '<', now()->subDays(self::VISITOR_RETENTION_DAYS)->toDateString())
            ->delete();
    }
}
