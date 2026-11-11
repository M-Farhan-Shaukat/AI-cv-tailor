<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Starter guides for the blog, read from database/seeders/blog/*.md. Safe to run again: posts that
 * already exist (by slug) are left alone, so edits made in the admin panel are kept.
 *
 * php artisan db:seed --class=BlogPostSeeder
 */
class BlogPostSeeder extends Seeder
{
    /**
     * @var array<int, array{slug: string, title: string, category: string, excerpt: string, meta: string, days_ago: int}>
     */
    protected const POSTS = [
        [
            'slug' => 'what-is-an-ats',
            'title' => 'What is an ATS and how does it read your CV?',
            'category' => 'ATS guides',
            'excerpt' => 'Applicant tracking systems decide whether a recruiter ever sees your CV. Here is how they parse, store and rank applications, and how to work with them honestly.',
            'meta' => 'How applicant tracking systems parse and rank CVs, why good candidates get filtered out, and how to make your CV ATS-friendly.',
            'days_ago' => 20,
        ],
        [
            'slug' => 'find-keywords-in-a-job-description',
            'title' => 'How to find the right keywords in a job description',
            'category' => 'ATS guides',
            'excerpt' => 'A five-step method to pull the search terms out of any job ad, separate must-haves from nice-to-haves, and map each one to real evidence in your CV.',
            'meta' => 'A simple five-step method for finding the ATS keywords in a job description and using them honestly in your CV.',
            'days_ago' => 16,
        ],
        [
            'slug' => 'ats-friendly-cv-formatting',
            'title' => 'ATS-friendly CV formatting: what to do and what to avoid',
            'category' => 'CV tips',
            'excerpt' => 'Columns, tables, icons and headers can scramble your CV inside an applicant tracking system. These formatting rules keep it readable for software and people.',
            'meta' => 'Formatting rules for an ATS-friendly CV: layout, headings, fonts, dates, file types and a quick self-test.',
            'days_ago' => 12,
        ],
        [
            'slug' => 'write-a-cv-summary',
            'title' => 'How to write a CV summary that gets read',
            'category' => 'CV tips',
            'excerpt' => 'Three or four sentences at the top of your CV decide whether the rest gets read. A simple structure, a before-and-after example and the mistakes to avoid.',
            'meta' => 'How to write a strong CV summary: a three-part structure, examples and common mistakes to avoid.',
            'days_ago' => 9,
        ],
        [
            'slug' => 'tailor-your-cv-for-every-job',
            'title' => 'Tailoring your CV for every job without starting over',
            'category' => 'Job search',
            'excerpt' => 'A master CV and a 20-minute routine are all you need to adapt your CV to each application, without changing the facts or inventing skills.',
            'meta' => 'A 20-minute routine for tailoring your CV to each job: keywords, summary, experience and skills, without starting from scratch.',
            'days_ago' => 5,
        ],
        [
            'slug' => 'write-achievement-bullet-points',
            'title' => 'Turning duties into achievements: writing strong CV bullet points',
            'category' => 'CV tips',
            'excerpt' => 'Recruiters skim past "responsible for". Use the action, task and result formula to write bullet points that prove impact and carry the right keywords.',
            'meta' => 'How to write achievement-based CV bullet points with the action, task, result formula, examples and verbs to use.',
            'days_ago' => 2,
        ],
    ];

    public function run(): void
    {
        $authorId = User::query()->where('role', UserRole::SuperAdmin->value)->value('id');
        $created = 0;

        foreach (self::POSTS as $post) {
            $path = database_path("seeders/blog/{$post['slug']}.md");

            if (! is_file($path) || Post::query()->where('slug', $post['slug'])->exists()) {
                continue;
            }

            Post::query()->create([
                'author_id' => $authorId,
                'title' => $post['title'],
                'slug' => $post['slug'],
                'category' => $post['category'],
                'excerpt' => $post['excerpt'],
                'meta_description' => $post['meta'],
                'body' => trim((string) file_get_contents($path)),
                'status' => Post::PUBLISHED,
                'published_at' => now()->subDays($post['days_ago']),
            ]);
            $created++;
        }

        $this->command?->info("{$created} guide(s) added. Existing guides were left unchanged.");
    }
}
