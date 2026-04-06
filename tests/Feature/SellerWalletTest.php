<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WithdrawalRequest;
use Spatie\Permission\Models\Role;

function ensureSellerWalletRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function sellerWalletUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureSellerWalletRole('seller'));

    return $user;
}

function sellerWalletCategory(): array
{
    $parent = Category::create([
        'name' => 'Seller Wallet Parent',
        'slug' => 'seller-wallet-parent',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Seller Wallet Child',
        'slug' => 'seller-wallet-child',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function sellerWalletGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Seller Wallet Gig',
        'description' => 'Used to verify seller dashboard wallet summaries.',
        'tags' => ['wallet'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic package',
        'description' => 'Seller wallet package',
        'price' => 120,
        'delivery_days' => 3,
        'revision_count' => 1,
    ]);

    return $gig;
}

test('seller can view wallet balances on payment history page', function () {
    $seller = sellerWalletUser();

    Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 90,
        'pending_balance' => 20,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $this->actingAs($seller)
        ->get(route('seller.wallet.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('seller/wallet/index')
            ->where('wallet.available_balance', '90.00')
            ->where('wallet.pending_balance', '20.00'));
});

test('seller can submit withdrawal request from available balance', function () {
    $seller = sellerWalletUser();

    $wallet = Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 150,
        'pending_balance' => 0,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $this->actingAs($seller)
        ->post(route('seller.withdrawals.store'), [
            'amount' => 50,
            'method' => 'PayPal',
            'details' => 'seller-paypal@example.com',
        ])
        ->assertRedirect();

    $wallet->refresh();
    $withdrawal = WithdrawalRequest::query()->where('seller_id', $seller->id)->latest()->first();

    expect($wallet->available_balance)->toEqual('100.00');
    expect($wallet->pending_balance)->toEqual('50.00');
    expect($withdrawal)->not->toBeNull();
    expect($withdrawal?->status)->toBe('pending');
    expect($withdrawal?->amount)->toEqual('50.00');
});

test('seller dashboard shows wallet and recent order data', function () {
    $seller = sellerWalletUser();
    $buyer = User::factory()->create();
    [$category, $subcategory] = sellerWalletCategory();
    $gig = sellerWalletGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 108,
        'pending_balance' => 15,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $wallet = Wallet::query()->where('user_id', $seller->id)->where('owner_type', 'seller')->firstOrFail();

    $wallet->transactions()->create([
        'type' => 'seller_credit',
        'direction' => 'credit',
        'balance_bucket' => 'available',
        'amount' => 108,
        'balance_before' => 0,
        'balance_after' => 108,
        'description' => 'Released funds for completed order.',
    ]);

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Build the landing page.',
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

    $this->actingAs($seller)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('role', 'seller')
            ->where('walletSummary.available_balance', '108.00')
            ->where('recentTransactions.0.type', 'seller_credit')
            ->where('recentOrders.0.id', $order->id));
});
