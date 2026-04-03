<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;

class AdminUserController extends Controller
{
    public function index()
    {
        $users = User::query()
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', 'super_admin'))
            ->with(['roles:id,name', 'permissions:id,name'])
            ->orderByDesc('id')
            ->get(['id', 'name', 'email', 'status', 'created_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'roles' => $user->getRoleNames()->values(),
                'permissions' => $user->getDirectPermissions()->pluck('name')->values(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'permissions' => Permission::query()->orderBy('name')->pluck('name')->values(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        if ($user->hasRole('super_admin')) {
            return back()->withErrors([
                'role' => 'Super admin role and permissions cannot be modified here.',
            ]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'status' => ['required', 'in:active,banned'],
            'permissions' => ['array'],
            'permissions.*' => [Rule::exists('permissions', 'name')],
        ]);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'status' => $data['status'],
        ]);

        $user->syncPermissions($data['permissions'] ?? []);

        return back()->with('success', 'User updated successfully.');
    }
}
