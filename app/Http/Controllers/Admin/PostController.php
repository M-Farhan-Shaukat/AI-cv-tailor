<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SavePostRequest;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Blog articles: write in Markdown, save as a draft or publish (now or at a set time).
 */
class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        return Inertia::render('Admin/Posts/Index', [
            'posts' => Post::query()
                ->with('author:id,name')
                ->when(in_array($status, [Post::DRAFT, Post::PUBLISHED], true), fn ($query) => $query->where('status', $status))
                ->latest('updated_at')
                ->paginate(20)
                ->withQueryString()
                ->through(fn (Post $post): array => [
                    'id' => $post->id,
                    'title' => $post->title,
                    'slug' => $post->slug,
                    'category' => $post->category,
                    'status' => $post->status,
                    'is_live' => $post->isPublished(),
                    'published_at' => $post->published_at?->toIso8601String(),
                    'updated_at' => $post->updated_at?->toIso8601String(),
                    'author' => $post->author?->name,
                    'reading_minutes' => $post->readingMinutes(),
                ]),
            'counts' => [
                'all' => Post::query()->count(),
                'published' => Post::query()->published()->count(),
                'draft' => Post::query()->where('status', Post::DRAFT)->count(),
            ],
            'status' => $status !== '' ? $status : null,
            'seo' => ['title' => 'Blog posts'],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Posts/Form', [
            'post' => null,
            'categories' => $this->categories(),
            'seo' => ['title' => 'New post'],
        ]);
    }

    public function store(SavePostRequest $request): RedirectResponse
    {
        $post = Post::query()->create([...$this->attributes($request), 'author_id' => $request->user()->id]);

        return to_route('admin.posts.edit', $post)->with('status', $post->isPublished() ? 'Post published.' : 'Draft saved.');
    }

    public function edit(Post $post): Response
    {
        return Inertia::render('Admin/Posts/Form', [
            'post' => [
                ...$post->only(['id', 'title', 'slug', 'category', 'excerpt', 'meta_description', 'body', 'status']),
                'published_at' => $post->published_at?->format('Y-m-d\TH:i'),
                'is_live' => $post->isPublished(),
                'url' => route('blog.show', $post->slug),
            ],
            'categories' => $this->categories(),
            'seo' => ['title' => 'Edit post'],
        ]);
    }

    public function update(SavePostRequest $request, Post $post): RedirectResponse
    {
        $post->update($this->attributes($request, $post));

        return back()->with('status', $post->isPublished() ? 'Post saved and live.' : 'Post saved.');
    }

    public function destroy(Post $post): RedirectResponse
    {
        $post->delete();

        return to_route('admin.posts.index')->with('status', 'Post deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function attributes(SavePostRequest $request, ?Post $post = null): array
    {
        $validated = $request->validated();
        $publishedAt = filled($validated['published_at'] ?? null) ? Carbon::parse($validated['published_at']) : null;

        if ($validated['status'] === Post::PUBLISHED) {
            $publishedAt ??= $post?->published_at ?? now();
        }

        return [...$validated, 'published_at' => $validated['status'] === Post::PUBLISHED ? $publishedAt : null];
    }

    /**
     * @return array<int, string>
     */
    protected function categories(): array
    {
        return Post::query()->distinct()->orderBy('category')->pluck('category')
            ->merge(['CV tips', 'ATS guides', 'Job search', 'Interviews', 'Career growth'])
            ->unique()
            ->values()
            ->all();
    }
}
