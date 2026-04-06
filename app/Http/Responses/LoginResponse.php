<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $user = Auth::user();

        if ($user->hasRole('super_admin')) {
            return redirect()->route('admin.dashboard')->with('success', 'Welcome back!');
        }

        return redirect()->intended(config('fortify.home', '/dashboard'))->with('success', 'Welcome back!');
    }
}
