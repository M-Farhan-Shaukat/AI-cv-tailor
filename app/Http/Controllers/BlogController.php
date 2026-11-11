<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    protected const PER_PAGE = 9;

    public function index(Request $request): Response
    {
        $category = $request->string('category')->trim()->toString();

        $posts = Post::query()
            ->published()
            ->when($category !== '', fn ($query) => $query->where('category', $category))
            ->latest('published_at')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Post $post): array => $this->summary($post));

        return Inertia::render('Blog/Index', [
            'posts' => $posts,
            'categories' => Post::query()->published()->distinct()->orderBy('category')->pluck('category'),
            'category' => $category !== '' ? $category : null,
            'seo' => [
                'title' => 'CV & job search guides',
                'description' => 'Practical guides on ATS-friendly CVs, keywords, cover letters and job applications.',
            ],
        ]);
    }

    /**
     * A published article. Admins may also preview drafts.
     */
    public function show(Request $request, string $slug): Response
    {
        $post = Post::query()->where('slug', $slug)->with('author:id,name')->firstOrFail();

        abort_unless($post->isPublished() || $request->user()?->isAdmin(), 404);

        return Inertia::render('Blog/Show', [
            'post' => [
                ...$this->summary($post),
                'body_html' => $post->bodyHtml(),
                'author' => $post->author?->name ?? 'ResumeTailor AI team',
                'updated_at' => $post->updated_at?->toIso8601String(),
                'is_published' => $post->isPublished(),
            ],
            'related' => Post::query()->published()->whereKeyNot($post->id)->where('category', $post->category)->latest('published_at')->limit(3)->get()
                ->map(fn (Post $related): array => $this->summary($related)),
            'seo' => [
                'title' => $post->title,
                'description' => $post->meta_description ?: $post->excerpt,
                'type' => 'article',
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function summary(Post $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'category' => $post->category,
            'excerpt' => $post->excerpt,
            'published_at' => $post->published_at?->toIso8601String(),
            'reading_minutes' => $post->readingMinutes(),
        ];
    }
}
