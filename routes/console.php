<?php

use App\Services\JobFeedSync;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lets the admin panel show whether the scheduler is running.
Schedule::call(fn () => app(JobFeedSync::class)->recordSchedulerHeartbeat())
    ->name('scheduler-heartbeat')
    ->everyMinute();

// Checks every 15 minutes; syncs when the interval chosen in Admin → Job feeds has passed.
Schedule::command('jobs:auto-sync')
    ->everyFifteenMinutes()
    ->withoutOverlapping(30)
    ->onOneServer()
    ->runInBackground();

Schedule::command('jobs:run-saved-searches')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
