<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role'     => ['required', 'in:buyer,seller'],
        ])->validate();

        $user = User::create([
            'name'     => $input['name'],
            'email'    => $input['email'],
            'password' => $input['password'],
            'status'   => 'active',
        ]);

        $user->assignRole($input['role']);

        if ($input['role'] === 'seller') {
            $defaultPlan = Plan::query()
                ->where('status', 'active')
                ->orderBy('price')
                ->orderBy('id')
                ->first();

            if ($defaultPlan) {
                Subscription::create([
                    'user_id' => $user->id,
                    'plan_id' => $defaultPlan->id,
                    'starts_at' => now(),
                    'ends_at' => now()->addDays($defaultPlan->duration_days),
                    'status' => 'active',
                ]);
            }
        }

        return $user;
    }
}
