<?php

use App\Http\Controllers\Admin\AdSenseController as AdminAdSenseController;
use App\Http\Controllers\Admin\AiKeyController as AdminAiKeyController;
use App\Http\Controllers\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\PostController as AdminPostController;
use App\Http\Controllers\Admin\ProTrialController as AdminProTrialController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\TailoredResumeController as AdminTailoredResumeController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\AdminJobMetricsController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\JobScanController;
use App\Http\Controllers\LocalPaymentController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PaymentCallbackController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ResumeTailorController;
use App\Http\Controllers\SavedJobController;
use App\Http\Controllers\SavedSearchController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\UserResumeController;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

Route::get('/', [ResumeTailorController::class, 'index'])->name('home');
Route::middleware(['throttle:resume-tailor'])->group(function () {
    Route::post('/scan', [ResumeTailorController::class, 'scan'])->name('resume.scan');
    Route::post('/tailor', [ResumeTailorController::class, 'tailor'])->name('resume.tailor');
    Route::post('/tailor/{tailoredResume}/refine', [ResumeTailorController::class, 'refine'])->name('resume.refine');
    Route::post('/tailor/{tailoredResume}/template', [ResumeTailorController::class, 'changeTemplate'])->name('resume.template');
});
Route::get('/tailor/{tailoredResume}', [ResumeTailorController::class, 'show'])->name('resume.show');
Route::get('/download/{tailoredResume}', [ResumeTailorController::class, 'downloadPdf'])->name('resume.download');

Route::get('/pricing', [BillingController::class, 'pricing'])->name('pricing');

// JazzCash and Easypaisa send the payer back here from their own sites: no session (it would replace
// the payer's login cookie) and no CSRF token. Replies are verified in the controller.
Route::withoutMiddleware([StartSession::class, ShareErrorsFromSession::class, PreventRequestForgery::class, EnsureAccountIsActive::class, HandleInertiaRequests::class])
    ->middleware('throttle:30,1')
    ->group(function () {
        Route::match(['get', 'post'], '/payments/jazzcash/return', [PaymentCallbackController::class, 'jazzCash'])->name('payments.jazzcash.return');
        Route::match(['get', 'post'], '/payments/easypaisa/return', [PaymentCallbackController::class, 'easypaisa'])->name('payments.easypaisa.return');
    });

Route::get('/about', [PageController::class, 'about'])->name('pages.about');
Route::get('/privacy', [PageController::class, 'privacy'])->name('pages.privacy');
Route::get('/terms', [PageController::class, 'terms'])->name('pages.terms');
Route::get('/contact', [PageController::class, 'contact'])->name('pages.contact');
Route::post('/contact', [PageController::class, 'sendContact'])->middleware('throttle:5,10')->name('pages.contact.send');

Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->where('slug', '[a-z0-9-]+')->name('blog.show');

Route::get('/robots.txt', [SeoController::class, 'robots'])->name('seo.robots');
Route::get('/sitemap.xml', [SeoController::class, 'sitemap'])->name('seo.sitemap');
Route::get('/ads.txt', [SeoController::class, 'adsTxt'])->name('seo.ads');

