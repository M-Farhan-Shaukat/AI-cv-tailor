<?php

namespace App\Models;

use Database\Factories\RequestLogFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One logged call: written by the server when a request arrives (status_code stays null until it
 * finishes, so a row that never gets one was killed mid-request), or reported by the browser when
 * a request never got a response at all.
 */
class RequestLog extends Model
{
    /** @use HasFactory<RequestLogFactory> */
    use HasFactory;

    public const SOURCE_SERVER = 'server';

    public const SOURCE_BROWSER = 'browser';

    /**
     * Days logs are kept before they are pruned.
     */
    public const RETENTION_DAYS = 14;

    protected $fillable = [
        'source',
        'method',
        'path',
        'status_code',
        'duration_ms',
        'user_id',
        'ip',
        'user_agent',
        'upload',
        'error',
        'context',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'duration_ms' => 'integer',
            'upload' => 'array',
            'context' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
