<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>New jobs for {{ $savedSearch->name }}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <h1 style="font-size: 20px;">New jobs for "{{ $savedSearch->name }}"</h1>

    <p>{{ $postings->count() }} new {{ $postings->count() === 1 ? 'job matches' : 'jobs match' }} your saved search with a match score of at least {{ $savedSearch->min_score }}%.</p>

    @foreach ($postings as $posting)
        <div style="border-top: 1px solid #e5e7eb; padding: 12px 0;">
            <h2 style="font-size: 16px; margin: 0 0 4px;">
                <a href="{{ route('jobs.show', $posting) }}" style="color: #2563eb; text-decoration: none;">{{ $posting->title }}</a>
            </h2>
            <p style="margin: 0; color: #4b5563;">
                {{ collect([$posting->company, $posting->location])->filter()->implode(' · ') }}
            </p>
        </div>
    @endforeach

    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
        You receive this email because alerts are enabled for this saved search. Manage it from your saved searches page.
    </p>
</body>
</html>
