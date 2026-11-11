<?php

namespace App\Models;

use Database\Factories\GroqApiKeyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A Groq API key added from the admin panel. The key is encrypted at rest (APP_KEY) and hidden from
 * serialisation; only its fingerprint and last four characters are ever shown.
 */
#[Fillable(['name', 'key', 'fingerprint', 'last_four', 'is_active', 'added_by'])]
#[Hidden(['key'])]
class GroqApiKey extends Model
{
    /** @use HasFactory<GroqApiKeyFactory> */
    use HasFactory;

    /**
     * Short, non-reversible id of a key, shared with the key pool's pause markers.
     */
    public static function fingerprintOf(string $key): string
    {
        return substr(hash('sha256', $key), 0, 16);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'key' => 'encrypted',
            'is_active' => 'boolean',
        ];
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
