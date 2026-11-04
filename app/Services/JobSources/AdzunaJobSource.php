<?php

namespace App\Services\JobSources;

use App\Services\JobPostingNormalizer;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class AdzunaJobSource implements JobSource
{
    public function __construct(protected JobPostingNormalizer $normalizer) {}

    public function name(): string
    {
        return 'adzuna';
    }

    public function isConfigured(): bool
    {
        return filled(config('services.adzuna.app_id')) && filled(config('services.adzuna.app_key'));
    }

    public function search(JobSearchCriteria $criteria): Collection
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Adzuna is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.');
        }

        $country = mb_strtolower($criteria->country ?: (string) config('services.adzuna.country', 'gb'));

        try {
            $response = Http::baseUrl(rtrim((string) config('services.adzuna.base_url'), '/'))
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(20)
                ->retry(3, 500, function (Throwable $exception): bool {
                    return $exception instanceof ConnectionException
                        || ($exception instanceof RequestException
                            && ($exception->response->serverError() || $exception->response->status() === 429));
                }, throw: false)
                ->get('/v1/api/jobs/'.rawurlencode($country).'/search/'.max(1, $criteria->page), array_filter([
                    'app_id' => config('services.adzuna.app_id'),
                    'app_key' => config('services.adzuna.app_key'),
                    'results_per_page' => min(50, $criteria->perPage),
                    'what' => $criteria->query,
                    'where' => $criteria->location,
                    'max_days_old' => $criteria->postedWithinDays,
                    'content-type' => 'application/json',
                ], fn (mixed $value): bool => filled($value)));
        } catch (ConnectionException $exception) {
            throw new JobSourceRequestException('Could not reach Adzuna.', null, $exception);
        }

        if ($response->failed()) {
            throw new JobSourceRequestException('Adzuna request failed with status '.$response->status().'.', $response->status());
        }

        return collect($response->json('results', []))
            ->filter(fn (mixed $job): bool => is_array($job) && filled($job['title'] ?? null))
            ->map(function (array $job) use ($country): JobPostingData {
                $location = $this->normalizer->text(data_get($job, 'location.display_name'), 255);
                $description = $this->normalizer->description($job['description'] ?? null);

                return new JobPostingData(
                    provider: $this->name(),
                    externalId: filled($job['id'] ?? null) ? (string) $job['id'] : null,
                    title: $this->normalizer->text($job['title'] ?? null),
                    company: $this->normalizer->text(data_get($job, 'company.display_name')) ?: null,
                    location: $location ?: null,
                    isRemote: $this->normalizer->looksRemote($location, $job['title'] ?? null, Str::limit($description, 1000, '')),
                    employmentType: $this->normalizer->text($job['contract_time'] ?? $job['contract_type'] ?? null, 50) ?: null,
                    salaryMin: $this->normalizer->integer($job['salary_min'] ?? null),
                    salaryMax: $this->normalizer->integer($job['salary_max'] ?? null),
                    currency: $this->normalizer->currencyForCountry($country),
                    description: $description,
                    applyUrl: $this->normalizer->url($job['redirect_url'] ?? null),
                    postedAt: $this->normalizer->date($job['created'] ?? null),
                );
            })
            ->filter(fn (JobPostingData $posting): bool => $posting->applyUrl !== '' && $posting->description !== '')
            ->values();
    }
}
