<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ResumeTemplate;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkTailoredResumeRequest;
use App\Models\TailoredResume;
use App\Services\ResumeDesign;
use App\Services\ResumeTailor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TailoredResumeController extends Controller
{
    protected const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'template' => ['nullable', Rule::enum(ResumeTemplate::class)],
            'owner' => ['nullable', Rule::in(['users', 'guests'])],
            'user' => ['nullable', 'integer'],
        ]);

        $resumes = TailoredResume::query()
            ->with('user:id,name,email')
            ->select(['id', 'user_id', 'original_filename', 'template', 'original_score', 'match_score', 'score_report', 'created_at'])
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->where('score_report->job_title', 'like', "%{$search}%")
                    ->orWhere('original_filename', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")),
            ))
            ->when($filters['template'] ?? null, fn (Builder $query, string $template) => $query->where('template', $template))
            ->when(($filters['owner'] ?? null) === 'users', fn (Builder $query) => $query->whereNotNull('user_id'))
            ->when(($filters['owner'] ?? null) === 'guests', fn (Builder $query) => $query->whereNull('user_id'))
            ->when($filters['user'] ?? null, fn (Builder $query, int $userId) => $query->where('user_id', $userId))
            ->latest()
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (TailoredResume $resume): array => [
                'id' => $resume->id,
                'user' => $resume->user?->only(['id', 'name', 'email']),
                'job_title' => $resume->score_report['job_title'] ?? null,
                'original_filename' => $resume->original_filename,
                'template' => $resume->template?->value,
                'template_label' => $resume->template?->label(),
                'original_score' => $resume->original_score,
                'match_score' => $resume->match_score,
                'created_at' => $resume->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Resumes/Index', [
            'resumes' => $resumes,
            'filters' => $filters,
            'templates' => collect(ResumeTemplate::cases())->map(fn (ResumeTemplate $template): array => ['value' => $template->value, 'label' => $template->label()]),
            'maxBulk' => BulkTailoredResumeRequest::MAX_RESUMES,
            'seo' => ['title' => 'Tailored resumes'],
        ]);
    }

    /**
     * Change the design of, or delete, many tailored resumes at once. A design change only re-renders
     * the stored resume, so the text and ATS scores stay the same and no AI call is made.
     */
    public function bulk(BulkTailoredResumeRequest $request, ResumeTailor $resumeTailor): RedirectResponse
    {
        $validated = $request->validated();
        $resumes = TailoredResume::query()->whereKey($validated['ids'])->get();

        if ($validated['action'] === 'delete') {
            TailoredResume::query()->whereKey($resumes->modelKeys())->delete();

            return back()->with('status', $resumes->count().' tailored resume'.($resumes->count() === 1 ? '' : 's').' deleted.');
        }

        $template = ResumeTemplate::from($validated['template']);
        $updated = 0;

        DB::transaction(function () use ($resumes, $template, $resumeTailor, &$updated): void {
            foreach ($resumes as $resume) {
                if (blank($resume->tailored_cv_json)) {
                    continue;
                }

                $resume->update([
                    'template' => $template,
                    'tailored_cv_html' => $resumeTailor->render(
                        $resume->tailored_cv_json,
                        ResumeDesign::withTemplate($resume->design_profile ?? [], $template),
                    ),
                ]);
                $updated++;
            }
        });

        $skipped = $resumes->count() - $updated;

        return back()->with('status', "{$updated} resume".($updated === 1 ? '' : 's')." changed to the {$template->label()} design."
            .($skipped > 0 ? " {$skipped} skipped because they were never finished." : ''));
    }
}
