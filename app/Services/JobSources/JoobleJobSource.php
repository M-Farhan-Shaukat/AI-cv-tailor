<?php

namespace App\Services\JobSources;

use App\Services\JobPostingNormalizer;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class JoobleJobSource implements JobSource
{
    public function __construct(protected JobPostingNormalizer $normalizer) {}

    public function name(): string
    {
        return 'jooble';
    }

    public function isConfigured(): bool
    {
        return filled(config('services.jooble.key'));
    }

    public function search(JobSearchCriteria $criteria): Collection
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Jooble is not configured. Set JOOBLE_API_KEY.');
        }

        try {
            $response = Http::baseUrl(rtrim((string) config('services.jooble.base_url'), '/'))
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(20)
                ->retry(3, 500, function (Throwable $exception): bool {
                    return $exception instanceof ConnectionException
                        || ($exception instanceof RequestException
                            && ($exception->response->serverError() || $exception->response->status() === 429));
                }, throw: false)
                ->post('/api/'.rawurlencode((string) config('services.jooble.key')), array_filter([
                    'keywords' => $criteria->query,
                    'location' => $criteria->location,
                    'page' => (string) max(1, $criteria->page),
                ], fn (mixed $value): bool => filled($value)));
        } catch (ConnectionException $exception) {
            throw new JobSourceRequestException('Could not reach Jooble.', null, $exception);
        }

        if ($response->failed()) {
            throw new JobSourceRequestException('Jooble request failed with status '.$response->status().'.', $response->status());
        }

        return collect($response->json('jobs', []))
            ->filter(fn (mixed $job): bool => is_array($job) && filled($job['title'] ?? null))
            ->map(function (array $job): JobPostingData {
                $location = $this->normalizer->text($job['location'] ?? null, 255);

                return new JobPostingData(
                    provider: $this->name(),
                    externalId: filled($job['id'] ?? null) ? (string) $job['id'] : null,
                    title: $this->normalizer->text($job['title'] ?? null),
                    company: $this->normalizer->text($job['company'] ?? null) ?: null,
                    location: $location ?: null,
                    isRemote: $this->normalizer->looksRemote($location, $job['title'] ?? null),
                    employmentType: $this->normalizer->text($job['type'] ?? null, 50) ?: null,
                    description: $this->normalizer->description($job['snippet'] ?? null),
                    applyUrl: $this->normalizer->url($job['link'] ?? null),
                    postedAt: $this->normalizer->date($job['updated'] ?? null),
                );
            })
            ->filter(fn (JobPostingData $posting): bool => $posting->applyUrl !== '' && $posting->description !== '')
            ->values();
    }
}
