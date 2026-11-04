<?php

namespace App\Mail;

use App\Models\JobPosting;
use App\Models\SavedSearch;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class SavedSearchDigest extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  Collection<int, JobPosting>  $postings
     */
    public function __construct(
        public SavedSearch $savedSearch,
        public Collection $postings,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New jobs for "'.$this->savedSearch->name.'"',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.saved-search-digest',
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
