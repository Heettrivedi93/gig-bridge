<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Inertia\Inertia;
use Inertia\Response;

class AdminWalletLedgerController extends Controller
{
    public function index(): Response
    {
        $systemWallet = Wallet::query()->where('owner_type', 'system')->first();
        $sellerWallets = Wallet::query()->where('owner_type', 'seller');
        $transactions = WalletTransaction::query()
            ->with(['wallet.user:id,name,email', 'order:id'])
            ->latest('created_at')
            ->latest('id')
            ->get();

        return Inertia::render('admin/ledger/index', [
            'stats' => [
                [
                    'label' => 'Ledger Entries',
                    'value' => $transactions->count(),
                    'detail' => sprintf('%d order-linked', $transactions->whereNotNull('order_id')->count()),
                ],
                [
                    'label' => 'System Available',
                    'value' => number_format((float) ($systemWallet?->available_balance ?? 0), 2, '.', ''),
                    'detail' => 'Platform retained earnings',
                ],
                [
                    'label' => 'System Escrow',
                    'value' => number_format((float) ($systemWallet?->escrow_balance ?? 0), 2, '.', ''),
                    'detail' => 'Funds still held by the platform',
                ],
                [
                    'label' => 'Pending Wallet Funds',
                    'value' => number_format((float) Wallet::query()->sum('pending_balance'), 2, '.', ''),
                    'detail' => 'Reserved across seller wallets',
                ],
            ],
            'walletSummary' => [
                [
                    'label' => 'Seller Available',
                    'value' => number_format((float) (clone $sellerWallets)->sum('available_balance'), 2, '.', ''),
                    'detail' => sprintf('%d seller wallets with released funds', (clone $sellerWallets)->where('available_balance', '>', 0)->count()),
                ],
                [
                    'label' => 'Seller Pending',
                    'value' => number_format((float) (clone $sellerWallets)->sum('pending_balance'), 2, '.', ''),
                    'detail' => 'Awaiting payout review or transfer',
                ],
                [
                    'label' => 'Seller Escrow Buckets',
                    'value' => number_format((float) (clone $sellerWallets)->sum('escrow_balance'), 2, '.', ''),
                    'detail' => 'Reserved for future seller-side states',
                ],
            ],
            'transactions' => $transactions->map(fn (WalletTransaction $transaction) => [
                'id' => $transaction->id,
                'wallet' => [
                    'owner_type' => $transaction->wallet?->owner_type,
                    'user_name' => $transaction->wallet?->user?->name,
                    'user_email' => $transaction->wallet?->user?->email,
                ],
                'order_id' => $transaction->order_id,
                'type' => $transaction->type,
                'direction' => $transaction->direction,
                'balance_bucket' => $transaction->balance_bucket,
                'amount' => (string) $transaction->amount,
                'balance_before' => (string) $transaction->balance_before,
                'balance_after' => (string) $transaction->balance_after,
                'description' => $transaction->description,
                'created_at' => $transaction->created_at?->toIso8601String(),
            ])->values(),
        ]);
    }
}
