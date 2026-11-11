<?php

namespace App\Models;

use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A blog article. The body is Markdown, rendered to HTML with raw HTML stripped.
 */
#[Fillable(['author_id', 'title', 'slug', 'category', 'excerpt', 'meta_description', 'body', 'status', 'published_at'])]
class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    public const DRAFT = 'draft';

    public const PUBLISHED = 'published';

    /**
     * Published and not scheduled for later.
     *
     * @param  Builder<Post>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', self::PUBLISHED)->where('published_at', '<=', now());
    }

    public function isPublished(): bool
    {
        return $this->status === self::PUBLISHED && $this->published_at !== null && $this->published_at->isPast();
    }

    /**
     * The body as safe HTML: Markdown only, raw HTML and unsafe links removed.
     */
    public function bodyHtml(): string
    {
        return Str::markdown($this->body, [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);
    }

    public function readingMinutes(): int
    {
        return max(1, (int) ceil(str_word_count(strip_tags($this->body)) / 220));
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }
}
