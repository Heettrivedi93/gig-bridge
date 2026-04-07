<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPayment;
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
        $commissionRevenue = (float) $transactions
            ->where('type', 'platform_fee')
            ->where('direction', 'credit')
            ->sum('amount');
        $sellerCredits = (float) $transactions
            ->where('type', 'seller_credit')
            ->where('direction', 'credit')
            ->sum('amount');
        $paidPlanRevenue = (float) SubscriptionPayment::query()
            ->where('status', 'completed')
            ->sum('amount');

        return Inertia::render('admin/ledger/index', [
            'stats' => [
                [
                    'label' => 'Ledger Entries',
                    'value' => $transactions->count(),
                    'detail' => sprintf('%d order-linked', $transactions->whereNotNull('order_id')->count()),
                ],
                [
                    'label' => 'Escrow Held',
                    'value' => number_format((float) ($systemWallet?->escrow_balance ?? 0), 2, '.', ''),
                    'detail' => 'Buyer funds still being held before seller release or refund',
                ],
                [
                    'label' => 'Seller Pending Payouts',
                    'value' => number_format((float) Wallet::query()->sum('pending_balance'), 2, '.', ''),
                    'detail' => 'Seller funds reserved in withdrawal review or payout processing',
                ],
                [
                    'label' => 'Seller Released Funds',
                    'value' => number_format((float) (clone $sellerWallets)->sum('available_balance'), 2, '.', ''),
                    'detail' => 'Released seller earnings currently sitting in seller wallets',
                ],
            ],
            'revenueSummary' => [
                [
                    'label' => 'Paid Plan Revenue',
                    'value' => number_format($paidPlanRevenue, 2, '.', ''),
                    'detail' => 'Completed seller subscription purchases',
                ],
                [
                    'label' => 'Commission Revenue',
                    'value' => number_format($commissionRevenue, 2, '.', ''),
                    'detail' => 'Commission earned from sellers completing paid orders',
                ],
                [
                    'label' => 'Seller Earnings Credited',
                    'value' => number_format($sellerCredits, 2, '.', ''),
                    'detail' => 'Net order earnings released into seller wallets',
                ],
                [
                    'label' => 'Total Platform Revenue',
                    'value' => number_format($paidPlanRevenue + $commissionRevenue, 2, '.', ''),
                    'detail' => 'Paid plan revenue plus service commissions',
                ],
            ],
            'walletSummary' => [
                [
                    'label' => 'Seller Available',
                    'value' => number_format((float) (clone $sellerWallets)->sum('available_balance'), 2, '.', ''),
                    'detail' => sprintf('%d seller wallets currently holding released earnings', (clone $sellerWallets)->where('available_balance', '>', 0)->count()),
                ],
                [
                    'label' => 'Seller Payout Queue',
                    'value' => number_format((float) (clone $sellerWallets)->sum('pending_balance'), 2, '.', ''),
                    'detail' => 'Awaiting admin review, approval, or transfer',
                ],
                [
                    'label' => 'Seller Reserved Funds',
                    'value' => number_format((float) (clone $sellerWallets)->sum('escrow_balance'), 2, '.', ''),
                    'detail' => 'Reserved for future seller-side operational states',
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
