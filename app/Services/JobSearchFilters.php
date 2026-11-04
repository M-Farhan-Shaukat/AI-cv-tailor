<?php

namespace App\Services;

use App\Models\JobPosting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Applies the same job filters for the jobs page, background matching and
 * saved searches so results stay consistent everywhere.
 */
class JobSearchFilters
{
    /**
     * @return array{
     *     search: string,
     *     location: string,
     *     remote: bool,
     *     employment_type: string,
     *     salary_min: int|null,
     *     salary_max: int|null,
     *     posted_within_days: int|null
     * }
     */
    public function fromRequest(Request $request): array
    {
        return $this->normalize([
            'search' => $request->string('search')->trim()->toString(),
            'location' => $request->string('location')->trim()->toString(),
            'remote' => $request->boolean('remote'),
            'employment_type' => $request->string('employment_type')->trim()->toString(),
            'salary_min' => $request->input('salary_min'),
            'salary_max' => $request->input('salary_max'),
            'posted_within_days' => $request->input('posted_within_days'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{
     *     search: string,
     *     location: string,
     *     remote: bool,
     *     employment_type: string,
     *     salary_min: int|null,
     *     salary_max: int|null,
     *     posted_within_days: int|null
     * }
     */
    public function normalize(array $filters, string $query = ''): array
    {
        $integer = function (mixed $value, int $minimum = 0): ?int {
            if ($value === null || $value === '') {
                return null;
            }

            $number = (int) $value;

            return $number >= $minimum ? $number : null;
        };

        return [
            'search' => trim((string) ($filters['search'] ?? $query)),
            'location' => trim((string) ($filters['location'] ?? '')),
            'remote' => (bool) ($filters['remote'] ?? false),
            'employment_type' => trim((string) ($filters['employment_type'] ?? '')),
            'salary_min' => $integer($filters['salary_min'] ?? null),
            'salary_max' => $integer($filters['salary_max'] ?? null),
            'posted_within_days' => $integer($filters['posted_within_days'] ?? null, 1),
        ];
    }

    /**
     * @param  Builder<JobPosting>  $query
     * @param  array{
     *     search: string,
     *     location: string,
     *     remote: bool,
     *     employment_type: string,
     *     salary_min: int|null,
     *     salary_max: int|null,
     *     posted_within_days: int|null
     * }  $filters
     * @return Builder<JobPosting>
     */
    public function apply(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['search'] !== '', fn (Builder $query): Builder => $query->search($filters['search']))
            ->when($filters['location'] !== '', fn (Builder $query): Builder => $query->where('location', 'like', '%'.$filters['location'].'%'))
            ->when($filters['remote'], fn (Builder $query): Builder => $query->where('is_remote', true))
            ->when($filters['employment_type'] !== '', fn (Builder $query): Builder => $query->where('employment_type', $filters['employment_type']))
            ->when($filters['salary_min'] !== null, fn (Builder $query): Builder => $query->where(function (Builder $query) use ($filters): void {
                $query->where('salary_max', '>=', $filters['salary_min'])
                    ->orWhere('salary_min', '>=', $filters['salary_min']);
            }))
            ->when($filters['salary_max'] !== null, fn (Builder $query): Builder => $query->where(function (Builder $query) use ($filters): void {
                $query->where('salary_min', '<=', $filters['salary_max'])
                    ->orWhere('salary_max', '<=', $filters['salary_max']);
            }))
            ->when($filters['posted_within_days'] !== null, fn (Builder $query): Builder => $query->where('posted_at', '>=', now()->subDays($filters['posted_within_days'])));
    }
}
