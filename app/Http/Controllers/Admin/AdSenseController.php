<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdSense;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AdSenseController extends Controller
{
    public function edit(Request $request, AdSense $adSense): Response
    {
        return Inertia::render('Admin/AdSense', [
            'settings' => $adSense->settings(),
            'adsTxt' => $adSense->adsTxt(),
            'adsTxtUrl' => route('seo.ads'),
            'sitemapUrl' => route('seo.sitemap'),
            'canManage' => $request->user()->can('manage-site-settings'),
            'seo' => ['title' => 'AdSense'],
        ]);
    }

    public function update(Request $request, AdSense $adSense): RedirectResponse
    {
        Gate::authorize('manage-site-settings');

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'client' => ['nullable', 'required_if:enabled,true', 'regex:/^ca-pub-\d{10,20}$/'],
            'slot_in_article' => ['nullable', 'regex:/^\d{6,20}$/'],
            'slot_in_feed' => ['nullable', 'regex:/^\d{6,20}$/'],
        ], [
            'client.regex' => 'The publisher ID looks like ca-pub-1234567890123456.',
            'client.required_if' => 'Add your publisher ID before turning ads on.',
            'slot_in_article.regex' => 'An ad unit ID is the number from data-ad-slot, e.g. 1234567890.',
            'slot_in_feed.regex' => 'An ad unit ID is the number from data-ad-slot, e.g. 1234567890.',
        ]);

        $adSense->save($validated);

        return back()->with('status', 'AdSense settings saved.');
    }
}
