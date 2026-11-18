<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TrafficTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected const BROWSER = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

    public function test_page_views_and_unique_visitors_are_counted_per_day(): void
    {
        $this->withHeader('User-Agent', self::BROWSER)->get('/')->assertOk();
        $this->withHeader('User-Agent', self::BROWSER)->get('/about')->assertOk();
        $this->withHeader('User-Agent', self::BROWSER)->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])->get('/pricing')->assertOk();

        $this->assertDatabaseHas('daily_traffic', ['date' => now()->toDateString(), 'page_views' => 3, 'visitors' => 2]);
        $this->assertDatabaseCount('daily_visitors', 2);
    }

    public function test_bots_admins_partial_reloads_and_non_pages_are_not_counted(): void
    {
        $this->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')->get('/')->assertOk();
        $this->withHeader('User-Agent', self::BROWSER)->get('/robots.txt')->assertOk();
        $this->withHeader('User-Agent', self::BROWSER)->get('/no-such-page')->assertNotFound();
        $this->withHeaders([
            'User-Agent' => self::BROWSER,
            'X-Inertia' => 'true',
            'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
            'X-Inertia-Partial-Component' => 'Pages/About',
            'X-Inertia-Partial-Data' => 'seo',
        ])->get('/about')->assertOk();
        $this->flushHeaders();
        $this->actingAs(User::factory()->admin()->create())->withHeader('User-Agent', self::BROWSER)->get('/')->assertOk();

        $this->assertDatabaseCount('daily_traffic', 0);
    }

    public function test_server_errors_are_counted(): void
    {
        Route::middleware('web')->get('/__broken', fn () => abort(500));

        $this->withHeader('User-Agent', self::BROWSER)->get('/__broken')->assertServerError();

        $this->assertDatabaseHas('daily_traffic', ['date' => now()->toDateString(), 'server_errors' => 1, 'page_views' => 0]);
    }

    public function test_the_admin_dashboard_shows_fourteen_days_of_traffic(): void
    {
        $this->withHeader('User-Agent', self::BROWSER)->get('/');

        $this->actingAs(User::factory()->admin()->create())
            ->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('traffic', 14)
                ->where('traffic.13.date', now()->toDateString())
                ->where('traffic.13.page_views', 1)
                ->where('traffic.13.visitors', 1)
                ->where('traffic.0.page_views', 0));
    }
}
