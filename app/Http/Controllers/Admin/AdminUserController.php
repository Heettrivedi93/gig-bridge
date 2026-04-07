<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PortalPermissions;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminUserController extends Controller
{
    public function index()
    {
        $users = User::query()
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', 'super_admin'))
            ->with(['roles:id,name', 'permissions:id,name'])
            ->orderByDesc('id')
            ->get(['id', 'name', 'email', 'status', 'permissions_managed_at', 'created_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'roles' => $user->getRoleNames()->values(),
                'permissions' => $user->effectivePortalPermissions(),
                'permissions_managed_at' => $user->permissions_managed_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'permissionsByRole' => PortalPermissions::grouped(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        if ($user->hasRole('super_admin')) {
            return back()->withErrors([
                'role' => 'Super admin role and permissions cannot be modified here.',
            ]);
        }

        $assignablePermissions = PortalPermissions::forRole($user->primaryRoleName());

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'status' => ['required', 'in:active,banned'],
            'permissions' => ['array'],
            'permissions.*' => [Rule::in($assignablePermissions)],
        ]);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'status' => $data['status'],
        ]);

        $user->syncPermissions($data['permissions'] ?? []);
        $user->forceFill([
            'permissions_managed_at' => now(),
        ])->save();

        return back()->with('success', 'User updated successfully.');
    }
}
