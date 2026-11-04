<?php

namespace App\Http\Controllers;

use App\Models\UserResume;
use App\Services\ResumeTextExtractor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserResumeController extends Controller
{
    /**
     * List the authenticated user's saved resumes.
     */
    public function index(Request $request): Response
    {
        $resumes = $request->user()->resumes()
            ->orderByDesc('is_primary')
            ->latest()
            ->get()
            ->map(fn (UserResume $resume): array => [
                'id' => $resume->id,
                'original_filename' => $resume->original_filename,
                'is_primary' => $resume->is_primary,
                'characters' => mb_strlen($resume->extracted_text),
                'created_at' => $resume->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Resumes/Index', [
            'resumes' => $resumes,
            'seo' => [
                'title' => 'Your resumes',
                'description' => 'Manage the CVs used to scan and match job postings.',
            ],
        ]);
    }

    /**
     * Store a newly uploaded resume for the authenticated user.
     */
    public function store(Request $request, ResumeTextExtractor $extractor): RedirectResponse
    {
        $validated = $request->validate([
            'cv_file' => 'required|file|mimes:pdf,docx|max:5120',
            'is_primary' => 'nullable|boolean',
        ]);

        $file = $request->file('cv_file');
        $text = Str::limit(
            $extractor->extract($file),
            (int) config('job_scan.max_cv_characters', 8000),
            '',
        );

        if (mb_strlen($text) < 100) {
            throw ValidationException::withMessages([
                'cv_file' => 'Could not extract text from your CV. Export a text-based PDF or DOCX and try again.',
            ]);
        }

        $user = $request->user();
        $hasResumes = $user->resumes()->exists();
        $makePrimary = (bool) ($validated['is_primary'] ?? false) || ! $hasResumes;

        DB::transaction(function () use ($user, $file, $text, $makePrimary): void {
            if ($makePrimary) {
                $user->resumes()->update(['is_primary' => false]);
            }

            $user->resumes()->create([
                'original_filename' => $file->getClientOriginalName(),
                'extracted_text' => $text,
                'is_primary' => $makePrimary,
            ]);
        });

        return back()->with('status', 'resume-uploaded');
    }

    /**
     * Make one resume the primary CV.
     */
    public function update(Request $request, UserResume $userResume): RedirectResponse
    {
        $this->ensureOwned($request, $userResume);

        DB::transaction(function () use ($request, $userResume): void {
            $request->user()->resumes()->update(['is_primary' => false]);
            $userResume->update(['is_primary' => true]);
        });

        return back()->with('status', 'resume-primary-updated');
    }

    /**
     * Delete one of the user's resumes.
     */
    public function destroy(Request $request, UserResume $userResume): RedirectResponse
    {
        $this->ensureOwned($request, $userResume);

        DB::transaction(function () use ($request, $userResume): void {
            $wasPrimary = $userResume->is_primary;
            $userResume->delete();

            if ($wasPrimary) {
                $request->user()->resumes()->latest()->first()?->update(['is_primary' => true]);
            }
        });

        return back()->with('status', 'resume-deleted');
    }

    protected function ensureOwned(Request $request, UserResume $userResume): void
    {
        abort_unless($userResume->user_id === $request->user()->id, 404);
    }
}
