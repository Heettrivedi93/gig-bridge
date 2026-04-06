<?php

use App\Models\User;
use App\Models\Wallet;
use App\Models\WithdrawalRequest;
use Spatie\Permission\Models\Role;

function ensureAdminWithdrawalRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function superAdminWithdrawalUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminWithdrawalRole('super_admin'));

    return $user;
}

function sellerWithdrawalUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureAdminWithdrawalRole('seller'));

    return $user;
}

test('super admin can view withdrawal management page', function () {
    $admin = superAdminWithdrawalUser();
    $seller = sellerWithdrawalUser();

    $wallet = Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 0,
        'pending_balance' => 50,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    WithdrawalRequest::create([
        'seller_id' => $seller->id,
        'wallet_id' => $wallet->id,
        'amount' => 50,
        'status' => 'pending',
        'method' => 'PayPal',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.withdrawals.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/withdrawals/index')
            ->where('requests.0.seller.name', $seller->name)
            ->where('requests.0.status', 'pending'));
});

test('super admin can approve withdrawal request', function () {
    $admin = superAdminWithdrawalUser();
    $seller = sellerWithdrawalUser();

    $wallet = Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 100,
        'pending_balance' => 50,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $withdrawal = WithdrawalRequest::create([
        'seller_id' => $seller->id,
        'wallet_id' => $wallet->id,
        'amount' => 50,
        'status' => 'pending',
        'method' => 'PayPal',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.withdrawals.update', $withdrawal), [
            'status' => 'approved',
            'note' => 'Approved for payout queue.',
        ])
        ->assertRedirect();

    $withdrawal->refresh();

    expect($withdrawal->status)->toBe('approved');
    expect($withdrawal->reviewed_by)->toBe($admin->id);
});

test('super admin can reject withdrawal request and restore seller balance', function () {
    $admin = superAdminWithdrawalUser();
    $seller = sellerWithdrawalUser();

    $wallet = Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 100,
        'pending_balance' => 50,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $withdrawal = WithdrawalRequest::create([
        'seller_id' => $seller->id,
        'wallet_id' => $wallet->id,
        'amount' => 50,
        'status' => 'pending',
        'method' => 'Bank Transfer',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.withdrawals.update', $withdrawal), [
            'status' => 'rejected',
            'note' => 'Bank details missing.',
        ])
        ->assertRedirect();

    $wallet->refresh();
    $withdrawal->refresh();

    expect($withdrawal->status)->toBe('rejected');
    expect($wallet->available_balance)->toEqual('150.00');
    expect($wallet->pending_balance)->toEqual('0.00');
});

test('super admin can mark approved withdrawal as paid', function () {
    $admin = superAdminWithdrawalUser();
    $seller = sellerWithdrawalUser();

    $wallet = Wallet::create([
        'user_id' => $seller->id,
        'owner_type' => 'seller',
        'currency' => 'USD',
        'available_balance' => 100,
        'pending_balance' => 50,
        'escrow_balance' => 0,
        'status' => 'active',
    ]);

    $withdrawal = WithdrawalRequest::create([
        'seller_id' => $seller->id,
        'wallet_id' => $wallet->id,
        'amount' => 50,
        'status' => 'approved',
        'method' => 'PayPal',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.withdrawals.update', $withdrawal), [
            'status' => 'paid',
            'note' => 'Transferred successfully.',
        ])
        ->assertRedirect();

    $wallet->refresh();
    $withdrawal->refresh();

    expect($withdrawal->status)->toBe('paid');
    expect($wallet->pending_balance)->toEqual('0.00');
});
