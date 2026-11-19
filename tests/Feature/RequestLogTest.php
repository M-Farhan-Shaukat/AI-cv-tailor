<?php

namespace Tests\Feature;

use App\Models\RequestLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RequestLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_rejected_upload_is_logged_with_its_file_and_reason(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/scan', ['cv_file' => UploadedFile::fake()->create('my cv (final).pdf', 120, 'application/pdf')])
            ->assertUnprocessable();

        $log = RequestLog::sole();
        $this->assertSame(['POST', '/scan', 422, $user->id], [$log->method, $log->path, $log->status_code, $log->user_id]);
        $this->assertSame('my cv (final).pdf', $log->upload['name']);
        $this->assertSame('The job description field is required.', $log->error);
        $this->assertNotNull($log->duration_ms);
    }

    public function test_server_errors_are_logged_with_the_exception_even_on_get(): void
    {
        Route::middleware('web')->get('/__broken', fn () => throw new \RuntimeException('PDF parser ran out of memory'));

        $this->get('/__broken')->assertServerError();

        $log = RequestLog::sole();
        $this->assertSame(500, $log->status_code);
        $this->assertStringContainsString('RuntimeException: PDF parser ran out of memory', $log->error);
    }

    public function test_successful_gets_are_not_logged_but_successful_posts_are(): void
    {
        Http::fake(['*' => Http::response(['choices' => [['message' => ['content' => '{}']]]])]);

        $this->get('/')->assertOk();
        $this->assertDatabaseCount('request_logs', 0);

        $this->post('/contact', [])->assertSessionHasErrors();
        $this->assertDatabaseHas('request_logs', ['method' => 'POST', 'path' => '/contact', 'status_code' => 302]);
    }

    public function test_the_browser_reports_calls_that_got_no_response(): void
    {
        $this->postJson('/client-errors', [
            'method' => 'post',
            'url' => '/tailor',
            'code' => 'ERR_NETWORK',
            'message' => 'Network Error',
            'elapsed_ms' => 64000,
            'online' => true,
            'page' => '/',
            'file' => ['name' => 'cv.pdf', 'size' => 91000, 'type' => 'application/pdf', 'readable' => false],
        ])->assertNoContent();

        $log = RequestLog::sole();
        $this->assertSame([RequestLog::SOURCE_BROWSER, 'POST', '/tailor', 'ERR_NETWORK Network Error'], [$log->source, $log->method, $log->path, $log->error]);
        $this->assertSame(64000, $log->context['elapsed_ms']);
        $this->assertFalse($log->upload['readable']);
    }

    public function test_admins_filter_logs_and_see_killed_requests(): void
    {
        RequestLog::factory()->create();
        RequestLog::factory()->failed()->create();
        RequestLog::factory()->fromBrowser()->create();
        RequestLog::factory()->unfinished()->create(['created_at' => now()->subMinutes(10)]);
        RequestLog::factory()->unfinished()->create();

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get('/admin/request-logs?filter=failed')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/RequestLogs', false)
                ->has('logs.data', 3)
                ->where('counts.unfinished', 1)
                ->where('counts.browser', 1)
                ->where('counts.succeeded', 1));

        $this->actingAs($admin)->get('/admin/request-logs?filter=unfinished')
            ->assertInertia(fn (Assert $page) => $page->has('logs.data', 1)->where('logs.data.0.state', 'killed'));
    }

    public function test_only_admins_can_see_request_logs(): void
    {
        $this->actingAs(User::factory()->create())->get('/admin/request-logs')->assertForbidden();
    }
}
