@php
    /**
     * Single-column, table-free resume so every ATS parser reads it top to bottom.
     * $design (fonts, sizes, colours, alignment, page set-up) mirrors the uploaded CV; see App\Services\ResumeDesign.
     * $sections lists the non-empty sections in the CV's own order, keyed to their headings; CV sections outside
     * that list (achievements, awards, ...) come from $resume['additional_sections'] and are rendered last.
     */
    $contactLine = collect($resume['contact'] ?? [])->filter()->implode('  |  ');
    $joinParts = fn (array $parts, string $glue = '  |  ') => collect($parts)->filter()->implode($glue);
    $margins = $design['margins'];
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $resume['name'] ?: 'Resume' }}{{ $resume['headline'] ? ' - '.$resume['headline'] : '' }}</title>
    <style>
        @page { size: {{ $design['page_size'] === 'letter' ? 'letter' : 'A4' }} portrait; margin: {{ $margins['top'] }}mm {{ $margins['right'] }}mm {{ $margins['bottom'] }}mm {{ $margins['left'] }}mm; }
        body { font-family: {!! $fontStack !!}; font-size: {{ $design['body_size'] }}pt; line-height: {{ $design['line_height'] }}; color: {{ $design['text_color'] }}; margin: 0; }
        h1 { font-size: {{ $design['name_size'] }}pt; line-height: 1.15; color: {{ $design['name_color'] }}; text-align: {{ $design['header_align'] }}; margin: 0 0 2pt; }
        .headline { font-size: {{ $design['headline_size'] }}pt; font-weight: {{ $design['headline_bold'] ? 'bold' : 'normal' }}; text-align: {{ $design['header_align'] }}; margin: 0 0 3pt; }
        .contact { text-align: {{ $design['header_align'] }}; margin: 0 0 6pt; }
        h2 { font-size: {{ $design['heading_size'] }}pt; line-height: 1.2; color: {{ $design['heading_color'] }}; text-transform: {{ $design['heading_uppercase'] ? 'uppercase' : 'none' }}; letter-spacing: {{ $design['heading_uppercase'] ? '0.4pt' : '0' }}; margin: 10pt 0 4pt; padding-bottom: 2pt;@if ($design['heading_rule']) border-bottom: 0.75pt solid {{ $design['heading_color'] }};@endif }
        h3 { font-size: {{ $design['body_size'] + 0.5 }}pt; margin: 6pt 0 1pt; }
        .meta { margin: 0 0 2pt; }
        p { margin: 0 0 3pt; }
        ul { margin: 2pt 0 5pt 14pt; padding: 0; }
        li { margin: 0 0 1.5pt; }
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

    @foreach ($sections as $section => $title)
        <h2>{{ $title }}</h2>

        @switch($section)
            @case('summary')
                <p>{{ $resume['summary'] }}</p>
                @break

            @case('skills')
                @foreach ($resume['skills'] as $group)
                    <p>@if ($group['category'])<strong>{{ $group['category'] }}:</strong> @endif{{ implode(', ', $group['items']) }}</p>
                @endforeach
                @break

            @case('experience')
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
                @break

            @case('projects')
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
                @break

            @case('education')
                @foreach ($resume['education'] as $degree)
                    <h3>{{ $joinParts([$degree['degree'], $degree['institution']], ' - ') }}</h3>
                    <p class="meta">{{ $joinParts([$joinParts([$degree['start_date'], $degree['end_date']], ' - '), $degree['location']]) }}</p>
                    @if ($degree['details'])
                        <p>{{ $degree['details'] }}</p>
                    @endif
                @endforeach
                @break

            @case('certifications')
                <ul>
                    @foreach ($resume['certifications'] as $certification)
                        <li>{{ $certification }}</li>
                    @endforeach
                </ul>
                @break

            @case('languages')
                <p>{{ implode(', ', $resume['languages']) }}</p>
                @break
        @endswitch
    @endforeach

    @foreach ($resume['additional_sections'] ?? [] as $extra)
        <h2>{{ $extra['title'] }}</h2>
        <ul>
            @foreach ($extra['items'] as $item)
                <li>{{ $item }}</li>
            @endforeach
        </ul>
    @endforeach
</body>
</html>
