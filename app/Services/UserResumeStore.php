<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserResume;

/**
 * Keeps the CV a logged-in user uploads in their account so job scanning and
 * tailoring reuse the same primary resume.
 */
class UserResumeStore
{
    public function savePrimary(User $user, string $filename, string $cvText): UserResume
    {
        $primary = $user->resumes()->where('is_primary', true)->latest()->first();

        if ($primary !== null) {
            $primary->update([
                'original_filename' => $filename,
                'extracted_text' => $cvText,
            ]);

            return $primary;
        }

        $user->resumes()->update(['is_primary' => false]);

        return $user->resumes()->create([
            'original_filename' => $filename,
            'extracted_text' => $cvText,
            'is_primary' => true,
        ]);
    }

    /**
     * Use the account's primary CV when the request did not include a file.
     */
    public function primaryText(User $user): ?string
    {
        $text = $user->primaryResume()?->extracted_text;

        return filled($text) ? (string) $text : null;
    }
}
