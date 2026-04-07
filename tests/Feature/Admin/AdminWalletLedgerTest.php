<?php

use App\Models\Plan;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\Wallet;
use Spatie\Permission\Models\Role;

function ensureAdminLedgerRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function superAdminLedgerUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminLedgerRole('super_admin'));

    return $user;
}

test('super admin can view wallet ledger page', function () {
    $admin = superAdminLedgerUser();
    $seller = User::factory()->create();
    $seller->assignRole(ensureAdminLedgerRole('seller'));
    $plan = Plan::create([
        'name' => 'Ledger Revenue Plan',
        'price' => 29,
        'duration_days' => 30,
        'gig_limit' => 10,
        'features' => ['Ledger revenue'],
        'status' => 'active',
    ]);

    $systemWallet = Wallet::create([
        'user_id' => null,
        'owner_type' => 'system',
        'currency' => 'USD',
        'available_balance' => 12,
        'pending_balance' => 0,
        'escrow_balance' => 88,
        'status' => 'active',
    ]);

    $sellerWallet = Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 75,
        'pending_balance' => 25,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $systemWallet->transactions()->create([
        'type' => 'platform_fee',
        'direction' => 'credit',
        'balance_bucket' => 'available',
        'amount' => 12,
        'balance_before' => 0,
        'balance_after' => 12,
        'description' => 'Platform fee retained.',
    ]);

    $sellerWallet->transactions()->create([
        'type' => 'seller_credit',
        'direction' => 'credit',
        'balance_bucket' => 'available',
        'amount' => 75,
        'balance_before' => 0,
        'balance_after' => 75,
        'description' => 'Seller payout released.',
    ]);

    SubscriptionPayment::create([
        'user_id' => $seller->id,
        'plan_id' => $plan->id,
        'provider' => 'paypal',
        'provider_order_id' => 'ledger-revenue-order',
        'provider_capture_id' => 'ledger-revenue-capture',
        'amount' => 29,
        'currency' => 'USD',
        'status' => 'completed',
        'payload' => [],
        'captured_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('admin.ledger.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/ledger/index')
            ->where('stats.1.value', '88.00')
            ->where('stats.2.value', '25.00')
            ->where('stats.3.value', '75.00')
            ->where('revenueSummary.0.value', '29.00')
            ->where('revenueSummary.1.value', '12.00')
            ->where('revenueSummary.2.value', '75.00')
            ->where('revenueSummary.3.value', '41.00')
            ->where('walletSummary.0.value', '75.00')
            ->where('transactions.0.type', 'seller_credit'));
});
