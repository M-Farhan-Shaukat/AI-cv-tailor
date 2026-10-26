<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TailoredResume extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'original_filename',
        'job_description',
        'extracted_cv_text',
        'tailored_cv_json',
        'tailored_cv_html',
        'match_score',
        'original_score',
        'pdf_path',
        'ats_keywords',
        'score_report',
    ];

    protected $casts = [
        'ats_keywords' => 'array',
        'tailored_cv_json' => 'array',
        'score_report' => 'array',
    ];
}
