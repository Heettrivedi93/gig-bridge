<?php

use App\Support\PortalPermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('permissions_managed_at')->nullable()->after('status');
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PortalPermissions::all() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        DB::table('users')
            ->whereIn('id', function ($query) {
                $query->select('model_id')
                    ->from('model_has_permissions')
                    ->where('model_type', 'App\\Models\\User');
            })
            ->update([
                'permissions_managed_at' => now(),
            ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Permission::query()
            ->whereIn('name', PortalPermissions::all())
            ->delete();

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permissions_managed_at');
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
