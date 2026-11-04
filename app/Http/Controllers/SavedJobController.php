<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationStatus;
use App\Models\JobPosting;
use App\Models\SavedJob;
use App\Services\JobPostingPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SavedJobController extends Controller
{
    public function __construct(protected JobPostingPresenter $presenter) {}

    public function index(Request $request): Response
    {
        $savedJobs = $request->user()
            ->savedJobs()
            ->with('jobPosting')
            ->latest('updated_at')
            ->get()
            ->filter(fn (SavedJob $savedJob): bool => $savedJob->jobPosting !== null)
            ->map(fn (SavedJob $savedJob): array => [
                'id' => $savedJob->id,
                'status' => $savedJob->status->value,
                'updated_at' => $savedJob->updated_at?->toIso8601String(),
                'job' => $this->presenter->details($savedJob->jobPosting),
            ])
            ->values();

        return Inertia::render('SavedJobs/Index', [
            'savedJobs' => $savedJobs,
            'statuses' => ApplicationStatus::options(),
            'seo' => [
                'title' => 'Saved jobs and applications',
                'description' => 'Track the jobs you saved and move each one through your application pipeline.',
            ],
        ]);
    }

    public function store(Request $request, JobPosting $jobPosting): RedirectResponse
    {
        $savedJob = SavedJob::query()->firstOrCreate(
            [
                'user_id' => $request->user()->id,
                'job_posting_id' => $jobPosting->id,
            ],
            ['status' => ApplicationStatus::Saved],
        );

        return back()->with('status', $savedJob->wasRecentlyCreated
            ? 'Job saved to your list.'
            : 'This job is already in your saved list.');
    }

    public function update(Request $request, SavedJob $savedJob): RedirectResponse
    {
        $this->ensureOwnership($request, $savedJob);

        $validated = $request->validate([
            'status' => ['required', Rule::enum(ApplicationStatus::class)],
        ]);

        $savedJob->update(['status' => $validated['status']]);

        return back()->with('status', 'Application status updated.');
    }

    public function destroy(Request $request, SavedJob $savedJob): RedirectResponse
    {
        $this->ensureOwnership($request, $savedJob);

        $savedJob->delete();

        return back()->with('status', 'Job removed from your saved list.');
    }

    protected function ensureOwnership(Request $request, SavedJob $savedJob): void
    {
        abort_unless($savedJob->user_id === $request->user()?->id, 404);
    }
}
