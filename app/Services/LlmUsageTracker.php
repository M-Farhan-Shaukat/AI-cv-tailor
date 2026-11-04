<?php

namespace App\Services;

use App\Models\LlmUsageEvent;
use Illuminate\Support\Facades\Auth;

/**
 * Records every Groq request and enforces the daily global and per-user budgets
 * before a request is sent.
 */
class LlmUsageTracker
{
    protected ?int $userId = null;

    protected bool $hasExplicitUser = false;

    public function useUser(?int $userId): void
    {
        $this->userId = $userId;
        $this->hasExplicitUser = true;
    }

    public function clearUser(): void
    {
        $this->userId = null;
        $this->hasExplicitUser = false;
    }

    public function currentUserId(): ?int
    {
        return $this->hasExplicitUser ? $this->userId : Auth::id();
    }

    public function ensureBudget(?int $userId = null): void
    {
        $userId ??= $this->currentUserId();
        $since = now()->startOfDay();

        $global = $this->allTotals($since);

        $this->assertWithinLimits(
            $global,
            (int) config('llm.daily_token_limit', 0),
            (int) config('llm.daily_request_limit', 0),
            'The daily AI usage limit has been reached. Please try again later.',
        );

        if ($userId === null) {
            return;
        }

        $user = $this->userTotals($since, $userId);

        $this->assertWithinLimits(
            $user,
            (int) config('llm.daily_user_token_limit', 0),
            (int) config('llm.daily_user_request_limit', 0),
            'Your daily AI usage limit has been reached. Please try again tomorrow.',
        );
    }

    /**
     * @return array{requests: int, failures: int, tokens: int}
     */
    public function today(?int $userId = null): array
    {
        $since = now()->startOfDay();

        return $userId === null ? $this->allTotals($since) : $this->userTotals($since, $userId);
    }

    /**
     * @param  array<string, mixed>  $usage
     */
    public function recordSuccess(string $scope, array $usage, int $durationMs): void
    {
        $this->record($scope, 'success', 200, null, $usage, $durationMs);
    }

    /**
     * @param  array<string, mixed>  $usage
     */
    public function recordFailure(string $scope, ?int $statusCode, string $message, int $durationMs, array $usage = []): void
    {
        $this->record($scope, 'failure', $statusCode, $message, $usage, $durationMs);
    }

    /**
     * @param  array<string, mixed>  $usage
     */
    protected function record(string $scope, string $status, ?int $statusCode, ?string $error, array $usage, int $durationMs): void
    {
        $tokens = $this->tokens($usage);

        LlmUsageEvent::query()->create([
            'user_id' => $this->currentUserId(),
            'scope' => $scope,
            'model' => (string) config('services.groq.model', ''),
            'status' => $status,
            'status_code' => $statusCode,
            'prompt_tokens' => $tokens['prompt'],
            'completion_tokens' => $tokens['completion'],
            'total_tokens' => $tokens['total'],
            'duration_ms' => max(0, $durationMs),
            'error' => $error !== null ? mb_substr($error, 0, 2000) : null,
        ]);
    }

    /**
     * @return array{requests: int, failures: int, tokens: int}
     */
    protected function allTotals(\DateTimeInterface $since): array
    {
        return $this->totals($since);
    }

    /**
     * @return array{requests: int, failures: int, tokens: int}
     */
    protected function userTotals(\DateTimeInterface $since, int $userId): array
    {
        return $this->totals($since, $userId);
    }

    /**
     * @return array{requests: int, failures: int, tokens: int}
     */
    protected function totals(\DateTimeInterface $since, ?int $userId = null): array
    {
        $row = LlmUsageEvent::query()
            ->where('created_at', '>=', $since)
            ->when($userId !== null, fn ($query) => $query->where('user_id', $userId))
            ->selectRaw("COUNT(*) as requests, SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failures, COALESCE(SUM(total_tokens), 0) as tokens")
            ->first();

        return [
            'requests' => (int) ($row->requests ?? 0),
            'failures' => (int) ($row->failures ?? 0),
            'tokens' => (int) ($row->tokens ?? 0),
        ];
    }

    /**
     * @param  array{requests: int, failures: int, tokens: int}  $totals
     */
    protected function assertWithinLimits(array $totals, int $tokenLimit, int $requestLimit, string $message): void
    {
        if (($tokenLimit > 0 && $totals['tokens'] >= $tokenLimit)
            || ($requestLimit > 0 && $totals['requests'] >= $requestLimit)) {
            throw new LlmBudgetExceededException($message);
        }
    }

    /**
     * @param  array<string, mixed>  $usage
     * @return array{prompt: int, completion: int, total: int}
     */
    protected function tokens(array $usage): array
    {
        $prompt = max(0, (int) ($usage['prompt_tokens'] ?? 0));
        $completion = max(0, (int) ($usage['completion_tokens'] ?? 0));
        $total = max(0, (int) ($usage['total_tokens'] ?? ($prompt + $completion)));

        return ['prompt' => $prompt, 'completion' => $completion, 'total' => $total];
    }
}
