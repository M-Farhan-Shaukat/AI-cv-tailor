<?php

namespace App\Http\Requests\Admin;

use App\Services\GroqKeyPool;
use App\Services\GroqService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreGroqApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-ai-keys');
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'key' => ['required', 'string', 'min:20', 'max:255', 'not_regex:/\s/'],
        ];
    }

    /**
     * Reject duplicates, then ask Groq whether the key works before it is saved.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $key = trim((string) $this->input('key'));

                if (app(GroqKeyPool::class)->contains($key)) {
                    $validator->errors()->add('key', 'This key is already added.');

                    return;
                }

                $works = app(GroqService::class)->verifyKey($key);

                if ($works === false) {
                    $validator->errors()->add('key', 'Groq rejected this key. Check that it was copied completely and is not revoked.');
                } elseif ($works === null) {
                    $validator->errors()->add('key', 'Could not reach Groq to check this key. Try again in a moment.');
                }
            },
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['key' => trim((string) $this->input('key')), 'name' => trim((string) $this->input('name'))]);
    }
}
