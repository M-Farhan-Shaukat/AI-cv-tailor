<?php

namespace App\Http\Requests\Admin;

use App\Models\Post;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SavePostRequest extends FormRequest
{
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
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:180', 'alpha_dash', Rule::unique(Post::class)->ignore($this->route('post'))],
            'category' => ['required', 'string', 'max:60'],
            'excerpt' => ['required', 'string', 'max:300'],
            'meta_description' => ['nullable', 'string', 'max:160'],
            'body' => ['required', 'string', 'min:200'],
            'status' => ['required', Rule::in([Post::DRAFT, Post::PUBLISHED])],
            'published_at' => ['nullable', 'date'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $slug = trim((string) $this->input('slug'));

        $this->merge(['slug' => Str::slug($slug !== '' ? $slug : (string) $this->input('title'))]);
    }
}
