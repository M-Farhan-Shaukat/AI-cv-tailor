<?php

namespace App\Models;

use Database\Factories\JobSourceEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobSourceEvent extends Model
{
    /** @use HasFactory<JobSourceEventFactory> */
    use HasFactory;

    protected $fillable = [
        'provider',
        'successful',
        'status_code',
        'message',
        'context',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'successful' => 'boolean',
            'status_code' => 'integer',
            'context' => 'array',
        ];
    }
}
