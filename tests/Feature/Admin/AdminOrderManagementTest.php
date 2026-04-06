<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\User;
use App\Models\Setting;
use App\Models\Wallet;
use Spatie\Permission\Models\Role;

function ensureAdminOrderRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function superAdminOrderUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminOrderRole('super_admin'));

    return $user;
}

function sellerAdminOrderUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminOrderRole('seller'));

    return $user;
}

function buyerAdminOrderUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminOrderRole('buyer'));

    return $user;
}

function adminOrderCategory(): array
{
    $parent = Category::create([
        'name' => 'Admin Design',
        'slug' => 'admin-design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Admin Logo Design',
        'slug' => 'admin-logo-design',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function adminOrderGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Admin Managed Gig',
        'description' => 'A gig used to verify admin order overrides.',
        'tags' => ['admin', 'orders'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic package',
        'description' => 'Package details',
        'price' => 120,
        'delivery_days' => 5,
        'revision_count' => 2,
    ]);

    return $gig;
}

test('super admin can view order management page', function () {
    Setting::setValue('payment_platform_fee_percentage', 15);

    [$category, $subcategory] = adminOrderCategory();
    $admin = superAdminOrderUser();
    $seller = sellerAdminOrderUser();
    $buyer = buyerAdminOrderUser();
    $gig = adminOrderGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need admin visibility on this order.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 120,
        'price' => 120,
        'status' => 'active',
        'payment_status' => 'paid',
        'fund_status' => 'escrow',
        'escrow_held' => true,
        'gross_amount' => 120,
        'platform_fee_percentage' => 15,
        'platform_fee_amount' => 18,
        'seller_net_amount' => 102,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.orders.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/orders/index')
            ->where('orders.0.gig_title', $gig->title)
            ->where('orders.0.buyer.name', $buyer->name)
            ->where('stats.2.value', '120.00')
            ->where('orders.0.fund_status', 'escrow'));
});

test('super admin can override order lifecycle and payment fields', function () {
    [$category, $subcategory] = adminOrderCategory();
    $admin = superAdminOrderUser();
    $seller = sellerAdminOrderUser();
    $buyer = buyerAdminOrderUser();
    $gig = adminOrderGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need admin override.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 120,
        'price' => 120,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'fund_status' => 'escrow',
        'escrow_held' => true,
        'gross_amount' => 120,
        'platform_fee_percentage' => 10,
        'platform_fee_amount' => 12,
        'seller_net_amount' => 108,
        'delivered_at' => now()->subDay(),
    ]);

    $this->actingAs($admin)
        ->put(route('admin.orders.update', $order), [
            'status' => 'completed',
            'payment_status' => 'released',
            'escrow_held' => false,
            'delivered_at' => now()->subDay()->toDateTimeString(),
            'completed_at' => now()->toDateTimeString(),
            'cancelled_at' => null,
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->status)->toBe('completed');
    expect($order->payment_status)->toBe('released');
    expect($order->escrow_held)->toBeFalse();
    expect($order->completed_at)->not->toBeNull();
});

test('super admin can release funds for releasable order', function () {
    Wallet::query()->firstOrCreate(
        ['user_id' => null, 'owner_type' => 'system'],
        ['currency' => 'USD', 'status' => 'active', 'escrow_balance' => 0]
    );

    [$category, $subcategory] = adminOrderCategory();
    $admin = superAdminOrderUser();
    $seller = sellerAdminOrderUser();
    $buyer = buyerAdminOrderUser();
    $gig = adminOrderGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Release escrow for this order.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 120,
        'price' => 120,
        'gross_amount' => 120,
        'platform_fee_percentage' => 10,
        'platform_fee_amount' => 12,
        'seller_net_amount' => 108,
        'status' => 'completed',
        'payment_status' => 'paid',
        'fund_status' => 'releasable',
        'escrow_held' => true,
        'delivered_at' => now()->subDay(),
        'completed_at' => now(),
    ]);

    $systemWallet = Wallet::query()->where('owner_type', 'system')->firstOrFail();
    $systemWallet->update([
        'escrow_balance' => 120,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.orders.release-funds', $order))
        ->assertRedirect();

    $order->refresh();
    $systemWallet->refresh();
    $sellerWallet = Wallet::query()->where('user_id', $seller->id)->where('owner_type', 'seller')->first();

    expect($order->fund_status)->toBe('released');
    expect($order->payment_status)->toBe('released');
    expect($order->funds_released_at)->not->toBeNull();
    expect($order->released_by)->toBe($admin->id);
    expect($systemWallet->escrow_balance)->toEqual('0.00');
    expect($systemWallet->available_balance)->toEqual('12.00');
    expect($sellerWallet?->available_balance)->toEqual('108.00');
});
