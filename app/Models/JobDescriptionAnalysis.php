<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * The ATS keywords extracted from one job description, stored by a hash of its text so the same
 * job description always yields the same keywords and therefore a repeatable score.
 */
class JobDescriptionAnalysis extends Model
{
    protected $fillable = [
        'hash',
        'job_title',
        'keywords',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'keywords' => 'array',
        ];
    }
}
