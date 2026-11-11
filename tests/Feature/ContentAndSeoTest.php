<?php

namespace Tests\Feature;

use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use App\Models\Post;
use App\Models\User;
use App\Services\AdSense;
use Database\Seeders\BlogPostSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContentAndSeoTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_information_pages_render(): void
    {
        foreach (['/about' => 'Pages/About', '/privacy' => 'Pages/Privacy', '/terms' => 'Pages/Terms', '/contact' => 'Pages/Contact'] as $url => $component) {
            $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page->component($component, false)->has('seo.title'));
        }
    }

    public function test_a_contact_message_is_stored_and_emailed_to_super_admins(): void
    {
        Mail::fake();
        config(['job_scan.admin_emails' => ['owner@example.com']]);
        User::factory()->superAdmin()->create(['email' => 'boss@example.com']);

        $this->post('/contact', $this->contactPayload())
            ->assertRedirect()
            ->assertSessionHas('status');

        $this->assertDatabaseHas('contact_messages', ['email' => 'ayesha@example.com', 'subject' => 'Billing question']);
        Mail::assertSent(ContactMessageReceived::class, fn (ContactMessageReceived $mail) => $mail->hasTo('boss@example.com')
            && $mail->hasTo('owner@example.com')
            && $mail->hasReplyTo('ayesha@example.com'));
    }

    public function test_contact_form_spam_and_invalid_input_are_rejected(): void
    {
        Mail::fake();

        $this->post('/contact', [...$this->contactPayload(), 'website' => 'http://spam.test'])->assertSessionHasErrors('website');
        $this->post('/contact', [...$this->contactPayload(), 'email' => 'not-an-email', 'message' => 'short'])->assertSessionHasErrors(['email', 'message']);

        $this->assertDatabaseCount('contact_messages', 0);
        Mail::assertNothingSent();
    }

    public function test_the_blog_lists_only_live_posts_and_renders_markdown_safely(): void
    {
        $live = Post::factory()->create(['title' => 'Live guide', 'body' => "## Heading\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1)) and **bold**"]);
        Post::factory()->draft()->create(['title' => 'Draft guide']);
        Post::factory()->create(['title' => 'Scheduled guide', 'published_at' => now()->addDay()]);

        $this->get('/blog')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Blog/Index', false)->has('posts.data', 1)->where('posts.data.0.title', 'Live guide'));

        $this->get("/blog/{$live->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Blog/Show', false)
                ->where('post.title', 'Live guide')
                ->where('seo.type', 'article')
                ->where('post.body_html', fn (string $html) => str_contains($html, '<h2>Heading</h2>')
                    && str_contains($html, '<strong>bold</strong>')
                    && ! str_contains($html, '<script')
                    && ! str_contains($html, 'javascript:')));
    }

    public function test_drafts_are_hidden_from_visitors_but_admins_can_preview_them(): void
    {
        $draft = Post::factory()->draft()->create();

        $this->get("/blog/{$draft->slug}")->assertNotFound();
        $this->actingAs(User::factory()->create())->get("/blog/{$draft->slug}")->assertNotFound();
        $this->actingAs(User::factory()->admin()->create())
            ->get("/blog/{$draft->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('post.is_published', false));
    }

    public function test_admins_write_publish_schedule_and_delete_posts(): void
    {
        $admin = User::factory()->admin()->create();
        $payload = [
            'title' => 'How to answer "tell me about yourself"',
            'slug' => '',
            'category' => 'Interviews',
            'excerpt' => 'A simple structure for the first interview question.',
            'meta_description' => null,
            'body' => str_repeat('A clear, honest answer is better than a memorised script. ', 8),
            'status' => 'draft',
            'published_at' => null,
        ];

        $this->actingAs($admin)->post('/admin/posts', $payload)->assertRedirect();
        $post = Post::query()->firstOrFail();
        $this->assertSame('how-to-answer-tell-me-about-yourself', $post->slug);
        $this->assertSame($admin->id, $post->author_id);
        $this->assertFalse($post->isPublished());

        $this->actingAs($admin)->put("/admin/posts/{$post->id}", [...$payload, 'slug' => $post->slug, 'status' => 'published'])->assertRedirect();
        $this->assertTrue($post->fresh()->isPublished());

        $this->actingAs($admin)->put("/admin/posts/{$post->id}", [...$payload, 'slug' => $post->slug, 'status' => 'published', 'published_at' => now()->addWeek()->format('Y-m-d\TH:i')])->assertRedirect();
        $this->assertFalse($post->fresh()->isPublished());
        auth()->logout();
        $this->get("/blog/{$post->slug}")->assertNotFound();

        $this->actingAs($admin)->post('/admin/posts', [...$payload, 'slug' => $post->slug])->assertSessionHasErrors('slug');
        $this->actingAs($admin)->post('/admin/posts', [...$payload, 'title' => 'Too short', 'body' => 'Not enough.'])->assertSessionHasErrors('body');

        $this->actingAs($admin)->delete("/admin/posts/{$post->id}")->assertRedirect(route('admin.posts.index'));
        $this->assertModelMissing($post);

        $this->actingAs(User::factory()->create())->post('/admin/posts', $payload)->assertForbidden();
    }

    public function test_admins_read_and_manage_contact_messages(): void
    {
        $admin = User::factory()->admin()->create();
        $message = ContactMessage::query()->create(['name' => 'Ali', 'email' => 'ali@example.com', 'subject' => 'Hi', 'message' => 'Hello there team']);

        $this->actingAs($admin)
            ->get('/admin/messages?unread=1')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Messages', false)->has('messages.data', 1)->where('unreadCount', 1));

        $this->actingAs($admin)->patch("/admin/messages/{$message->id}", ['read' => true])->assertRedirect();
        $this->assertNotNull($message->fresh()->read_at);

        $this->actingAs($admin)->delete("/admin/messages/{$message->id}")->assertRedirect();
        $this->assertModelMissing($message);
    }

    public function test_robots_and_sitemap_list_public_pages_and_live_posts_only(): void
    {
        $live = Post::factory()->create();
        $draft = Post::factory()->draft()->create();

        $this->get('/robots.txt')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->assertSee('Disallow: /admin')
            ->assertSee('Sitemap: '.route('seo.sitemap'));

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee(route('pages.privacy'))
            ->assertSee(route('blog.show', $live->slug))
            ->assertDontSee($draft->slug);
    }

    public function test_tool_account_and_admin_pages_are_kept_out_of_search_results(): void
    {
        $this->get('/login')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        $this->get('/jobs')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        $this->get('/about')->assertHeaderMissing('X-Robots-Tag');
        $this->get('/blog')->assertHeaderMissing('X-Robots-Tag');
    }

    public function test_adsense_settings_drive_ads_txt_the_verification_tag_and_the_csp(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $this->get('/ads.txt')->assertNotFound();
        $this->get('/blog')->assertDontSee('google-adsense-account', false);

        $this->actingAs($superAdmin)->put('/admin/adsense', ['enabled' => true, 'client' => 'pub-123'])->assertSessionHasErrors('client');
        $this->actingAs($superAdmin)->put('/admin/adsense', ['enabled' => true, 'client' => null])->assertSessionHasErrors('client');
        $this->actingAs(User::factory()->admin()->create())->put('/admin/adsense', ['enabled' => true, 'client' => 'ca-pub-1234567890123456'])->assertForbidden();

        $this->actingAs($superAdmin)
            ->put('/admin/adsense', ['enabled' => true, 'client' => 'ca-pub-1234567890123456', 'slot_in_article' => '1111111111', 'slot_in_feed' => '2222222222'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        auth()->logout();

        $this->get('/ads.txt')->assertOk()->assertSeeText('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0');

        $response = $this->get('/blog')->assertSee('<meta name="google-adsense-account" content="ca-pub-1234567890123456">', false);
        $this->assertStringContainsString('https://pagead2.googlesyndication.com', $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('frame-src', $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("frame-ancestors 'none'", $response->headers->get('Content-Security-Policy'));
    }

    public function test_ads_are_offered_to_free_visitors_but_never_to_pro_members(): void
    {
        app(AdSense::class)->save(['enabled' => true, 'client' => 'ca-pub-1234567890123456', 'slot_in_article' => '1111111111', 'slot_in_feed' => '']);

        $this->get('/blog')->assertInertia(fn (Assert $page) => $page
            ->where('ads.client', 'ca-pub-1234567890123456')
            ->where('ads.slots.in_article', '1111111111'));

        $this->actingAs(User::factory()->pro()->create())
            ->get('/blog')
            ->assertInertia(fn (Assert $page) => $page->where('ads', null));

        app(AdSense::class)->save(['enabled' => false, 'client' => 'ca-pub-1234567890123456']);
        auth()->logout();
        $this->get('/blog')->assertInertia(fn (Assert $page) => $page->where('ads', null));
    }

    public function test_the_starter_guides_seeder_publishes_once_and_keeps_edits(): void
    {
        $this->seed(BlogPostSeeder::class);
        $this->assertSame(6, Post::query()->published()->count());

        Post::query()->where('slug', 'what-is-an-ats')->update(['title' => 'Edited title']);
        $this->seed(BlogPostSeeder::class);

        $this->assertSame(6, Post::query()->count());
        $this->assertSame('Edited title', Post::query()->where('slug', 'what-is-an-ats')->value('title'));
    }

    /**
     * @return array<string, string>
     */
    protected function contactPayload(): array
    {
        return [
            'name' => 'Ayesha',
            'email' => 'ayesha@example.com',
            'subject' => 'Billing question',
            'message' => 'How do I cancel my Pro plan at the end of the month?',
            'website' => '',
        ];
    }
}
