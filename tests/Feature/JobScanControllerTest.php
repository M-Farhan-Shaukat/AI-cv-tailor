<?php

namespace Tests\Feature;

use App\Jobs\ComputeJobMatches;
use App\Models\JobMatch;
use App\Models\JobPosting;
use App\Services\JobMatcher;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use ZipArchive;

class JobScanControllerTest extends TestCase
{
    use RefreshDatabase;

    protected const CV_TEXT = 'Jane Doe. jane@example.com. Laravel developer with Docker experience building REST APIs for three products.';

    public function test_the_jobs_page_lists_active_postings(): void
    {
        $posting = JobPosting::factory()->create(['title' => 'Laravel Developer']);
        JobPosting::factory()->inactive()->create(['title' => 'Expired Role']);

        $this->get('/jobs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Index', false)
                ->has('jobs.data', 1)
                ->where('jobs.data.0.id', $posting->id)
                ->where('jobs.data.0.match', null)
                ->where('hasCv', false)
                ->where('status', null)
            );
    }

    public function test_the_jobs_page_includes_scores_for_the_current_session_cv(): void
    {
        $this->startSession();
        $sessionId = $this->app['session']->getId();
        $hash = hash('sha256', self::CV_TEXT);
        $matcherKey = app(JobMatcher::class)->matcherKey(null, $sessionId, $hash);

        $posting = JobPosting::factory()->create(['title' => 'Laravel Developer']);
        JobMatch::factory()->create([
            'matcher_key' => $matcherKey,
            'job_posting_id' => $posting->id,
            'score' => 82,
            'matched_keywords' => [['term' => 'Laravel', 'importance' => 'required']],
            'missing_keywords' => [['term' => 'Kubernetes', 'importance' => 'preferred']],
        ]);

        $this->useSessionCv($sessionId, $hash)->get('/jobs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('hasCv', true)
                ->where('cvFilename', 'cv.docx')
                ->where('jobs.data.0.match.score', 82)
                ->where('jobs.data.0.match.matched_count', 1)
                ->where('jobs.data.0.match.missing_count', 1)
                ->where('jobs.data.0.match.required_total', 1)
                ->where('jobs.data.0.match.required_matched', 1)
            );
    }

    public function test_the_job_page_shows_details_and_the_match_report(): void
    {
        $this->startSession();
        $sessionId = $this->app['session']->getId();
        $hash = hash('sha256', self::CV_TEXT);
        $matcherKey = app(JobMatcher::class)->matcherKey(null, $sessionId, $hash);

        $posting = JobPosting::factory()->create([
            'title' => 'Laravel Developer',
            'description' => 'Build APIs with Laravel and Docker.',
            'apply_url' => 'https://example.com/apply',
        ]);
        JobMatch::factory()->create([
            'matcher_key' => $matcherKey,
            'job_posting_id' => $posting->id,
            'score' => 74,
            'breakdown' => [
                'keywords' => ['label' => 'Keyword match', 'weight' => 70, 'score' => 80, 'detail' => '4 of 5 keywords'],
                'job_title' => ['label' => 'Job title match', 'weight' => 25, 'score' => 60, 'detail' => 'Overlap'],
                'sections' => ['label' => 'Resume sections', 'weight' => 5, 'score' => 100, 'detail' => '0 missing'],
                'contact' => ['label' => 'Contact details', 'weight' => 5, 'score' => 100, 'detail' => 'Email found'],
            ],
            'matched_keywords' => [['term' => 'Laravel', 'importance' => 'required']],
            'missing_keywords' => [['term' => 'Docker', 'importance' => 'preferred']],
        ]);

        $this->useSessionCv($sessionId, $hash)->get('/jobs/'.$posting->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Show', false)
                ->where('job.id', $posting->id)
                ->where('job.description', 'Build APIs with Laravel and Docker.')
                ->where('job.apply_url', 'https://example.com/apply')
                ->where('job.url', route('jobs.show', $posting))
                ->where('match.score', 74)
                ->where('match.matched.0.term', 'Laravel')
                ->where('match.missing.0.term', 'Docker')
                ->where('match.breakdown.keywords.weight', 70)
                ->where('tailorUrl', route('home', ['job' => $posting->id]))
            );
    }

    public function test_the_job_page_has_no_match_without_a_session_cv(): void
    {
        $posting = JobPosting::factory()->create();

        $this->get('/jobs/'.$posting->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Show', false)
                ->where('match', null)
                ->where('job.match', null)
            );
    }

    public function test_it_queues_a_scan_and_keeps_the_cv_for_the_session(): void
    {
        Queue::fake();

        $response = $this->post('/jobs/scan', [
            'cv_file' => $this->docx(self::CV_TEXT),
            'search' => 'laravel',
            'location' => 'Berlin',
            'remote' => 1,
            'limit' => 10,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('job_scan.cv.text', self::CV_TEXT);
        $response->assertSessionHas('job_scan.cv.filename', 'cv.docx');

        Queue::assertPushed(ComputeJobMatches::class, fn (ComputeJobMatches $job): bool => $job->search === 'laravel'
            && $job->location === 'Berlin'
            && $job->remoteOnly === true
            && $job->limit === 10
            && $job->resumeHash === hash('sha256', self::CV_TEXT)
            && $job->cvText === self::CV_TEXT);
    }

    public function test_it_rescans_with_the_stored_cv_when_no_file_is_uploaded(): void
    {
        Queue::fake();

        $this->withSession([
            'job_scan.cv' => [
                'hash' => hash('sha256', self::CV_TEXT),
                'filename' => 'cv.docx',
                'text' => self::CV_TEXT,
            ],
        ])->post('/jobs/scan', ['search' => 'laravel'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Queue::assertPushed(ComputeJobMatches::class, fn (ComputeJobMatches $job): bool => $job->cvText === self::CV_TEXT);
    }

    public function test_it_requires_a_cv_to_scan(): void
    {
        Queue::fake();

        $this->from('/jobs')
            ->post('/jobs/scan', [])
            ->assertRedirect('/jobs')
            ->assertSessionHasErrors('cv_file');

        Queue::assertNothingPushed();
    }

    public function test_it_rejects_unreadable_cv_text(): void
    {
        Queue::fake();

        $this->from('/jobs')
            ->post('/jobs/scan', ['cv_file' => $this->docx('Too short.')])
            ->assertRedirect('/jobs')
            ->assertSessionHasErrors('cv_file');

        Queue::assertNothingPushed();
    }

    protected function useSessionCv(string $sessionId, string $hash): self
    {
        $name = config('session.cookie');
        $value = CookieValuePrefix::create($name, app('encrypter')->getKey()).$sessionId;

        return $this
            ->withUnencryptedCookie($name, encrypt($value, false))
            ->withSession([
                'job_scan.cv' => ['hash' => $hash, 'filename' => 'cv.docx', 'text' => self::CV_TEXT],
            ]);
    }

    protected function docx(string $text): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'cv').'.docx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE);
        $zip->addFromString('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>'.$text.'</w:t></w:r></w:p></w:body></w:document>');
        $zip->close();

        return new UploadedFile($path, 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
    }
}
