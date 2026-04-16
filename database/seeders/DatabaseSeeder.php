<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Wallet;
use App\Support\PortalPermissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Create roles
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'seller']);
        Role::firstOrCreate(['name' => 'buyer']);

        foreach (PortalPermissions::all() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        // Create super admin (seeder-only, not via public registration)
        $admin = User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('12345678'),
                'status' => 'active',
            ]
        );

        $admin->assignRole($superAdminRole);

        Wallet::firstOrCreate(
            ['user_id' => null, 'owner_type' => 'system'],
            ['currency' => 'USD', 'status' => 'active']
        );

        $this->call(CategorySeeder::class);
        $this->call(PlanSeeder::class);
        $this->call(GigSeeder::class);
        $this->call(CouponSeeder::class);
    }
}
