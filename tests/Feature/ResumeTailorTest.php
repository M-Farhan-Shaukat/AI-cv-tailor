<?php

namespace Tests\Feature;

use App\Models\JobPosting;
use App\Models\TailoredResume;
use App\Models\User;
use App\Services\ResumeTailor;
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

    public function test_authenticated_tailoring_stores_the_cv_and_links_the_job_posting(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $user = User::factory()->create();
        $posting = JobPosting::factory()->create();

        $this->actingAs($user)
            ->postJson('/tailor', [...$this->tailorPayload(), 'job_posting_id' => $posting->id])
            ->assertOk();

        $this->assertDatabaseHas('tailored_resumes', [
            'user_id' => $user->id,
            'job_posting_id' => $posting->id,
        ]);
        $this->assertDatabaseHas('user_resumes', [
            'user_id' => $user->id,
            'original_filename' => 'cv.docx',
            'is_primary' => true,
        ]);
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

    public function test_projects_and_sections_outside_the_template_are_kept(): void
    {
        $resume = [
            ...$this->tailoredResume(),
            'projects' => [['name' => 'Invoice Portal', 'technologies' => ['Laravel'], 'bullets' => ['Built a billing portal.']]],
            'additional_sections' => [
                ['title' => 'Achievements', 'items' => ['Won the 2023 company hackathon.']],
                ['title' => 'Empty', 'items' => []],
            ],
        ];

        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($resume));

        $html = $this->postJson('/tailor', $this->tailorPayload())->assertOk()->json('html');

        $this->assertStringContainsString('<h3>Invoice Portal</h3>', $html);
        $this->assertStringContainsString('<h2>Achievements</h2>', $html);
        $this->assertStringContainsString('Won the 2023 company hackathon.', $html);
        $this->assertStringNotContainsString('<h2>Empty</h2>', $html);
    }

    public function test_projects_the_rewrite_leaves_out_are_restored_from_the_cv_in_cv_order(): void
    {
        $lines = [
            'Jane Doe', 'Experience', 'Developer at Acme since 2022. Built web services in Laravel.',
            'Projects',
            'Books - Accounting System (books.example.com)', 'Technologies: Laravel, MySQL', 'Built ledger and invoice modules',
            'Expense Tracker (expense.example.com)', 'Technologies: Laravel, React.js,', 'Bootstrap',
            'Built approval workflows for trips and', 'daily expenses with role-based access',
            'Payroll Engine', 'Built payroll runs for 200 staff',
            'Education', 'BS Computer Science',
        ];
        $paragraphs = collect($lines)->map(fn (string $line) => '<w:p><w:r><w:t>'.$line.'</w:t></w:r></w:p>')->implode('');

        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply([
                ...$this->tailoredResume(),
                'cv_project_names' => ['Books - Accounting System (books.example.com)', 'Expense Tracker (expense.example.com)', 'Payroll Engine'],
                'projects' => [
                    ['name' => 'Payroll Engine', 'technologies' => [], 'bullets' => ['Built REST APIs for payroll runs.']],
                    ['name' => 'Books - Accounting System', 'technologies' => ['Laravel'], 'bullets' => ['Built REST APIs for ledgers.']],
                ],
            ]));

        $response = $this->postJson('/tailor', [
            ...$this->tailorPayload(),
            'cv_file' => $this->docx($paragraphs, raw: true),
        ])->assertOk();

        $projects = TailoredResume::firstOrFail()->tailored_cv_json['projects'];

        $this->assertSame(['Books - Accounting System', 'Expense Tracker (expense.example.com)', 'Payroll Engine'], array_column($projects, 'name'));
        $this->assertSame(['Laravel', 'React.js', 'Bootstrap'], $projects[1]['technologies']);
        $this->assertSame(['Built approval workflows for trips and daily expenses with role-based access'], $projects[1]['bullets']);
        $this->assertSame(['Built REST APIs for payroll runs.'], $projects[2]['bullets']);
        $this->assertStringContainsString('Expense Tracker', collect($response->json('changes'))->last());
        $this->assertArrayNotHasKey('cv_project_names', TailoredResume::firstOrFail()->tailored_cv_json);
    }

    public function test_the_rewrite_prompt_forbids_dropping_cv_sections(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $this->postJson('/tailor', $this->tailorPayload())->assertOk();

        $systemPrompt = Http::recorded()->last()[0]['messages'][0]['content'];

        $this->assertStringContainsString('never removes sections or entries', $systemPrompt);
        $this->assertStringContainsString('"additional_sections"', $systemPrompt);
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

    public function test_the_tailored_resume_keeps_the_design_of_the_uploaded_cv_when_refined(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()))
            ->push($this->groqReply($this->tailoredResume()));

        $heading = fn (string $text) => '<w:p><w:r><w:rPr><w:b/><w:color w:val="7A4FA8"/><w:sz w:val="26"/></w:rPr><w:t>'.$text.'</w:t></w:r></w:p>';
        $body = fn (string $text) => '<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>'.$text.'</w:t></w:r></w:p>';
        $document = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="7A4FA8"/><w:sz w:val="44"/></w:rPr><w:t>Jane Doe</w:t></w:r></w:p>'
            .$body('jane@example.com').$heading('Work History').$body(self::CV_TEXT).$heading('Profile').$body('Developer.').$heading('Skills').$body('Laravel');

        $first = $this->postJson('/tailor', [...$this->tailorPayload(), 'cv_file' => $this->docx($document, raw: true)])->assertOk();

        $design = TailoredResume::firstOrFail()->design_profile;
        $this->assertSame('docx', $design['source']);
        $this->assertSame('center', $design['header_align']);
        $this->assertSame('#7a4fa8', $design['heading_color']);
        $this->assertSame(['experience', 'summary', 'skills'], array_slice($design['section_order'], 0, 3));

        $refined = $this->withCredentials()->withCookie(config('session.cookie'), TailoredResume::firstOrFail()->session_id)
            ->postJson($first->json('refine_url'), ['confirmed_skills' => ['Docker']])
            ->assertOk();

        foreach ([$first->json('html'), $refined->json('html')] as $html) {
            $this->assertStringContainsString('color: #7a4fa8', $html);
            $this->assertMatchesRegularExpression('/<h2>Work History<\/h2>.*<h2>Profile<\/h2>.*<h2>Skills<\/h2>/s', $html);
        }
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

    public function test_a_15000_word_job_description_is_condensed_to_its_requirements_before_calling_groq(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()));

        $culture = collect(range(1, 520))->map(fn (int $i) => "Moment {$i}: our people share a friendly culture with lots of social events and team lunches.");
        $duties = collect(range(1, 480))->map(fn (int $i) => "Note {$i} explains how the wider organisation plans its quarterly roadmap and reviews.");
        $jobDescription = implode("\n", [
            'Laravel Developer',
            'About us', ...$culture,
            'The role', ...$duties->take(240),
            'Requirements',
            '- Strong experience with Kubernetes and REST APIs',
            ...$duties->skip(240),
            'Benefits', '- Health insurance and paid time off',
        ]);
        $words = preg_match_all('/\S+/u', $jobDescription);
        $this->assertGreaterThan(14000, $words);
        $this->assertLessThanOrEqual(15000, $words);

        $this->postJson('/tailor', [...$this->tailorPayload(), 'job_description' => $jobDescription])->assertOk();

        [$keywordRequest, $tailorRequest] = Http::recorded()->map(fn (array $pair) => $pair[0])->all();

        foreach ([$keywordRequest, $tailorRequest] as $request) {
            $userPrompt = $request['messages'][1]['content'];
            $this->assertStringContainsString('Kubernetes and REST APIs', $userPrompt);
            $this->assertStringNotContainsString('friendly culture', $userPrompt);
            $this->assertStringNotContainsString('Health insurance', $userPrompt);
        }
        $this->assertLessThan(9000, mb_strlen($keywordRequest['messages'][1]['content']));
        $this->assertSame('low', $keywordRequest['reasoning_effort']);
        $this->assertSame(3000, $keywordRequest['max_completion_tokens']);
    }

    public function test_job_descriptions_over_15000_words_are_rejected(): void
    {
        Http::fake();

        $this->postJson('/tailor', [...$this->tailorPayload(), 'job_description' => str_repeat('Laravel ', 15001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['job_description' => 'may not be longer than 15,000 words']);

        Http::assertNothingSent();
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

    public function test_a_template_restyles_the_resume_without_an_ai_call_and_keeps_the_cv_design(): void
    {
        Http::fakeSequence('api.groq.test/*')
            ->push($this->keywordReply())
            ->push($this->groqReply($this->tailoredResume()))
            ->push($this->groqReply($this->tailoredResume()));

        $heading = fn (string $text) => '<w:p><w:r><w:rPr><w:b/><w:color w:val="7A4FA8"/><w:sz w:val="26"/></w:rPr><w:t>'.$text.'</w:t></w:r></w:p>';
        $document = '<w:p><w:r><w:t>Jane Doe</w:t></w:r></w:p>'.$heading('Work History').'<w:p><w:r><w:t>'.self::CV_TEXT.'</w:t></w:r></w:p>'.$heading('Skills').'<w:p><w:r><w:t>Laravel</w:t></w:r></w:p>';

        $first = $this->postJson('/tailor', [...$this->tailorPayload(), 'cv_file' => $this->docx($document, raw: true), 'template' => 'modern'])
            ->assertOk()
            ->assertJsonPath('template', 'modern');

        $this->assertStringContainsString('color: #1f4e79', $first->json('html'));
        $this->assertMatchesRegularExpression('/<h2>Work History<\/h2>.*<h2>Skills<\/h2>/s', $first->json('html'));
        $this->assertSame('#7a4fa8', TailoredResume::firstOrFail()->design_profile['heading_color']);

        $original = $this->postJson($first->json('template_url'), ['template' => 'original'])
            ->assertOk()
            ->assertJsonPath('template', 'original');

        $this->assertStringContainsString('color: #7a4fa8', $original->json('html'));
        $this->assertSame(TailoredResume::firstOrFail()->tailored_cv_html, $original->json('html'));
        $tailor = app(ResumeTailor::class);
        $this->assertSame($tailor->toPlainText($first->json('html')), $tailor->toPlainText($original->json('html')));
        Http::assertSentCount(2);

        $this->postJson($original->json('template_url'), ['template' => 'classic'])->assertOk();

        $refined = $this->postJson($first->json('refine_url'), ['confirmed_skills' => ['Docker']])
            ->assertOk()
            ->assertJsonPath('template', 'classic');

        $this->assertStringContainsString('"Times New Roman"', $refined->json('html'));
    }

    public function test_changing_the_template_validates_the_choice_and_the_owner(): void
    {
        $tailored = TailoredResume::create([
            'session_id' => 'someone-else',
            'job_description' => 'JD',
            'extracted_cv_text' => self::CV_TEXT,
        ]);

        $this->postJson(route('resume.template', $tailored), ['template' => 'modern'])->assertForbidden();

        $this->postJson(route('resume.template', ['tailoredResume' => $tailored, 'token' => 'x']), ['template' => 'fancy'])->assertForbidden();

        $tailored->update(['access_token' => 'secret-token']);

        $this->postJson(route('resume.template', ['tailoredResume' => $tailored, 'token' => 'secret-token']), ['template' => 'fancy'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('template');
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

    /**
     * A DOCX with the text in one plain paragraph, or (with $raw) the given WordprocessingML body.
     */
    protected function docx(string $text, bool $raw = false): UploadedFile
    {
        $document = $raw
            ? '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'.$text.'</w:body></w:document>'
            : '<w:document><w:body><w:p><w:r><w:t>'.$text.'</w:t></w:r></w:p></w:body></w:document>';

        $path = tempnam(sys_get_temp_dir(), 'cv').'.docx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE);
        $zip->addFromString('word/document.xml', $document);
        $zip->close();

        return new UploadedFile($path, 'cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
    }
}
