<?php

namespace Tests\Feature;

use App\Models\TailoredResume;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;
use ZipArchive;

class ResumeTailorTest extends TestCase
{
    use RefreshDatabase;

    protected const CV_TEXT = 'Jane Doe. jane@example.com. Experience: Developer at Acme since 2022. Built web services in Laravel for three internal products used daily by staff.';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.groq.key' => 'test-key', 'services.groq.url' => 'https://api.groq.test/chat']);
    }

    public function test_it_scores_the_original_cv_and_the_tailored_resume(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $response = $this->postJson('/tailor', $this->tailorPayload());

        $response->assertOk()
            ->assertJsonPath('job_title', 'Laravel Developer')
            ->assertJsonPath('original_score.breakdown.keywords.score', 30)
            ->assertJsonPath('tailored_score.breakdown.keywords.score', 86)
            ->assertJsonPath('tailored_score.breakdown.job_title.score', 100)
            ->assertJsonPath('tailored_score.missing.0.term', 'Docker')
            ->assertJsonPath('tailored_score.skills_only', 1);

        $this->assertGreaterThan($response->json('original_score.score'), $response->json('tailored_score.score'));
        $this->assertLessThanOrEqual(95, $response->json('tailored_score.score'));
        $this->assertSame(['REST APIs', 'software development'], array_column($response->json('added_keywords'), 'term'));

        $tailored = TailoredResume::firstOrFail();
        $this->assertSame($response->json('tailored_score.score'), $tailored->match_score);
        $this->assertSame($response->json('original_score.score'), $tailored->original_score);
        $this->assertStringStartsWith('/download/', $response->json('download_url'));
        $this->assertStringStartsWith('/tailor/', $response->json('refine_url'));
        $this->assertStringContainsString('token=', $response->json('refine_url'));
    }

    public function test_tailored_score_is_capped_when_the_tool_adds_keywords(): void
    {
        $keywordReply = $this->groqReply([
            'job_title' => 'Laravel Developer',
            'keywords' => [
                ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'REST APIs', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'Docker', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
            ],
        ]);

        $resume = $this->tailoredResume();
        $resume['contact']['phone'] = '+1 555 123 4567';
        $resume['summary'] = 'Laravel Developer building REST APIs with Docker.';
        $resume['skills'] = [['category' => 'Frameworks', 'items' => ['Laravel']]];
        $resume['experience'] = [
            ['title' => 'Developer', 'company' => 'Acme', 'start_date' => 'Jan 2022', 'end_date' => 'Present', 'bullets' => ['Built REST APIs in Laravel with Docker.']],
        ];

        Http::fakeSequence('api.groq.test/*')
            ->push($keywordReply)
            ->push($this->groqReply($resume));

        $response = $this->postJson('/tailor', $this->tailorPayload())->assertOk();

        $response->assertJsonPath('tailored_score.breakdown.keywords.score', 100)
            ->assertJsonPath('tailored_score.score', 95)
            ->assertJsonPath('tailored_score.cap_reason', 'Capped at 95 because 2 keywords were added by the tailoring step.');

        $this->assertSame(['REST APIs', 'Docker'], array_column($response->json('added_keywords'), 'term'));
    }

    public function test_verified_keywords_are_guaranteed_but_unverified_claims_are_not(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $html = $this->postJson('/tailor', $this->tailorPayload())->assertOk()->json('html');

        $this->assertStringContainsString('<strong>Core Competencies:</strong> software development', $html);
        $this->assertStringNotContainsString('Docker', $html);
    }

    public function test_experience_is_sorted_most_recent_first(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $html = $this->postJson('/tailor', $this->tailorPayload())->assertOk()->json('html');

        $this->assertLessThan(strpos($html, 'Old Corp'), strpos($html, 'Acme'));
    }

    public function test_confirmed_skills_are_added_without_re_extracting_keywords(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()))
            ->push($this->groqReply($this->tailoredResume()));

        $first = $this->postJson('/tailor', $this->tailorPayload())->assertOk();

        $refined = $this->withCredentials()->withCookie(config('session.cookie'), TailoredResume::firstOrFail()->session_id)
            ->postJson($first->json('refine_url'), ['confirmed_skills' => ['Docker']])
            ->assertOk()
            ->assertJsonPath('tailored_score.breakdown.keywords.score', 94)
            ->assertJsonPath('tailored_score.skills_only', 2)
            ->assertJsonPath('confirmed_skills', ['Docker']);

        $this->assertGreaterThan($first->json('tailored_score.score'), $refined->json('tailored_score.score'));
        $this->assertLessThanOrEqual(95, $refined->json('tailored_score.score'));
        $this->assertSame($first->json('tailored_id'), $refined->json('tailored_id'));

        Http::assertSentCount(3);
        Http::assertSent(fn (Request $request) => str_contains($request['messages'][1]['content'], "SKILLS THE CANDIDATE CONFIRMED THEY HAVE:\nDocker"));
        $this->assertSame(94, TailoredResume::firstOrFail()->score_report['tailored']['breakdown']['keywords']['score']);
        $this->assertStringContainsString('Docker', TailoredResume::firstOrFail()->tailored_cv_html);
    }

    public function test_large_job_descriptions_are_trimmed_before_calling_groq(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $this->postJson('/tailor', [
            'cv_file' => $this->docx(self::CV_TEXT),
            'job_description' => str_repeat('We need a Laravel developer who builds REST APIs. ', 800),
        ])->assertOk();

        $requests = Http::recorded();

        $this->assertGreaterThan(0, $requests->count());
        $requests->each(function (array $pair) {
            $this->assertLessThan(20000, mb_strlen($pair[0]['messages'][1]['content']));
        });
    }

    public function test_a_413_is_retried_with_a_smaller_prompt(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push(['error' => ['message' => 'Request too large']], 413)
            ->push($this->groqReply($this->tailoredResume()));

        $this->postJson('/tailor', $this->tailorPayload())->assertOk();

        Http::assertSentCount(3);
    }

    public function test_download_accepts_a_valid_access_token_without_a_session(): void
    {
        $tailored = TailoredResume::create([
            'session_id' => 'someone-else',
            'access_token' => 'valid-access-token',
            'job_description' => 'JD',
            'tailored_cv_html' => '<html><body>Tailored CV</body></html>',
            'tailored_cv_json' => ['name' => 'Jane Doe'],
        ]);

        $this->get(route('resume.download', ['tailoredResume' => $tailored, 'token' => 'valid-access-token']))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_refine_is_restricted_to_the_owning_session(): void
    {
        $tailored = TailoredResume::create([
            'session_id' => 'someone-else',
            'job_description' => 'JD',
            'extracted_cv_text' => self::CV_TEXT,
        ]);

        $this->postJson(route('resume.refine', $tailored), ['confirmed_skills' => ['Docker']])->assertForbidden();
    }

    public function test_it_returns_a_readable_error_when_groq_rejects_the_key(): void
    {
        Http::fake(['api.groq.test/*' => Http::response(['error' => ['message' => 'Invalid API Key']], 401)]);

        $this->postJson('/tailor', $this->tailorPayload())
            ->assertStatus(502)
            ->assertJsonPath('message', 'Groq rejected the API key. Check GROQ_API_KEY in your .env file.');
    }

    public function test_it_rejects_a_cv_without_extractable_text(): void
    {
        $this->postJson('/tailor', ['cv_file' => $this->docx('Too short'), 'job_description' => str_repeat('Laravel developer wanted. ', 5)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cv_file');
    }

    public function test_download_is_restricted_to_the_owning_session(): void
    {
        $tailored = TailoredResume::create([
            'session_id' => 'someone-else',
            'job_description' => 'JD',
            'tailored_cv_html' => '<html><body>CV</body></html>',
        ]);

        $this->get(route('resume.download', $tailored))->assertForbidden();
    }

    /**
     * @return array<string, mixed>
     */
    protected function tailorPayload(): array
    {
        return [
            'cv_file' => $this->docx(self::CV_TEXT),
            'job_description' => str_repeat('We need a Laravel developer who builds REST APIs for software development. Docker is a plus. ', 2),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function keywordReply(): array
    {
        return $this->groqReply([
            'job_title' => 'Laravel Developer',
            'keywords' => [
                ['term' => 'Laravel', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'REST APIs', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'software development', 'aliases' => [], 'category' => 'hard_skill', 'importance' => 'required'],
                ['term' => 'Docker', 'aliases' => [], 'category' => 'tool', 'importance' => 'preferred'],
            ],
        ]);
    }

    /**
     * The AI rewrite: adds "REST APIs" to a bullet, claims "software development" with real evidence but leaves it
     * out of the text, claims "Docker" with fabricated evidence, and lists experience oldest-first.
     *
     * @return array<string, mixed>
     */
    protected function tailoredResume(): array
    {
        return [
            'name' => 'Jane Doe',
            'headline' => 'Laravel Developer',
            'contact' => ['email' => 'jane@example.com'],
            'summary' => 'Laravel Developer building REST APIs.',
            'skills' => [['category' => 'Frameworks', 'items' => ['Laravel']]],
            'experience' => [
                ['title' => 'Intern', 'company' => 'Old Corp', 'start_date' => 'Jan 2020', 'end_date' => 'Dec 2021', 'bullets' => ['Assisted the team.']],
                ['title' => 'Developer', 'company' => 'Acme', 'start_date' => 'Jan 2022', 'end_date' => 'Present', 'bullets' => ['Built REST APIs in Laravel for 3 products.']],
            ],
            'keyword_coverage' => [
                ['term' => 'software development', 'supported' => true, 'evidence' => 'Built web services in Laravel'],
                ['term' => 'Docker', 'supported' => true, 'evidence' => 'Deployed containers with Docker'],
            ],
            'changes' => ['Renamed "web services" to "REST APIs".'],
        ];
    }

    /**
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    protected function groqReply(array $content): array
    {
        return ['choices' => [['message' => ['content' => json_encode($content)]]]];
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
