<?php

use App\Services\JobSources\AdzunaJobSource;
use App\Services\JobSources\JoobleJobSource;
use App\Services\JobSources\RemotiveJobSource;

return [

    /*
    |--------------------------------------------------------------------------
    | Job Sources
    |--------------------------------------------------------------------------
    |
    | Add a provider by implementing App\Services\JobSources\JobSource and
    | registering it here. Controllers and commands resolve providers from
    | this map, so no other code needs to change.
    |
    */

    'sources' => [
        'adzuna' => AdzunaJobSource::class,
        'jooble' => JoobleJobSource::class,
        'remotive' => RemotiveJobSource::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Search
    |--------------------------------------------------------------------------
    |
    | Used by the scheduled feed refresh when no command options are given.
    | Leave the query empty to disable the scheduled refresh.
    |
    */

    'default_query' => env('JOB_DEFAULT_QUERY', ''),
    'default_location' => env('JOB_DEFAULT_LOCATION', ''),
    'default_country' => env('JOB_DEFAULT_COUNTRY', ''),

    'per_page' => (int) env('JOB_PER_PAGE', 50),

    /*
    |--------------------------------------------------------------------------
    | Operations
    |--------------------------------------------------------------------------
    |
    | Admin emails may view /admin/jobs. After repeated provider failures the
    | source is skipped until the cooldown expires.
    |
    */

    'admin_emails' => array_values(array_filter(array_map(
        fn (string $email): string => mb_strtolower(trim($email)),
        explode(',', (string) env('JOB_ADMIN_EMAILS', '')),
    ))),

    'circuit_breaker_failure_threshold' => (int) env('JOB_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 3),
    'circuit_breaker_cooldown_minutes' => (int) env('JOB_CIRCUIT_BREAKER_COOLDOWN_MINUTES', 15),

    /*
    |--------------------------------------------------------------------------
    | Matching
    |--------------------------------------------------------------------------
    */

    'results_per_page' => (int) env('JOB_RESULTS_PER_PAGE', 20),
    'match_limit' => (int) env('JOB_MATCH_LIMIT', 25),
    'max_cv_characters' => (int) env('JOB_MAX_CV_CHARACTERS', 8000),
    'status_ttl' => (int) env('JOB_SCAN_STATUS_TTL', 3600),

    'saved_search_interval_minutes' => (int) env('JOB_SAVED_SEARCH_INTERVAL_MINUTES', 60),
    'saved_search_limit' => (int) env('JOB_SAVED_SEARCH_LIMIT', 100),
    'saved_search_min_score' => (int) env('JOB_SAVED_SEARCH_MIN_SCORE', 60),

    /*
    |--------------------------------------------------------------------------
    | Retention
    |--------------------------------------------------------------------------
    */

    'stale_after_days' => (int) env('JOB_STALE_AFTER_DAYS', 14),
    'max_description_length' => (int) env('JOB_MAX_DESCRIPTION_LENGTH', 100000),

];
