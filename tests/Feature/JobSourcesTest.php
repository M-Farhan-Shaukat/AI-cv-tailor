<?php

namespace Tests\Feature;

use App\Services\JobSources\AdzunaJobSource;
use App\Services\JobSources\JobSearchCriteria;
use App\Services\JobSources\JoobleJobSource;
use App\Services\JobSources\RemotiveJobSource;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class JobSourcesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    public function test_adzuna_maps_results_into_provider_independent_postings(): void
    {
        config([
            'services.adzuna.app_id' => 'app-id',
            'services.adzuna.app_key' => 'app-key',
            'services.adzuna.base_url' => 'https://api.adzuna.test',
        ]);

        Http::fake([
            'api.adzuna.test/*' => Http::response([
                'results' => [[
                    'id' => '123',
                    'title' => 'Senior Laravel Developer',
                    'company' => ['display_name' => 'Acme, Inc.'],
                    'location' => ['display_name' => 'Remote (UK)'],
                    'description' => '<p>Build <strong>Laravel</strong> APIs.</p>',
                    'redirect_url' => 'https://adzuna.test/jobs/123',
                    'created' => '2026-01-15T10:00:00Z',
                    'salary_min' => '60000.5',
                    'salary_max' => 80000,
                    'contract_time' => 'full_time',
                ]],
            ]),
        ]);

        $postings = app(AdzunaJobSource::class)->search(
            new JobSearchCriteria(query: 'laravel', location: 'London', country: 'gb')
        );

        $this->assertCount(1, $postings);

        $posting = $postings->first();
        $this->assertSame('adzuna', $posting->provider);
        $this->assertSame('123', $posting->externalId);
        $this->assertSame('Senior Laravel Developer', $posting->title);
        $this->assertSame('Acme, Inc.', $posting->company);
        $this->assertSame('Remote (UK)', $posting->location);
        $this->assertTrue($posting->isRemote);
        $this->assertSame('Build Laravel APIs.', $posting->description);
        $this->assertSame('https://adzuna.test/jobs/123', $posting->applyUrl);
        $this->assertSame(60001, $posting->salaryMin);
        $this->assertSame(80000, $posting->salaryMax);
        $this->assertSame('GBP', $posting->currency);
        $this->assertSame('2026-01-15', $posting->postedAt?->toDateString());

        Http::assertSent(fn ($request) => str_contains($request->url(), '/v1/api/jobs/gb/search/1')
            && $request['what'] === 'laravel'
            && $request['where'] === 'London');
    }

    public function test_adzuna_throws_when_credentials_are_missing(): void
    {
        config(['services.adzuna.app_id' => null, 'services.adzuna.app_key' => null]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Adzuna is not configured');

        app(AdzunaJobSource::class)->search(new JobSearchCriteria(query: 'laravel'));
    }

    public function test_adzuna_drops_results_without_a_usable_application_url(): void
    {
        config([
            'services.adzuna.app_id' => 'app-id',
            'services.adzuna.app_key' => 'app-key',
            'services.adzuna.base_url' => 'https://api.adzuna.test',
        ]);

        Http::fake([
            'api.adzuna.test/*' => Http::response(['results' => [[
                'id' => '123',
                'title' => 'Laravel Developer',
                'description' => 'Build APIs.',
                'redirect_url' => '/relative-url',
            ]]]),
        ]);

        $this->assertCount(0, app(AdzunaJobSource::class)->search(new JobSearchCriteria(query: 'laravel')));
    }

    public function test_remotive_maps_remote_jobs_and_strips_html(): void
    {
        config(['services.remotive.base_url' => 'https://remotive.test/api']);

        Http::fake([
            'remotive.test/*' => Http::response([
                'jobs' => [[
                    'id' => 500,
                    'title' => 'Backend Engineer',
                    'company_name' => 'Remote Co',
                    'candidate_required_location' => 'Worldwide',
                    'job_type' => 'full_time',
                    'description' => '<p>Work with <strong>PHP</strong>.</p><ul><li>Laravel</li></ul>',
                    'url' => 'https://remotive.test/jobs/500',
                    'publication_date' => '2026-02-01T09:00:00',
                ]],
            ]),
        ]);

        $postings = app(RemotiveJobSource::class)->search(new JobSearchCriteria(query: 'php'));

        $this->assertCount(1, $postings);

        $posting = $postings->first();
        $this->assertSame('remotive', $posting->provider);
        $this->assertSame('500', $posting->externalId);
        $this->assertTrue($posting->isRemote);
        $this->assertSame("Work with PHP.\nLaravel", $posting->description);
        $this->assertSame('Worldwide', $posting->location);
    }

    public function test_remotive_filters_by_location_when_one_is_given(): void
    {
        config(['services.remotive.base_url' => 'https://remotive.test/api']);

        Http::fake([
            'remotive.test/*' => Http::response(['jobs' => [
                [
                    'id' => 1,
                    'title' => 'Backend Engineer',
                    'candidate_required_location' => 'Europe',
                    'description' => 'PHP role',
                    'url' => 'https://remotive.test/jobs/1',
                ],
                [
                    'id' => 2,
                    'title' => 'Backend Engineer',
                    'candidate_required_location' => 'USA Only',
                    'description' => 'PHP role',
                    'url' => 'https://remotive.test/jobs/2',
                ],
            ]]),
        ]);

        $postings = app(RemotiveJobSource::class)->search(
            new JobSearchCriteria(query: 'php', location: 'europe')
        );

        $this->assertCount(1, $postings);
        $this->assertSame('1', $postings->first()->externalId);
    }

    public function test_jooble_maps_results_and_sends_the_search_payload(): void
    {
        config([
            'services.jooble.key' => 'secret-key',
            'services.jooble.base_url' => 'https://jooble.test',
        ]);

        Http::fake([
            'jooble.test/*' => Http::response([
                'jobs' => [[
                    'id' => 77,
                    'title' => 'PHP Developer',
                    'company' => 'Acme',
                    'location' => 'Berlin',
                    'snippet' => 'Build <b>PHP</b> services.',
                    'link' => 'https://jooble.test/jobs/77',
                    'updated' => '2026-03-01T08:00:00',
                    'type' => 'Full-time',
                ]],
            ]),
        ]);

        $postings = app(JoobleJobSource::class)->search(
            new JobSearchCriteria(query: 'php', location: 'Berlin')
        );

        $this->assertCount(1, $postings);

        $posting = $postings->first();
        $this->assertSame('jooble', $posting->provider);
        $this->assertSame('PHP Developer', $posting->title);
        $this->assertSame('Build PHP services.', $posting->description);
        $this->assertSame('2026-03-01', $posting->postedAt?->toDateString());

        Http::assertSent(fn ($request) => $request->url() === 'https://jooble.test/api/secret-key'
            && $request->method() === 'POST'
            && $request['keywords'] === 'php'
            && $request['location'] === 'Berlin');
    }
}
