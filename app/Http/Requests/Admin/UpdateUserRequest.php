<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Admins edit regular users, super admins also edit admins (see the "manage-user" gate).
     */
    public function authorize(): bool
    {
        return $this->user()->can('manage-user', $this->target());
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($this->target()->id)],
            'role' => ['required', Rule::enum(UserRole::class)],
            'email_verified' => ['required', 'boolean'],
        ];
    }

    public function target(): User
    {
        return $this->route('user');
    }
}
