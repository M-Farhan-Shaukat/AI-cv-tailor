@php
    $contactLine = collect($resume['contact'] ?? [])->filter()->implode('  |  ');
    $joinParts = fn (array $parts, string $glue = '  |  ') => collect($parts)->filter()->implode($glue);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $resume['name'] ?: 'Resume' }}{{ $resume['headline'] ? ' - '.$resume['headline'] : '' }}</title>
    <style>
        @page { margin: 14mm 16mm; }
        body { font-family: "DejaVu Sans", Arial, Helvetica, sans-serif; font-size: 10.5px; line-height: 1.4; color: #111; margin: 0; }
        h1 { font-size: 20px; margin: 0 0 2px; }
        .headline { font-size: 12px; font-weight: bold; margin: 0 0 4px; }
        .contact { margin: 0 0 8px; }
        h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #333; margin: 12px 0 6px; padding-bottom: 2px; }
        h3 { font-size: 11px; margin: 8px 0 1px; }
        .meta { margin: 0 0 3px; color: #333; }
        p { margin: 0 0 4px; }
        ul { margin: 2px 0 6px 16px; padding: 0; }
        li { margin: 0 0 2px; }
    </style>
</head>
<body>
    <h1>{{ $resume['name'] }}</h1>
    @if ($resume['headline'])
        <p class="headline">{{ $resume['headline'] }}</p>
    @endif
    @if ($contactLine)
        <p class="contact">{{ $contactLine }}</p>
    @endif

    @if ($resume['summary'])
        <h2>Professional Summary</h2>
        <p>{{ $resume['summary'] }}</p>
    @endif

    @if ($resume['skills'])
        <h2>Skills</h2>
        @foreach ($resume['skills'] as $group)
            <p>@if ($group['category'])<strong>{{ $group['category'] }}:</strong> @endif{{ implode(', ', $group['items']) }}</p>
        @endforeach
    @endif

    @if ($resume['experience'])
        <h2>Professional Experience</h2>
        @foreach ($resume['experience'] as $job)
            <h3>{{ $joinParts([$job['title'], $job['company']], ' - ') }}</h3>
            <p class="meta">{{ $joinParts([$joinParts([$job['start_date'], $job['end_date']], ' - '), $job['location']]) }}</p>
            @if ($job['bullets'])
                <ul>
                    @foreach ($job['bullets'] as $bullet)
                        <li>{{ $bullet }}</li>
                    @endforeach
                </ul>
            @endif
        @endforeach
    @endif

    @if ($resume['projects'])
        <h2>Projects</h2>
        @foreach ($resume['projects'] as $project)
            <h3>{{ $project['name'] }}</h3>
            @if ($project['technologies'] || $project['link'])
                <p class="meta">{{ $joinParts([$project['technologies'] ? 'Technologies: '.implode(', ', $project['technologies']) : '', $project['link']]) }}</p>
            @endif
            @if ($project['bullets'])
                <ul>
                    @foreach ($project['bullets'] as $bullet)
                        <li>{{ $bullet }}</li>
                    @endforeach
                </ul>
            @endif
        @endforeach
    @endif

    @if ($resume['education'])
        <h2>Education</h2>
        @foreach ($resume['education'] as $degree)
            <h3>{{ $joinParts([$degree['degree'], $degree['institution']], ' - ') }}</h3>
            <p class="meta">{{ $joinParts([$joinParts([$degree['start_date'], $degree['end_date']], ' - '), $degree['location']]) }}</p>
            @if ($degree['details'])
                <p>{{ $degree['details'] }}</p>
            @endif
        @endforeach
    @endif

    @if ($resume['certifications'])
        <h2>Certifications</h2>
        <ul>
            @foreach ($resume['certifications'] as $certification)
                <li>{{ $certification }}</li>
            @endforeach
        </ul>
    @endif

    @if ($resume['languages'])
        <h2>Languages</h2>
        <p>{{ implode(', ', $resume['languages']) }}</p>
    @endif
</body>
</html>
