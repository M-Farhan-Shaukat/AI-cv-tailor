<?php

use App\Http\Controllers\AdminJobMetricsController;
use App\Http\Controllers\JobScanController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ResumeTailorController;
use App\Http\Controllers\SavedJobController;
use App\Http\Controllers\SavedSearchController;
use App\Http\Controllers\UserResumeController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ResumeTailorController::class, 'index'])->name('home');
Route::middleware(['throttle:resume-tailor'])->group(function () {
    Route::post('/tailor', [ResumeTailorController::class, 'tailor'])->name('resume.tailor');
    Route::post('/tailor/{tailoredResume}/refine', [ResumeTailorController::class, 'refine'])->name('resume.refine');
    Route::post('/tailor/{tailoredResume}/template', [ResumeTailorController::class, 'changeTemplate'])->name('resume.template');
});
Route::get('/download/{tailoredResume}', [ResumeTailorController::class, 'downloadPdf'])->name('resume.download');

Route::get('/jobs', [JobScanController::class, 'index'])->name('jobs.index');
Route::get('/jobs/{jobPosting}', [JobScanController::class, 'show'])->name('jobs.show');
Route::middleware(['throttle:job-scan'])->post('/jobs/scan', [JobScanController::class, 'scan'])->name('jobs.scan');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/resumes', [UserResumeController::class, 'index'])->name('resumes.index');
    Route::post('/resumes', [UserResumeController::class, 'store'])->name('resumes.store');
    Route::patch('/resumes/{userResume}', [UserResumeController::class, 'update'])->name('resumes.update');
    Route::delete('/resumes/{userResume}', [UserResumeController::class, 'destroy'])->name('resumes.destroy');

    Route::get('/saved-jobs', [SavedJobController::class, 'index'])->name('saved-jobs.index');
    Route::post('/jobs/{jobPosting}/save', [SavedJobController::class, 'store'])->name('saved-jobs.store');
    Route::patch('/saved-jobs/{savedJob}', [SavedJobController::class, 'update'])->name('saved-jobs.update');
    Route::delete('/saved-jobs/{savedJob}', [SavedJobController::class, 'destroy'])->name('saved-jobs.destroy');

    Route::get('/saved-searches', [SavedSearchController::class, 'index'])->name('saved-searches.index');
    Route::post('/saved-searches', [SavedSearchController::class, 'store'])->name('saved-searches.store');
    Route::patch('/saved-searches/{savedSearch}', [SavedSearchController::class, 'update'])->name('saved-searches.update');
    Route::delete('/saved-searches/{savedSearch}', [SavedSearchController::class, 'destroy'])->name('saved-searches.destroy');
    Route::post('/saved-searches/{savedSearch}/run', [SavedSearchController::class, 'run'])->name('saved-searches.run');

    Route::get('/admin/jobs', [AdminJobMetricsController::class, 'index'])
        ->middleware('admin')
        ->name('admin.jobs.index');
});

require __DIR__.'/auth.php';
