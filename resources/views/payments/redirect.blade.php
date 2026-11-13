<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Opening {{ $gateway }}…</title>
    <style>
        body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f6f7fb; color: #1f2937; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 16px; }
        main { background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(15, 23, 42, .08); padding: 32px; max-width: 420px; text-align: center; }
        button { background: #4f46e5; color: #fff; border: 0; border-radius: 10px; padding: 12px 24px; font-size: 1rem; cursor: pointer; }
        p { color: #6b7280; }
    </style>
</head>
<body>
    <main>
        <h1 style="font-size: 1.25rem;">Taking you to {{ $gateway }}…</h1>
        <p>Pay {{ $amount }} securely on {{ $gateway }}. You will come back here when you finish.</p>
        <form id="gateway-form" method="post" action="{{ $action }}">
            @foreach ($fields as $name => $value)
                <input type="hidden" name="{{ $name }}" value="{{ $value }}">
            @endforeach
            <button type="submit">Continue to {{ $gateway }}</button>
        </form>
    </main>
    <script>document.getElementById('gateway-form').submit();</script>
</body>
</html>
