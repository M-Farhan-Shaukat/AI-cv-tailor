<?php

namespace App\Services\JobSources;

use App\Services\JobPostingNormalizer;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Throwable;

class RemotiveJobSource implements JobSource
{
    public function __construct(protected JobPostingNormalizer $normalizer) {}

    public function name(): string
    {
        return 'remotive';
    }

    public function isConfigured(): bool
    {
        return true;
    }

    public function search(JobSearchCriteria $criteria): Collection
    {
        try {
            $response = Http::baseUrl(rtrim((string) config('services.remotive.base_url'), '/'))
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(20)
                ->retry(3, 500, function (Throwable $exception): bool {
                    return $exception instanceof ConnectionException
                        || ($exception instanceof RequestException
                            && ($exception->response->serverError() || $exception->response->status() === 429));
                }, throw: false)
                ->get('/remote-jobs', array_filter([
                    'search' => $criteria->query,
                    'limit' => min(100, $criteria->perPage),
                ], fn (mixed $value): bool => filled($value)));
        } catch (ConnectionException $exception) {
            throw new JobSourceRequestException('Could not reach Remotive.', null, $exception);
        }

        if ($response->failed()) {
            throw new JobSourceRequestException('Remotive request failed with status '.$response->status().'.', $response->status());
        }

        $location = mb_strtolower($criteria->location);

        return collect($response->json('jobs', []))
            ->filter(fn (mixed $job): bool => is_array($job) && filled($job['title'] ?? null))
            ->filter(function (array $job) use ($location): bool {
                if ($location === '') {
                    return true;
                }

                return str_contains(
                    mb_strtolower((string) ($job['candidate_required_location'] ?? '')),
                    $location,
                );
            })
            ->map(function (array $job): JobPostingData {
                $description = $this->normalizer->description($job['description'] ?? null);

                return new JobPostingData(
                    provider: $this->name(),
                    externalId: filled($job['id'] ?? null) ? (string) $job['id'] : null,
                    title: $this->normalizer->text($job['title'] ?? null),
                    company: $this->normalizer->text($job['company_name'] ?? null) ?: null,
                    location: $this->normalizer->text($job['candidate_required_location'] ?? null) ?: null,
                    isRemote: true,
                    employmentType: $this->normalizer->text($job['job_type'] ?? null, 50) ?: null,
                    description: $description,
                    applyUrl: $this->normalizer->url($job['url'] ?? null),
                    postedAt: $this->normalizer->date($job['publication_date'] ?? null),
                );
            })
            ->filter(fn (JobPostingData $posting): bool => $posting->applyUrl !== '' && $posting->description !== '')
            ->values();
    }
}
