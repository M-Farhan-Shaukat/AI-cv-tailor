<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * The site's information pages: About, Contact, Privacy Policy and Terms of Service.
 */
class PageController extends Controller
{
    /**
     * Shown on the legal pages; change it when the policies change.
     */
    public const LEGAL_UPDATED_AT = '2026-11-11';

    public function about(): Response
    {
        return Inertia::render('Pages/About', [
            'seo' => [
                'title' => 'About',
                'description' => 'ResumeTailor AI helps job seekers check their ATS score and tailor their CV to each job, truthfully and for free.',
            ],
        ]);
    }

    public function privacy(): Response
    {
        return Inertia::render('Pages/Privacy', [
            'updatedAt' => self::LEGAL_UPDATED_AT,
            'contactEmail' => $this->contactEmail(),
            'seo' => [
                'title' => 'Privacy Policy',
                'description' => 'How ResumeTailor AI collects, uses and protects your data, including cookies and advertising.',
            ],
        ]);
    }

    public function terms(): Response
    {
        return Inertia::render('Pages/Terms', [
            'updatedAt' => self::LEGAL_UPDATED_AT,
            'contactEmail' => $this->contactEmail(),
            'seo' => [
                'title' => 'Terms of Service',
                'description' => 'The terms for using ResumeTailor AI, including accounts, subscriptions and acceptable use.',
            ],
        ]);
    }

    public function contact(Request $request): Response
    {
        return Inertia::render('Pages/Contact', [
            'contactEmail' => $this->contactEmail(),
            'defaults' => [
                'name' => $request->user()?->name ?? '',
                'email' => $request->user()?->email ?? '',
            ],
            'seo' => [
                'title' => 'Contact us',
                'description' => 'Questions, feedback or billing help: get in touch with the ResumeTailor AI team.',
            ],
        ]);
    }

    public function sendContact(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'website' => ['nullable', 'max:0'],
        ], [
            'website.max' => 'Your message could not be sent.',
        ]);

        $contactMessage = ContactMessage::query()->create([
            'user_id' => $request->user()?->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'ip_address' => $request->ip(),
        ]);

        $recipients = $this->adminEmails();

        if ($recipients !== []) {
            try {
                Mail::to($recipients)->send(new ContactMessageReceived($contactMessage));
            } catch (Throwable $exception) {
                Log::error('Contact message email failed', ['contact_message_id' => $contactMessage->id, 'message' => $exception->getMessage()]);
            }
        }

        return back()->with('status', 'Thanks, '.$validated['name'].'! Your message has been sent. We usually reply within two working days.');
    }

    protected function contactEmail(): string
    {
        return (string) config('mail.from.address');
    }

    /**
     * Super admins from the database and from JOB_ADMIN_EMAILS.
     *
     * @return array<int, string>
     */
    protected function adminEmails(): array
    {
        return User::query()
            ->where('role', UserRole::SuperAdmin->value)
            ->pluck('email')
            ->merge((array) config('job_scan.admin_emails', []))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
