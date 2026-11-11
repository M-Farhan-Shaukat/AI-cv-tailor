<!DOCTYPE html>
<html lang="en">
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
    <h2 style="margin: 0 0 12px;">New message from the contact page</h2>
    <p style="margin: 0 0 4px;"><strong>From:</strong> {{ $contactMessage->name }} &lt;{{ $contactMessage->email }}&gt;</p>
    <p style="margin: 0 0 16px;"><strong>Subject:</strong> {{ $contactMessage->subject }}</p>
    <div style="padding: 16px; background: #f5f7fb; border-radius: 8px; white-space: pre-wrap;">{{ $contactMessage->message }}</div>
    <p style="margin-top: 16px; color: #64748b; font-size: 13px;">Reply to this email to answer {{ $contactMessage->name }}. All messages are also in Admin → Messages.</p>
</body>
</html>
