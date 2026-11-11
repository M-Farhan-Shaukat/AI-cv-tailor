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
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>
<body>
    @inertia
</body>
</html>
