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
     * Pro given by an admin, without a Stripe subscription.
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
        ];
    }
}
