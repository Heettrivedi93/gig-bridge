<?php

use App\Models\User;
use App\Support\PortalPermissions;
use Spatie\Permission\Models\Role;

function ensureUserPermissionRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function superAdminPermissionUser(): User
{
    $user = User::factory()->create([
        'status' => 'active',
    ]);
    $user->assignRole(ensureUserPermissionRole('super_admin'));

    return $user;
}

function sellerPermissionUser(): User
{
    $user = User::factory()->create([
        'status' => 'active',
    ]);
    $user->assignRole(ensureUserPermissionRole('seller'));

    return $user;
}

function buyerPermissionUser(): User
{
    $user = User::factory()->create([
        'status' => 'active',
    ]);
    $user->assignRole(ensureUserPermissionRole('buyer'));

    return $user;
}

test('seller gets default feature access until super admin customizes permissions', function () {
    $admin = superAdminPermissionUser();
    $seller = sellerPermissionUser();

    $this->actingAs($seller)
        ->get(route('seller.orders.index'))
        ->assertOk();

    $this->actingAs($admin)
        ->put(route('admin.users.update', $seller), [
            'name' => $seller->name,
            'email' => $seller->email,
            'status' => 'active',
            'permissions' => [
                'seller.gigs.access',
                'seller.plans.access',
                'seller.wallet.access',
                'seller.payments.access',
            ],
        ])
        ->assertRedirect();

    $seller->refresh();

    expect($seller->permissions_managed_at)->not->toBeNull();
    expect($seller->effectivePortalPermissions())->not->toContain('seller.orders.access');

    $this->actingAs($seller)
        ->get(route('seller.orders.index'))
        ->assertForbidden();

    $this->actingAs($seller)
        ->get(route('seller.payments.index'))
        ->assertOk();
});

test('buyer gets default feature access until super admin customizes permissions', function () {
    $admin = superAdminPermissionUser();
    $buyer = buyerPermissionUser();

    $this->actingAs($buyer)
        ->get(route('buyer.gigs.index'))
        ->assertOk();

    $this->actingAs($admin)
        ->put(route('admin.users.update', $buyer), [
            'name' => $buyer->name,
            'email' => $buyer->email,
            'status' => 'active',
            'permissions' => [
                'buyer.orders.access',
                'buyer.payments.access',
            ],
        ])
        ->assertRedirect();

    $buyer->refresh();

    expect($buyer->permissions_managed_at)->not->toBeNull();
    expect($buyer->effectivePortalPermissions())->not->toContain('buyer.gigs.access');

    $this->actingAs($buyer)
        ->get(route('buyer.gigs.index'))
        ->assertForbidden();

    $this->actingAs($buyer)
        ->get(route('buyer.orders.index'))
        ->assertOk();
});

test('super admin can view effective default permissions in user management', function () {
    $admin = superAdminPermissionUser();
    $seller = sellerPermissionUser();
    $buyer = buyerPermissionUser();

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/users/index')
            ->where('users.0.permissions', PortalPermissions::BUYER)
            ->where('users.1.permissions', PortalPermissions::SELLER)
            ->where('permissionsByRole.seller', PortalPermissions::SELLER)
            ->where('permissionsByRole.buyer', PortalPermissions::BUYER));
});
