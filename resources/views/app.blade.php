<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @if ($adsensePublisherId = app(\App\Services\AdSense::class)->publisherId())
    <meta name="google-adsense-account" content="ca-{{ $adsensePublisherId }}">
    @endif
    <link rel="icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @inertiaHead
    @unless ($__inertiaSsrResponse ?? null)
    @php
        $seo = (array) ($page['props']['seo'] ?? []);
        $siteName = $page['props']['site']['name'] ?? config('app.name');
        $siteUrl = rtrim((string) config('app.url'), '/');
        $metaTitle = ! empty($seo['title']) ? $seo['title'].' | '.$siteName : $siteName.': ATS resume checker and CV tailoring';
        $metaDescription = $seo['description'] ?? "Check your CV against any job description, see your ATS score and tailor your resume with the job's keywords.";
        $metaImage = $seo['image'] ?? $siteUrl.'/images/resumetailor-banner.png';
        $metaUrl = request()->url();
    @endphp
    {{-- Fallback head tags for crawlers when SSR is off; Inertia's client head manager replaces them (data-inertia). --}}
    <title data-inertia="server-title">{{ $metaTitle }}</title>
    <meta data-inertia="server-description" name="description" content="{{ $metaDescription }}">
    <link data-inertia="server-canonical" rel="canonical" href="{{ $metaUrl }}">
    <meta data-inertia="server-og-site-name" property="og:site_name" content="{{ $siteName }}">
    <meta data-inertia="server-og-type" property="og:type" content="{{ $seo['type'] ?? 'website' }}">
    <meta data-inertia="server-og-title" property="og:title" content="{{ $metaTitle }}">
    <meta data-inertia="server-og-description" property="og:description" content="{{ $metaDescription }}">
    <meta data-inertia="server-og-url" property="og:url" content="{{ $metaUrl }}">
    <meta data-inertia="server-og-image" property="og:image" content="{{ $metaImage }}">
    <meta data-inertia="server-og-image-width" property="og:image:width" content="1200">
    <meta data-inertia="server-og-image-height" property="og:image:height" content="627">
    <meta data-inertia="server-twitter-card" name="twitter:card" content="summary_large_image">
    <meta data-inertia="server-twitter-title" name="twitter:title" content="{{ $metaTitle }}">
    <meta data-inertia="server-twitter-description" name="twitter:description" content="{{ $metaDescription }}">
    <meta data-inertia="server-twitter-image" name="twitter:image" content="{{ $metaImage }}">
    @endunless
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>
<body>
    @inertia
</body>
</html>
