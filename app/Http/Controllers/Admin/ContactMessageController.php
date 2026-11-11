<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $onlyUnread = $request->boolean('unread');

        return Inertia::render('Admin/Messages', [
            'messages' => ContactMessage::query()
                ->when($onlyUnread, fn ($query) => $query->whereNull('read_at'))
                ->latest()
                ->paginate(20)
                ->withQueryString()
                ->through(fn (ContactMessage $message): array => [
                    ...$message->only(['id', 'name', 'email', 'subject', 'message', 'user_id']),
                    'is_read' => $message->read_at !== null,
                    'created_at' => $message->created_at?->toIso8601String(),
                ]),
            'unreadCount' => ContactMessage::query()->whereNull('read_at')->count(),
            'onlyUnread' => $onlyUnread,
            'seo' => ['title' => 'Messages'],
        ]);
    }

    public function update(Request $request, ContactMessage $contactMessage): RedirectResponse
    {
        $read = $request->validate(['read' => ['required', 'boolean']])['read'];

        $contactMessage->update(['read_at' => $read ? ($contactMessage->read_at ?? now()) : null]);

        return back();
    }

    public function destroy(ContactMessage $contactMessage): RedirectResponse
    {
        $contactMessage->delete();

        return back()->with('status', 'Message deleted.');
    }
}
