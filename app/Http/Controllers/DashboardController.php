<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly WalletService $wallets)
    {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $roles = $user?->getRoleNames() ?? collect();
        $isSeller = $roles->contains('seller');
        $isBuyer = $roles->contains('buyer');

        $role = 'general';
        $stats = [];
        $walletSummary = null;
        $recentOrders = [];
        $recentTransactions = [];

        if ($isSeller) {
            $role = 'seller';
            $wallet = $this->wallets->getOrCreateSellerWallet($user);
            $sellerOrders = Order::query()->where('seller_id', $user->id);
            $activeOrdersCount = (clone $sellerOrders)->where('status', 'active')->count();
            $deliveredOrdersCount = (clone $sellerOrders)->where('status', 'delivered')->count();
            $completedSellerOrders = (clone $sellerOrders)->where('status', 'completed')->count();
            $releasableCount = (clone $sellerOrders)->where('fund_status', 'releasable')->count();

            $stats = [
                ['label' => 'Open Orders', 'value' => $activeOrdersCount + $deliveredOrdersCount],
                ['label' => 'Completed Orders', 'value' => $completedSellerOrders],
                ['label' => 'Wallet Balance', 'value' => sprintf('USD %s', number_format((float) $wallet->available_balance, 2, '.', ''))],
                ['label' => 'Pending Payouts', 'value' => sprintf('USD %s', number_format((float) $wallet->pending_balance, 2, '.', ''))],
            ];

            $walletSummary = [
                'currency' => $wallet->currency,
                'available_balance' => (string) $wallet->available_balance,
                'pending_balance' => (string) $wallet->pending_balance,
                'escrow_balance' => (string) $wallet->escrow_balance,
                'releasable_orders' => $releasableCount,
                'active_orders' => $activeOrdersCount,
                'delivered_orders' => $deliveredOrdersCount,
            ];

            $recentOrders = Order::query()
                ->with(['gig:id,title', 'buyer:id,name'])
                ->where('seller_id', $user->id)
                ->latest('updated_at')
                ->latest('id')
                ->take(6)
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'gig_title' => $order->gig?->title ?? sprintf('Order #%d', $order->id),
                    'counterparty_name' => $order->buyer?->name ?? 'Buyer',
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'fund_status' => $order->fund_status,
                    'total' => number_format((float) $order->price, 2, '.', ''),
                    'updated_at' => $order->updated_at?->toIso8601String(),
                ])
                ->values();

            $recentTransactions = WalletTransaction::query()
                ->whereBelongsTo($wallet)
                ->latest('created_at')
                ->latest('id')
                ->take(6)
                ->get()
                ->map(fn (WalletTransaction $transaction) => [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'direction' => $transaction->direction,
                    'balance_bucket' => $transaction->balance_bucket,
                    'amount' => (string) $transaction->amount,
                    'description' => $transaction->description,
                    'created_at' => $transaction->created_at?->toIso8601String(),
                ])
                ->values();
        } elseif ($isBuyer) {
            $role = 'buyer';
            $buyerOrders = Order::query()->where('buyer_id', $user->id);
            $pendingPaymentCount = (clone $buyerOrders)->where('payment_status', 'pending')->count();
            $activeBuyerOrdersCount = (clone $buyerOrders)->where('status', 'active')->count();
            $deliveredBuyerOrdersCount = (clone $buyerOrders)->where('status', 'delivered')->count();
            $completedBuyerOrders = (clone $buyerOrders)->where('status', 'completed')->count();
            $cancelledBuyerOrders = (clone $buyerOrders)->where('status', 'cancelled')->count();

            $stats = [
                ['label' => 'Pending Payment', 'value' => $pendingPaymentCount],
                ['label' => 'Active Orders', 'value' => $activeBuyerOrdersCount + $deliveredBuyerOrdersCount],
                ['label' => 'Completed Orders', 'value' => $completedBuyerOrders],
                ['label' => 'Cancelled Orders', 'value' => $cancelledBuyerOrders],
            ];

            $recentOrders = Order::query()
                ->with(['gig:id,title', 'seller:id,name'])
                ->where('buyer_id', $user->id)
                ->latest('updated_at')
                ->latest('id')
                ->take(6)
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'gig_title' => $order->gig?->title ?? sprintf('Order #%d', $order->id),
                    'counterparty_name' => $order->seller?->name ?? 'Seller',
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'fund_status' => $order->fund_status,
                    'total' => number_format((float) $order->price, 2, '.', ''),
                    'updated_at' => $order->updated_at?->toIso8601String(),
                ])
                ->values();
        } else {
            $stats = [
                ['label' => 'Open Orders', 'value' => 0],
                ['label' => 'Completed Orders', 'value' => 0],
                ['label' => 'Messages', 'value' => 0],
                ['label' => 'Available Balance', 'value' => 'USD 0.00'],
            ];
        }

        return Inertia::render('dashboard', [
            'role' => $role,
            'stats' => $stats,
            'walletSummary' => $walletSummary,
            'recentOrders' => $recentOrders,
            'recentTransactions' => $recentTransactions,
        ]);
    }
}
