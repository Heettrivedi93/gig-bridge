<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\Plan;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\Wallet;
use Spatie\Permission\Models\Role;

function ensureAdminDashboardRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function superAdminDashboardUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminDashboardRole('super_admin'));

    return $user;
}

test('super admin dashboard shows paid plan and commission revenue', function () {
    $admin = superAdminDashboardUser();
    $seller = User::factory()->create();
    $seller->assignRole(ensureAdminDashboardRole('seller'));
    $buyer = User::factory()->create();

    $category = Category::create([
        'name' => 'Revenue Parent',
        'slug' => 'revenue-parent',
        'status' => 'active',
    ]);

    $subcategory = Category::create([
        'name' => 'Revenue Child',
        'slug' => 'revenue-child',
        'parent_id' => $category->id,
        'status' => 'active',
    ]);

    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Revenue Gig',
        'description' => 'Used for dashboard revenue reporting.',
        'tags' => ['revenue'],
        'status' => 'active',
    ]);

    $package = GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic revenue package',
        'description' => 'Revenue package',
        'price' => 120,
        'delivery_days' => 3,
        'revision_count' => 1,
    ]);

    $plan = Plan::create([
        'name' => 'Admin Revenue Plan',
        'price' => 29,
        'duration_days' => 30,
        'gig_limit' => 10,
        'features' => ['Revenue stats'],
        'status' => 'active',
    ]);

    Wallet::create([
        'user_id' => null,
        'owner_type' => 'system',
        'currency' => 'USD',
        'available_balance' => 12,
        'pending_balance' => 0,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need this delivered.',
        'billing_name' => 'Buyer',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 120,
        'price' => 120,
        'gross_amount' => 120,
        'platform_fee_percentage' => 10,
        'platform_fee_amount' => 12,
        'seller_net_amount' => 108,
        'status' => 'completed',
        'payment_status' => 'released',
        'fund_status' => 'released',
        'escrow_held' => false,
        'completed_at' => now(),
        'funds_released_at' => now(),
    ]);

    SubscriptionPayment::create([
        'user_id' => $seller->id,
        'plan_id' => $plan->id,
        'provider' => 'paypal',
        'provider_order_id' => 'admin-dashboard-plan-order',
        'provider_capture_id' => 'admin-dashboard-plan-capture',
        'amount' => 29,
        'currency' => 'USD',
        'status' => 'completed',
        'payload' => [],
        'captured_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/dashboard')
            ->where('stats.0.value', '29.00')
            ->where('stats.1.value', '12.00')
            ->where('stats.2.value', '41.00')
            ->where('stats.3.value', '120.00'));
});
