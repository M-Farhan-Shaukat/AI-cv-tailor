<?php

namespace App\Http\Requests\Admin;

use App\Enums\ResumeTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkTailoredResumeRequest extends FormRequest
{
    public const MAX_RESUMES = 100;

    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_RESUMES],
            'ids.*' => ['integer', 'distinct', 'exists:tailored_resumes,id'],
            'action' => ['required', Rule::in(['template', 'delete'])],
            'template' => ['required_if:action,template', 'nullable', Rule::enum(ResumeTemplate::class)],
        ];
    }
}
