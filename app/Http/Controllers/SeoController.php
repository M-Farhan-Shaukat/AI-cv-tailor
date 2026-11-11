<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Services\AdSense;
use Illuminate\Http\Response;

/**
 * Files for crawlers: robots.txt, sitemap.xml and the AdSense ads.txt.
 */
class SeoController extends Controller
{
    /**
     * Public pages worth indexing, besides blog posts.
     *
     * @var array<int, string>
     */
    public const STATIC_PAGES = ['home', 'pricing', 'blog.index', 'pages.about', 'pages.contact', 'pages.privacy', 'pages.terms'];

    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            'Disallow: /admin',
            'Disallow: /profile',
            'Disallow: /resumes',
            'Disallow: /saved-jobs',
            'Disallow: /saved-searches',
            'Disallow: /tailor/',
            'Disallow: /download/',
            'Disallow: /billing/',
            '',
            'Sitemap: '.route('seo.sitemap'),
        ];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        $posts = Post::query()->published()->latest('published_at')->get(['slug', 'updated_at']);

        return response()
            ->view('seo.sitemap', [
                'pages' => array_map(fn (string $name): string => route($name), self::STATIC_PAGES),
                'posts' => $posts,
                'lastPostUpdate' => $posts->max('updated_at'),
            ])
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    public function adsTxt(AdSense $adSense): Response
    {
        $line = $adSense->adsTxt();

        abort_if($line === null, 404);

        return response($line."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
