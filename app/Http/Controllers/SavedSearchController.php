<?php

namespace App\Http\Controllers;

use App\Jobs\RunSavedSearch;
use App\Models\SavedSearch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SavedSearchController extends Controller
{
    public function index(Request $request): Response
    {
        $searches = $request->user()
            ->savedSearches()
            ->latest()
            ->get()
            ->map(fn (SavedSearch $savedSearch): array => [
                'id' => $savedSearch->id,
                'name' => $savedSearch->name,
                'query' => $savedSearch->query,
                'filters' => $savedSearch->filters ?? [],
                'min_score' => $savedSearch->min_score,
                'alerts_enabled' => $savedSearch->alerts_enabled,
                'last_run_at' => $savedSearch->last_run_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('SavedSearches/Index', [
            'searches' => $searches,
            'defaultMinScore' => (int) config('job_scan.saved_search_min_score', 60),
            'seo' => [
                'title' => 'Saved job searches',
                'description' => 'Re-run your saved searches and get email alerts when new matching jobs are posted.',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateSearch($request);

        $request->user()->savedSearches()->create([
            'name' => trim($validated['name']),
            'query' => trim((string) ($validated['query'] ?? '')),
            'filters' => $this->cleanFilters($validated['filters'] ?? []),
            'min_score' => $validated['min_score'] ?? (int) config('job_scan.saved_search_min_score', 60),
            'alerts_enabled' => $request->has('alerts_enabled') ? $request->boolean('alerts_enabled') : true,
        ]);

        return back()->with('status', 'Saved search created.');
    }

    public function update(Request $request, SavedSearch $savedSearch): RedirectResponse
    {
        $this->ensureOwnership($request, $savedSearch);

        $validated = $this->validateSearch($request);

        $savedSearch->update([
            'name' => trim($validated['name']),
            'query' => trim((string) ($validated['query'] ?? '')),
            'filters' => $this->cleanFilters($validated['filters'] ?? []),
            'min_score' => $validated['min_score'] ?? $savedSearch->min_score,
            'alerts_enabled' => $request->has('alerts_enabled') ? $request->boolean('alerts_enabled') : $savedSearch->alerts_enabled,
        ]);

        return back()->with('status', 'Saved search updated.');
    }

    public function destroy(Request $request, SavedSearch $savedSearch): RedirectResponse
    {
        $this->ensureOwnership($request, $savedSearch);

        $savedSearch->delete();

        return back()->with('status', 'Saved search deleted.');
    }

    public function run(Request $request, SavedSearch $savedSearch): RedirectResponse
    {
        $this->ensureOwnership($request, $savedSearch);

        RunSavedSearch::dispatch($savedSearch->id);

        return back()->with('status', 'Saved search queued. We will email you if new jobs match.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateSearch(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'query' => ['nullable', 'string', 'max:120'],
            'filters' => ['nullable', 'array'],
            'filters.location' => ['nullable', 'string', 'max:120'],
            'filters.remote' => ['nullable', 'boolean'],
            'filters.employment_type' => ['nullable', 'string', 'max:50'],
            'filters.salary_min' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'filters.salary_max' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'filters.posted_within_days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'min_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'alerts_enabled' => ['nullable', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    protected function cleanFilters(array $filters): array
    {
        $clean = [];

        foreach (['location', 'employment_type'] as $key) {
            $value = trim((string) ($filters[$key] ?? ''));

            if ($value !== '') {
                $clean[$key] = $value;
            }
        }

        if (! empty($filters['remote'])) {
            $clean['remote'] = true;
        }

        foreach (['salary_min', 'salary_max', 'posted_within_days'] as $key) {
            if (isset($filters[$key]) && $filters[$key] !== '') {
                $clean[$key] = (int) $filters[$key];
            }
        }

        return $clean;
    }

    protected function ensureOwnership(Request $request, SavedSearch $savedSearch): void
    {
        abort_unless($savedSearch->user_id === $request->user()?->id, 404);
    }
}
