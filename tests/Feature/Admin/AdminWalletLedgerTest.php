<?php

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

    $this->actingAs($admin)
        ->get(route('admin.ledger.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/ledger/index')
            ->where('stats.1.value', '12.00')
            ->where('stats.2.value', '88.00')
            ->where('walletSummary.0.value', '75.00')
            ->where('transactions.0.type', 'seller_credit'));
});
