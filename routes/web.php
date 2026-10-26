<?php

use App\Http\Controllers\ResumeTailorController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ResumeTailorController::class, 'index'])->name('home');
Route::middleware(['throttle:resume-tailor'])->group(function () {
    Route::post('/tailor', [ResumeTailorController::class, 'tailor'])->name('resume.tailor');
    Route::post('/tailor/{tailoredResume}/refine', [ResumeTailorController::class, 'refine'])->name('resume.refine');
});
Route::get('/download/{tailoredResume}', [ResumeTailorController::class, 'downloadPdf'])->name('resume.download');