Route::get('/jobs', [JobScanController::class, 'index'])->name('jobs.index');
Route::get('/jobs/{jobPosting}', [JobScanController::class, 'show'])->name('jobs.show');
Route::middleware(['throttle:job-scan'])->post('/jobs/scan', [JobScanController::class, 'scan'])->name('jobs.scan');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/billing/checkout/{interval}', [BillingController::class, 'checkout'])
        ->whereIn('interval', ['monthly', 'yearly'])
        ->middleware('throttle:10,1')
        ->name('billing.checkout');
    Route::get('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
    Route::post('/billing/pay/{channel}/{interval}', [LocalPaymentController::class, 'store'])
        ->whereIn('interval', ['monthly', 'yearly'])
        ->middleware('throttle:10,1')
        ->name('billing.pay');
    Route::get('/billing/payments/{payment}', [LocalPaymentController::class, 'show'])->name('billing.payments.show');
    Route::get('/billing/payments/{payment}/checkout', [LocalPaymentController::class, 'checkout'])->name('billing.payments.checkout');
    Route::post('/billing/payments/{payment}/proof', [LocalPaymentController::class, 'submitProof'])->middleware('throttle:10,1')->name('billing.payments.proof');
    Route::post('/billing/payments/{payment}/refresh', [LocalPaymentController::class, 'refresh'])->middleware('throttle:10,1')->name('billing.payments.refresh');

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

    Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
        Route::get('/', AdminDashboardController::class)->name('dashboard');
        Route::get('/jobs', [AdminJobMetricsController::class, 'index'])->name('jobs.index');
        Route::post('/jobs/sync', [AdminJobMetricsController::class, 'sync'])->middleware('throttle:6,1')->name('jobs.sync');
        Route::put('/jobs/sync-settings', [AdminJobMetricsController::class, 'saveSyncSettings'])->name('jobs.sync-settings');

        Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
        Route::get('/users/{user}', [AdminUserController::class, 'show'])->name('users.show');
        Route::patch('/users/{user}', [AdminUserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
        Route::post('/users/{user}/pro', [AdminUserController::class, 'complimentaryPro'])->name('users.pro');
        Route::post('/users/{user}/suspend', [AdminUserController::class, 'suspend'])->name('users.suspend');
        Route::delete('/users/{user}/suspend', [AdminUserController::class, 'unsuspend'])->name('users.unsuspend');
        Route::delete('/users/{user}/resumes/{userResume}', [AdminUserController::class, 'destroyResume'])->name('users.resumes.destroy');
        Route::post('/pro-trial', [AdminProTrialController::class, 'store'])->name('pro-trial.store');
        Route::delete('/pro-trial', [AdminProTrialController::class, 'destroy'])->name('pro-trial.destroy');

        Route::get('/payments', [AdminPaymentController::class, 'index'])->name('payments.index');
        Route::post('/payments/{payment}/approve', [AdminPaymentController::class, 'approve'])->name('payments.approve');
        Route::post('/payments/{payment}/reject', [AdminPaymentController::class, 'reject'])->name('payments.reject');
        Route::get('/payments/{payment}/proof', [AdminPaymentController::class, 'proof'])->name('payments.proof');

        Route::get('/resumes', [AdminTailoredResumeController::class, 'index'])->name('resumes.index');
        Route::post('/resumes/bulk', [AdminTailoredResumeController::class, 'bulk'])->name('resumes.bulk');

        Route::get('/posts', [AdminPostController::class, 'index'])->name('posts.index');
        Route::get('/posts/create', [AdminPostController::class, 'create'])->name('posts.create');
        Route::post('/posts', [AdminPostController::class, 'store'])->name('posts.store');
        Route::get('/posts/{post}/edit', [AdminPostController::class, 'edit'])->name('posts.edit');
        Route::put('/posts/{post}', [AdminPostController::class, 'update'])->name('posts.update');
        Route::delete('/posts/{post}', [AdminPostController::class, 'destroy'])->name('posts.destroy');

        Route::get('/messages', [AdminContactMessageController::class, 'index'])->name('messages.index');
        Route::patch('/messages/{contactMessage}', [AdminContactMessageController::class, 'update'])->name('messages.update');
        Route::delete('/messages/{contactMessage}', [AdminContactMessageController::class, 'destroy'])->name('messages.destroy');

        Route::get('/settings', [AdminSettingsController::class, 'edit'])->name('settings.edit');
        Route::put('/settings/{group}', [AdminSettingsController::class, 'update'])->whereAlpha('group')->name('settings.update');
        Route::post('/settings/mail/test', [AdminSettingsController::class, 'testMail'])->middleware('throttle:5,1')->name('settings.mail-test');
        Route::post('/settings/stripe/test', [AdminSettingsController::class, 'testStripe'])->middleware('throttle:5,1')->name('settings.stripe-test');

        Route::get('/adsense', [AdminAdSenseController::class, 'edit'])->name('adsense.edit');
        Route::put('/adsense', [AdminAdSenseController::class, 'update'])->name('adsense.update');

        Route::get('/ai-keys', [AdminAiKeyController::class, 'index'])->name('ai-keys.index');
        Route::post('/ai-keys', [AdminAiKeyController::class, 'store'])->middleware('throttle:10,1')->name('ai-keys.store');
        Route::patch('/ai-keys/{groqApiKey}', [AdminAiKeyController::class, 'update'])->name('ai-keys.update');
        Route::delete('/ai-keys/{groqApiKey}', [AdminAiKeyController::class, 'destroy'])->name('ai-keys.destroy');
        Route::delete('/ai-keys/{position}/pause', [AdminAiKeyController::class, 'resume'])->whereNumber('position')->name('ai-keys.resume');
    });
});

require __DIR__.'/auth.php';
