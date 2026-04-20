<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $user = Auth::user();

        $flash = ['success' => 'Welcome back!'];

        if ($user->hasRole('super_admin')) {
            return redirect()->route('admin.dashboard')->with($flash);
        }

        if (empty($user->phone)) {
            $flash['info'] = 'To receive SMS notifications, please add your mobile number on your profile settings page.';
        }

        return redirect()->intended(config('fortify.home', '/dashboard'))->with($flash);
    }
}
