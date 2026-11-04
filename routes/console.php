<?php

use App\Jobs\RefreshJobFeeds;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

if (filled(config('job_scan.default_query'))) {
    Schedule::job(new RefreshJobFeeds(
        query: (string) config('job_scan.default_query'),
        location: (string) config('job_scan.default_location'),
        country: (string) config('job_scan.default_country'),
        perPage: (int) config('job_scan.per_page', 50),
    ))
        ->hourly()
        ->withoutOverlapping()
        ->onOneServer();
}

Schedule::command('jobs:run-saved-searches')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
