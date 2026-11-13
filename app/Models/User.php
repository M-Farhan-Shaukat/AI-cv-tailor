<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasFactory, Notifiable;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => 'user',
    ];

    /**
     * @return HasMany<UserResume, $this>
     */
    public function resumes(): HasMany
    {
        return $this->hasMany(UserResume::class);
    }

    public function primaryResume(): ?UserResume
    {
        return $this->resumes()->where('is_primary', true)->latest()->first();
    }

    /**
     * @return HasMany<TailoredResume, $this>
     */
    public function tailoredResumes(): HasMany
    {
        return $this->hasMany(TailoredResume::class);
    }

    /**
     * @return HasMany<SavedJob, $this>
     */
    public function savedJobs(): HasMany
    {
        return $this->hasMany(SavedJob::class);
    }

    /**
     * @return HasMany<SavedSearch, $this>
     */
    public function savedSearches(): HasMany
    {
        return $this->hasMany(SavedSearch::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Pro paid for once through JazzCash, Easypaisa or a bank transfer (no auto-renewal).
     */
    public function hasPaidPro(): bool
    {
        return $this->pro_paid_until !== null && $this->pro_paid_until->isFuture();
    }

    /**
     * Admins and super admins can open the admin panel.
     */
    public function isAdmin(): bool
    {
        return $this->isSuperAdmin() || $this->role === UserRole::Admin;
    }

    /**
     * Super admins can also change roles and manage other admins.
     */
    public function isSuperAdmin(): bool
    {
        return $this->isConfiguredAdmin() || $this->role === UserRole::SuperAdmin;
    }

    /**
     * Listed in JOB_ADMIN_EMAILS: always a super admin, and cannot be demoted, suspended or deleted
     * from the panel, so the site can never lose its last super admin.
     */
    public function isConfiguredAdmin(): bool
    {
        return in_array(mb_strtolower($this->email), (array) config('job_scan.admin_emails', []), true);
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /**
     * Pro (a trial) given by an admin, without a Stripe subscription. pro_tailor_limit caps the CVs
     * tailored during it: null means the normal Pro limit, 0 unlimited.
     */
    public function hasComplimentaryPro(): bool
    {
        return $this->pro_until !== null && $this->pro_until->isFuture();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'suspended_at' => 'datetime',
            'pro_until' => 'datetime',
            'pro_started_at' => 'datetime',
            'pro_tailor_limit' => 'integer',
            'pro_paid_until' => 'datetime',
        ];
    }
}
