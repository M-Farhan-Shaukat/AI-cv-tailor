<?php

namespace App\Models;

use Database\Factories\JobSourceStatusFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobSourceStatus extends Model
{
    /** @use HasFactory<JobSourceStatusFactory> */
    use HasFactory;

    protected $fillable = [
        'provider',
        'last_attempt_at',
        'last_success_at',
        'last_error_at',
        'last_status_code',
        'last_error_message',
        'consecutive_failures',
        'disabled_until',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_attempt_at' => 'datetime',
            'last_success_at' => 'datetime',
            'last_error_at' => 'datetime',
            'last_status_code' => 'integer',
            'consecutive_failures' => 'integer',
            'disabled_until' => 'datetime',
        ];
    }

    public function isCoolingDown(): bool
    {
        return $this->disabled_until !== null && $this->disabled_until->isFuture();
    }
}
