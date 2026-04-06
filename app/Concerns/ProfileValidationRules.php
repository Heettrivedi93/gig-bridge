<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        $rules = [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
        ];

        if ($userId !== null && User::query()->whereKey($userId)->whereDoesntHave('roles', fn ($query) => $query->where('name', 'super_admin'))->exists()) {
            $rules += [
                'bio' => ['nullable', 'string', 'max:5000'],
                'phone' => ['nullable', 'string', 'max:50'],
                'profile_picture' => ['nullable', 'image', 'max:2048'],
                'remove_profile_picture' => ['nullable', 'boolean'],
                'skills' => ['nullable', 'string', 'max:2000'],
                'location' => ['nullable', 'string', 'max:255'],
                'website' => ['nullable', 'url', 'max:255'],
            ];
        }

        return $rules;
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
