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

        if (empty($user->phone)) {
            $flash['info'] = 'To receive SMS notifications, please add your mobile number on your profile settings page.';
        }

        if ($user->hasRole('super_admin')) {
            return redirect()->route('admin.dashboard')->with($flash);
        }

        return redirect()->intended(config('fortify.home', '/dashboard'))->with($flash);
    }
}
