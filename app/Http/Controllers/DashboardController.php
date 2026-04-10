<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Review;
use App\Models\WalletTransaction;
use App\Models\WithdrawalRequest;
use App\Services\WalletService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly WalletService $wallets) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $roles = $user?->getRoleNames() ?? collect();
        $isSeller = $roles->contains('seller');
        $isBuyer = $roles->contains('buyer');

        $role = 'general';
        $stats = [];
        $walletSummary = null;
        $revenueSummary = null;
        $recentOrders = [];
        $recentTransactions = [];
        $filters = null;
        $sellerAnalytics = null;
        $buyerAnalytics = null;

        if ($isSeller) {
            [$range, $startDate, $previousStartDate, $previousEndDate, $bucketUnit, $bucketFormat] = $this->resolveRange(
                $request->string('range')->value()
            );
            [$selectedRevenueMonth, $revenueMonthOptions] = $this->resolveRevenueMonth(
                $request->string('month')->value()
            );

            $role = 'seller';
            $wallet = $this->wallets->getOrCreateSellerWallet($user);
            $sellerOrders = Order::query()
                ->where('seller_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded']);
            $activeOrdersCount = (clone $sellerOrders)->where('status', 'active')->count();
            $deliveredOrdersCount = (clone $sellerOrders)->where('status', 'delivered')->count();
            $completedSellerOrders = (clone $sellerOrders)->where('status', 'completed')->count();
            $releasableCount = (clone $sellerOrders)->where('fund_status', 'releasable')->count();
            $revenueOrders = Order::query()
                ->where('seller_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded']);
            $grossSales    = (float) (clone $revenueOrders)->sum('gross_amount');
            $totalRefunds  = (float) (clone $revenueOrders)->sum('refunded_amount');
            $netSales      = $grossSales - $totalRefunds;
            $platformFees  = (float) (clone $revenueOrders)->selectRaw('SUM((gross_amount - COALESCE(refunded_amount, 0)) * platform_fee_percentage / 100) as fees')->value('fees');
            $netRevenue    = (float) (clone $revenueOrders)->selectRaw('SUM((gross_amount - COALESCE(refunded_amount, 0)) * (1 - platform_fee_percentage / 100)) as net')->value('net');
            $pendingRelease = (float) (clone $revenueOrders)
                ->whereIn('fund_status', ['escrow', 'releasable'])
                ->sum('seller_net_amount');
            $withdrawnTotal = (float) WithdrawalRequest::query()
                ->where('seller_id', $user->id)
                ->whereIn('status', ['approved', 'paid'])
                ->sum('amount');

            $currentOrders = Order::query()
                ->where('seller_id', $user->id)
                ->where('created_at', '>=', $startDate);
            $previousOrders = Order::query()
                ->where('seller_id', $user->id)
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate]);
            $currentRevenueOrders = Order::query()
                ->where('seller_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->where('created_at', '>=', $startDate);
            $previousRevenueOrders = Order::query()
                ->where('seller_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate]);

            $currentNetRevenue  = (float) (clone $currentRevenueOrders)->selectRaw('SUM((gross_amount - COALESCE(refunded_amount, 0)) * (1 - platform_fee_percentage / 100)) as net')->value('net');
            $previousNetRevenue = (float) (clone $previousRevenueOrders)->selectRaw('SUM((gross_amount - COALESCE(refunded_amount, 0)) * (1 - platform_fee_percentage / 100)) as net')->value('net');
            $currentGrossSales  = (float) (clone $currentRevenueOrders)->sum('gross_amount');
            $previousGrossSales = (float) (clone $previousRevenueOrders)->sum('gross_amount');
            $currentOpenOrders = (clone $currentOrders)->whereIn('status', ['active', 'delivered'])->count();
            $previousOpenOrders = (clone $previousOrders)->whereIn('status', ['active', 'delivered'])->count();
            $currentCompletedOrders = (clone $currentOrders)->where('status', 'completed')->count();
            $previousCompletedOrders = (clone $previousOrders)->where('status', 'completed')->count();

            $stats = [
                [
                    'key' => 'net_revenue',
                    'label' => 'Net Revenue',
                    'value' => number_format($currentNetRevenue, 2, '.', ''),
                    'delta' => $this->formatDelta($currentNetRevenue, $previousNetRevenue, 'vs previous period'),
                    'meta' => sprintf('Gross sales USD %s in selected range', number_format($currentGrossSales, 2, '.', '')),
                ],
                [
                    'key' => 'gross_sales',
                    'label' => 'Gross Sales',
                    'value' => number_format($currentGrossSales, 2, '.', ''),
                    'delta' => $this->formatDelta($currentGrossSales, $previousGrossSales, 'vs previous period'),
                    'meta' => sprintf('%d paid orders in selected range', (clone $currentRevenueOrders)->count()),
                ],
                [
                    'key' => 'open_orders',
                    'label' => 'Open Orders',
                    'value' => $currentOpenOrders,
                    'delta' => $this->formatDelta($currentOpenOrders, $previousOpenOrders, 'vs previous period'),
                    'meta' => sprintf('%d orders awaiting buyer response', $deliveredOrdersCount),
                ],
                [
                    'key' => 'available_withdraw',
                    'label' => 'Available to Withdraw',
                    'value' => number_format((float) $wallet->available_balance, 2, '.', ''),
                    'delta' => $this->formatDelta($currentCompletedOrders, $previousCompletedOrders, 'completed orders trend'),
                    'meta' => sprintf('USD %s already withdrawn', number_format($withdrawnTotal, 2, '.', '')),
                ],
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

            $revenueSummary = [
                'currency'       => $wallet->currency,
                'gross_sales'    => number_format($grossSales, 2, '.', ''),
                'total_refunds'  => number_format($totalRefunds, 2, '.', ''),
                'net_sales'      => number_format($netSales, 2, '.', ''),
                'platform_fees'  => number_format($platformFees, 2, '.', ''),
                'net_revenue'    => number_format($netRevenue, 2, '.', ''),
                'pending_release' => number_format($pendingRelease, 2, '.', ''),
                'withdrawn_total' => number_format($withdrawnTotal, 2, '.', ''),
            ];

            $recentOrders = Order::query()
                ->with(['gig:id,title', 'buyer:id,name'])
                ->where('seller_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
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

            $trendStartDate = $selectedRevenueMonth
                ? Carbon::createFromFormat('Y-m', $selectedRevenueMonth)->startOfMonth()
                : $startDate->copy();
            $trendEndDate = $selectedRevenueMonth
                ? Carbon::createFromFormat('Y-m', $selectedRevenueMonth)->endOfMonth()
                : now();
            $trendBucketUnit = $selectedRevenueMonth ? 'day' : $bucketUnit;
            $trendBucketFormat = $selectedRevenueMonth ? 'Y-m-d' : $bucketFormat;
            $trendRevenueOrders = Order::query()
                ->where('seller_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->whereBetween('created_at', [$trendStartDate, $trendEndDate]);
            $trendOrderRows = (clone $trendRevenueOrders)
                ->get(['created_at', 'gross_amount', 'refunded_amount', 'seller_net_amount', 'platform_fee_amount', 'platform_fee_percentage']);
            $trendGroups = $trendOrderRows->groupBy(fn (Order $order) => $order->created_at?->format($trendBucketFormat) ?? '');
            $revenueTrend = collect($this->buildTrendPeriod($trendStartDate, $trendEndDate, $trendBucketUnit))
                ->map(function (CarbonInterface $date) use ($trendBucketFormat, $trendBucketUnit, $trendGroups) {
                    $bucket = $date->format($trendBucketFormat);
                    $orders = $trendGroups->get($bucket, collect());

                    return [
                        'label'         => $trendBucketUnit === 'month' ? $date->format('M Y') : $date->format('M d'),
                        'gross_sales'   => round((float) $orders->sum('gross_amount'), 2),
                        'total_refunds' => round((float) $orders->sum('refunded_amount'), 2),
                        'net_revenue'   => round($orders->reduce(function (float $carry, Order $o) {
                            $netGross = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
                            return $carry + round($netGross * (1 - (float) $o->platform_fee_percentage / 100), 2);
                        }, 0.0), 2),
                        'platform_fees' => round($orders->reduce(function (float $carry, Order $o) {
                            $netGross = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
                            return $carry + round($netGross * ((float) $o->platform_fee_percentage / 100), 2);
                        }, 0.0), 2),
                    ];
                })
                ->values();

            $rangeOrders = Order::query()
                ->where('seller_id', $user->id)
                ->where('created_at', '>=', $startDate);
            $rangeOrdersCount = (clone $rangeOrders)->count();
            $orderBreakdown = collect([
                'active' => 'Active',
                'delivered' => 'Delivered',
                'completed' => 'Completed',
                'cancelled' => 'Cancelled',
            ])->map(function (string $label, string $status) use ($rangeOrders, $rangeOrdersCount) {
                $count = (clone $rangeOrders)->where('status', $status)->count();

                return [
                    'key' => $status,
                    'label' => $label,
                    'count' => $count,
                    'share' => $rangeOrdersCount > 0 ? round(($count / $rangeOrdersCount) * 100, 1) : 0,
                ];
            })->values();

            $walletBreakdown = [
                [
                    'label' => 'Available Balance',
                    'value' => (float) $wallet->available_balance,
                    'detail' => 'Ready for withdrawal requests',
                    'kind' => 'currency',
                ],
                [
                    'label' => 'Pending Withdrawals',
                    'value' => (float) $wallet->pending_balance,
                    'detail' => 'Being reviewed or processed by admin',
                    'kind' => 'currency',
                ],
                [
                    'label' => 'Pending Release',
                    'value' => $pendingRelease,
                    'detail' => 'Paid orders still waiting to move into wallet',
                    'kind' => 'currency',
                ],
                [
                    'label' => 'Withdrawn Total',
                    'value' => $withdrawnTotal,
                    'detail' => 'Approved or paid withdrawal requests',
                    'kind' => 'currency',
                ],
            ];

            $topGigs = Order::query()
                ->join('gigs', 'orders.gig_id', '=', 'gigs.id')
                ->selectRaw('gigs.title as gig_title, COUNT(orders.id) as orders_count, SUM(orders.gross_amount) as gross_sales, SUM(COALESCE(orders.refunded_amount,0)) as total_refunds, SUM(orders.seller_net_amount) as net_revenue')
                ->where('orders.seller_id', $user->id)
                ->whereIn('orders.payment_status', ['paid', 'released', 'refunded'])
                ->where('orders.created_at', '>=', $startDate)
                ->groupBy('gigs.title')
                ->orderByDesc('gross_sales')
                ->take(5)
                ->get()
                ->map(fn ($row) => [
                    'title'         => $row->gig_title ?: 'Untitled gig',
                    'orders_count'  => (int) $row->orders_count,
                    'gross_sales'   => round((float) $row->gross_sales, 2),
                    'total_refunds' => round((float) $row->total_refunds, 2),
                    'net_sales'     => round((float) $row->gross_sales - (float) $row->total_refunds, 2),
                    'net_revenue'   => round((float) $row->net_revenue, 2),
                ])
                ->values();

            $averageRating = (float) Review::query()
                ->where('seller_id', $user->id)
                ->avg('rating');
            $cancelledCount = (clone $rangeOrders)->where('status', 'cancelled')->count();
            $averageOrderValue = (float) (clone $currentRevenueOrders)->avg('gross_amount');
            $completionRate = $rangeOrdersCount > 0
                ? ($currentCompletedOrders / max($rangeOrdersCount, 1)) * 100
                : 0;

            $sellerHealth = [
                [
                    'label' => 'Completion Rate',
                    'value' => $this->formatPercentage($completionRate),
                    'detail' => sprintf('%d completed orders in the selected range', $currentCompletedOrders),
                    'tone' => $completionRate >= 50 ? 'positive' : 'neutral',
                ],
                [
                    'label' => 'Cancellation Rate',
                    'value' => $this->formatPercentage($rangeOrdersCount > 0 ? ($cancelledCount / $rangeOrdersCount) * 100 : 0),
                    'detail' => sprintf('%d cancellations in the selected range', $cancelledCount),
                    'tone' => $cancelledCount > 0 ? 'warning' : 'positive',
                ],
                [
                    'label' => 'Average Order Value',
                    'value' => sprintf('USD %s', number_format($averageOrderValue, 2, '.', '')),
                    'detail' => 'Average paid order value before payout',
                    'tone' => 'neutral',
                ],
                [
                    'label' => 'Average Rating',
                    'value' => number_format($averageRating, 1, '.', ''),
                    'detail' => 'Across completed buyer reviews',
                    'tone' => $averageRating >= 4 ? 'positive' : 'neutral',
                ],
            ];

            $sellerInsights = array_values(array_filter([
                $revenueTrend->sum('net_revenue') > 0
                    ? sprintf(
                        '%s was your strongest revenue day in this view.',
                        $revenueTrend->sortByDesc('net_revenue')->first()['label'] ?? 'This period'
                    )
                    : null,
                $topGigs->isNotEmpty()
                    ? sprintf(
                        '%s is your best-performing gig with USD %s in gross sales.',
                        $topGigs->first()['title'],
                        number_format($topGigs->first()['gross_sales'], 2, '.', '')
                    )
                    : null,
                $deliveredOrdersCount > 0
                    ? sprintf('%d delivered orders are still waiting for buyer action.', $deliveredOrdersCount)
                    : 'No delivered orders are currently waiting on buyers.',
                (float) $wallet->available_balance > 0
                    ? sprintf('USD %s is ready for withdrawal right now.', number_format((float) $wallet->available_balance, 2, '.', ''))
                    : 'No released funds are available for withdrawal yet.',
            ]));

            $filters = [
                'range' => $range,
                'options' => [
                    ['value' => '7d', 'label' => '7D'],
                    ['value' => '30d', 'label' => '30D'],
                    ['value' => '90d', 'label' => '90D'],
                    ['value' => '12m', 'label' => '12M'],
                ],
                'revenue_month' => [
                    'value' => $selectedRevenueMonth ?? 'all',
                    'options' => $revenueMonthOptions,
                ],
            ];

            $sellerAnalytics = [
                'stats' => $stats,
                'revenueTrend' => $revenueTrend,
                'orderBreakdown' => $orderBreakdown,
                'walletBreakdown' => $walletBreakdown,
                'topGigs' => $topGigs,
                'sellerHealth' => $sellerHealth,
                'insights' => $sellerInsights,
            ];
        } elseif ($isBuyer) {
            [$range, $startDate, $previousStartDate, $previousEndDate, $bucketUnit, $bucketFormat] = $this->resolveRange(
                $request->string('range')->value()
            );
            [$selectedRevenueMonth, $revenueMonthOptions] = $this->resolveRevenueMonth(
                $request->string('month')->value()
            );

            $role = 'buyer';
            $buyerOrders = Order::query()->where('buyer_id', $user->id);
            $pendingPaymentCount = (clone $buyerOrders)->where('payment_status', 'pending')->count();
            $activeBuyerOrdersCount = (clone $buyerOrders)->where('status', 'active')->count();
            $deliveredBuyerOrdersCount = (clone $buyerOrders)->where('status', 'delivered')->count();
            $completedBuyerOrders = (clone $buyerOrders)->where('status', 'completed')->count();
            $cancelledBuyerOrders = (clone $buyerOrders)->where('status', 'cancelled')->count();

            $currentOrders = Order::query()
                ->where('buyer_id', $user->id)
                ->where('created_at', '>=', $startDate);
            $previousOrders = Order::query()
                ->where('buyer_id', $user->id)
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate]);
            $currentPaidOrders = Order::query()
                ->where('buyer_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->where('created_at', '>=', $startDate);
            $previousPaidOrders = Order::query()
                ->where('buyer_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate]);

            $currentSpend = (float) (clone $currentPaidOrders)->selectRaw('SUM(gross_amount - COALESCE(refunded_amount, 0)) as net_spend')->value('net_spend');
            $previousSpend = (float) (clone $previousPaidOrders)->selectRaw('SUM(gross_amount - COALESCE(refunded_amount, 0)) as net_spend')->value('net_spend');
            $currentCompleted = (clone $currentOrders)->where('status', 'completed')->count();
            $previousCompleted = (clone $previousOrders)->where('status', 'completed')->count();
            $currentPendingActions = (clone $currentOrders)
                ->where(function ($query) {
                    $query->where('payment_status', 'pending')
                        ->orWhere('status', 'delivered');
                })
                ->count();
            $previousPendingActions = (clone $previousOrders)
                ->where(function ($query) {
                    $query->where('payment_status', 'pending')
                        ->orWhere('status', 'delivered');
                })
                ->count();

            $stats = [
                [
                    'key' => 'total_spend',
                    'label' => 'Total Spend',
                    'value' => number_format($currentSpend, 2, '.', ''),
                    'delta' => $this->formatDelta($currentSpend, $previousSpend, 'vs previous period'),
                    'meta' => sprintf('%d paid purchases in selected range', (clone $currentPaidOrders)->count()),
                ],
                [
                    'key' => 'pending_actions',
                    'label' => 'Pending Actions',
                    'value' => $currentPendingActions,
                    'delta' => $this->formatDelta($currentPendingActions, $previousPendingActions, 'vs previous period'),
                    'meta' => sprintf('%d deliveries still waiting on you', $deliveredBuyerOrdersCount),
                ],
                [
                    'key' => 'completed_orders',
                    'label' => 'Completed Orders',
                    'value' => $currentCompleted,
                    'delta' => $this->formatDelta($currentCompleted, $previousCompleted, 'vs previous period'),
                    'meta' => sprintf('%d cancelled orders in selected range', $cancelledBuyerOrders),
                ],
                [
                    'key' => 'active_orders',
                    'label' => 'Active Orders',
                    'value' => $activeBuyerOrdersCount + $deliveredBuyerOrdersCount,
                    'delta' => $this->formatDelta(
                        $activeBuyerOrdersCount + $deliveredBuyerOrdersCount,
                        (clone $previousOrders)->whereIn('status', ['active', 'delivered'])->count(),
                        'vs previous period'
                    ),
                    'meta' => sprintf('%d unpaid orders still need checkout', $pendingPaymentCount),
                ],
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

            $trendStartDate = $selectedRevenueMonth
                ? Carbon::createFromFormat('Y-m', $selectedRevenueMonth)->startOfMonth()
                : $startDate->copy();
            $trendEndDate = $selectedRevenueMonth
                ? Carbon::createFromFormat('Y-m', $selectedRevenueMonth)->endOfMonth()
                : now();
            $trendBucketUnit = $selectedRevenueMonth ? 'day' : $bucketUnit;
            $trendBucketFormat = $selectedRevenueMonth ? 'Y-m-d' : $bucketFormat;
            $trendPaidOrders = Order::query()
                ->where('buyer_id', $user->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->whereBetween('created_at', [$trendStartDate, $trendEndDate]);
            $trendRows = (clone $trendPaidOrders)
                ->get(['created_at', 'gross_amount', 'refunded_amount', 'discount_amount']);
            $trendGroups = $trendRows->groupBy(fn (Order $order) => $order->created_at?->format($trendBucketFormat) ?? '');
            $spendTrend = collect($this->buildTrendPeriod($trendStartDate, $trendEndDate, $trendBucketUnit))
                ->map(function (CarbonInterface $date) use ($trendBucketFormat, $trendBucketUnit, $trendGroups) {
                    $bucket = $date->format($trendBucketFormat);
                    $orders = $trendGroups->get($bucket, collect());

                    return [
                        'label'     => $trendBucketUnit === 'month' ? $date->format('M Y') : $date->format('M d'),
                        'spend'     => round((float) $orders->sum(fn (Order $o) => max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0))), 2),
                        'gross'     => round((float) $orders->sum('gross_amount'), 2),
                        'refunds'   => round((float) $orders->sum('refunded_amount'), 2),
                        'discounts' => round((float) $orders->sum('discount_amount'), 2),
                        'orders'    => (int) $orders->count(),
                    ];
                })
                ->values();

            $rangeOrdersCount = (clone $currentOrders)->count();
            $orderBreakdown = collect([
                'pending' => 'Pending payment',
                'active' => 'Active',
                'delivered' => 'Delivered',
                'completed' => 'Completed',
                'cancelled' => 'Cancelled',
            ])->map(function (string $label, string $status) use ($currentOrders, $rangeOrdersCount) {
                $count = (clone $currentOrders)
                    ->where($status === 'pending' ? 'payment_status' : 'status', $status)
                    ->count();

                return [
                    'key' => $status,
                    'label' => $label,
                    'count' => $count,
                    'share' => $rangeOrdersCount > 0 ? round(($count / $rangeOrdersCount) * 100, 1) : 0,
                ];
            })->values();

            $favoriteSellers = Order::query()
                ->join('users', 'orders.seller_id', '=', 'users.id')
                ->selectRaw('users.name as seller_name, COUNT(orders.id) as orders_count, SUM(orders.gross_amount - COALESCE(orders.refunded_amount, 0)) as spend')
                ->where('orders.buyer_id', $user->id)
                ->whereIn('orders.payment_status', ['paid', 'released', 'refunded'])
                ->where('orders.created_at', '>=', $startDate)
                ->groupBy('users.name')
                ->orderByDesc('spend')
                ->take(5)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->seller_name ?: 'Seller',
                    'orders_count' => (int) $row->orders_count,
                    'spend' => round((float) $row->spend, 2),
                ])
                ->values();

            $topCategories = Order::query()
                ->join('gigs', 'orders.gig_id', '=', 'gigs.id')
                ->leftJoin('categories', 'gigs.category_id', '=', 'categories.id')
                ->selectRaw('categories.name as category_name, COUNT(orders.id) as orders_count, SUM(orders.gross_amount - COALESCE(orders.refunded_amount, 0)) as spend')
                ->where('orders.buyer_id', $user->id)
                ->whereIn('orders.payment_status', ['paid', 'released', 'refunded'])
                ->where('orders.created_at', '>=', $startDate)
                ->groupBy('categories.name')
                ->orderByDesc('spend')
                ->take(5)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->category_name ?: 'Uncategorized',
                    'orders_count' => (int) $row->orders_count,
                    'spend' => round((float) $row->spend, 2),
                ])
                ->values();

            $reviewStats = Review::query()
                ->where('buyer_id', $user->id);
            $averageRatingGiven = (float) (clone $reviewStats)->avg('rating');
            $reviewsGiven = (clone $reviewStats)->count();
            $discountTotal = (float) Order::query()
                ->where('buyer_id', $user->id)
                ->where('created_at', '>=', $startDate)
                ->sum('discount_amount');
            $buyerHealth = [
                [
                    'label' => 'Average Rating Given',
                    'value' => number_format($averageRatingGiven, 1, '.', ''),
                    'detail' => sprintf('%d reviews submitted so far', $reviewsGiven),
                    'tone' => $averageRatingGiven >= 4 ? 'positive' : 'neutral',
                ],
                [
                    'label' => 'Discounts Used',
                    'value' => sprintf('USD %s', number_format($discountTotal, 2, '.', '')),
                    'detail' => 'Savings applied across selected orders',
                    'tone' => 'positive',
                ],
                [
                    'label' => 'Delivered Awaiting Review',
                    'value' => (string) $deliveredBuyerOrdersCount,
                    'detail' => 'Orders you can complete or request revision on',
                    'tone' => $deliveredBuyerOrdersCount > 0 ? 'warning' : 'positive',
                ],
                [
                    'label' => 'Pending Payment',
                    'value' => (string) $pendingPaymentCount,
                    'detail' => 'Orders still waiting for checkout',
                    'tone' => $pendingPaymentCount > 0 ? 'warning' : 'neutral',
                ],
            ];

            $buyerInsights = array_values(array_filter([
                $spendTrend->sum('spend') > 0
                    ? sprintf(
                        '%s was your heaviest spending period in this view.',
                        $spendTrend->sortByDesc('spend')->first()['label'] ?? 'This period'
                    )
                    : null,
                $favoriteSellers->isNotEmpty()
                    ? sprintf(
                        '%s is your most-purchased seller with USD %s spent.',
                        $favoriteSellers->first()['name'],
                        number_format($favoriteSellers->first()['spend'], 2, '.', '')
                    )
                    : null,
                $topCategories->isNotEmpty()
                    ? sprintf(
                        '%s is your top buying category with %d paid orders.',
                        $topCategories->first()['name'],
                        $topCategories->first()['orders_count']
                    )
                    : null,
                $deliveredBuyerOrdersCount > 0
                    ? sprintf('%d delivered orders are waiting for your review or completion.', $deliveredBuyerOrdersCount)
                    : 'No delivered orders are currently waiting on you.',
            ]));

            $filters = [
                'range' => $range,
                'options' => [
                    ['value' => '7d', 'label' => '7D'],
                    ['value' => '30d', 'label' => '30D'],
                    ['value' => '90d', 'label' => '90D'],
                    ['value' => '12m', 'label' => '12M'],
                ],
                'revenue_month' => [
                    'value' => $selectedRevenueMonth ?? 'all',
                    'options' => $revenueMonthOptions,
                ],
            ];

            $buyerAnalytics = [
                'stats' => $stats,
                'spendTrend' => $spendTrend,
                'orderBreakdown' => $orderBreakdown,
                'favoriteSellers' => $favoriteSellers,
                'topCategories' => $topCategories,
                'buyerHealth' => $buyerHealth,
                'insights' => $buyerInsights,
            ];
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
            'filters' => $filters,
            'sellerAnalytics' => $sellerAnalytics,
            'buyerAnalytics' => $buyerAnalytics,
            'walletSummary' => $walletSummary,
            'revenueSummary' => $revenueSummary,
            'recentOrders' => $recentOrders,
            'recentTransactions' => $recentTransactions,
        ]);
    }

    private function resolveRange(?string $requestedRange): array
    {
        $range = in_array($requestedRange, ['7d', '30d', '90d', '12m'], true)
            ? $requestedRange
            : '7d';

        $now = now();

        return match ($range) {
            '30d' => [
                $range,
                $now->copy()->subDays(29)->startOfDay(),
                $now->copy()->subDays(59)->startOfDay(),
                $now->copy()->subDays(30)->endOfDay(),
                'day',
                'Y-m-d',
            ],
            '90d' => [
                $range,
                $now->copy()->subDays(89)->startOfDay(),
                $now->copy()->subDays(179)->startOfDay(),
                $now->copy()->subDays(90)->endOfDay(),
                'day',
                'Y-m-d',
            ],
            '12m' => [
                $range,
                $now->copy()->subMonths(11)->startOfMonth(),
                $now->copy()->subMonths(23)->startOfMonth(),
                $now->copy()->subMonths(12)->endOfMonth(),
                'month',
                'Y-m',
            ],
            default => [
                $range,
                $now->copy()->subDays(6)->startOfDay(),
                $now->copy()->subDays(13)->startOfDay(),
                $now->copy()->subDays(7)->endOfDay(),
                'day',
                'Y-m-d',
            ],
        };
    }

    private function buildTrendPeriod(CarbonInterface $startDate, CarbonInterface $endDate, string $bucketUnit): array
    {
        $interval = $bucketUnit === 'month' ? '1 month' : '1 day';

        return iterator_to_array(CarbonPeriod::create($startDate, $interval, $endDate));
    }

    private function resolveRevenueMonth(?string $requestedMonth): array
    {
        $options = collect(range(0, 11))
            ->map(fn (int $offset) => now()->copy()->startOfMonth()->subMonths($offset))
            ->map(fn (CarbonInterface $month) => [
                'value' => $month->format('Y-m'),
                'label' => $month->format('F Y'),
            ])
            ->values();

        $selectedMonth = $options->contains(fn (array $option) => $option['value'] === $requestedMonth)
            ? $requestedMonth
            : null;

        return [
            $selectedMonth,
            $options->prepend([
                'value' => 'all',
                'label' => 'All months',
            ])->values()->all(),
        ];
    }

    private function formatDelta(float|int $current, float|int $previous, string $suffix): string
    {
        if ((float) $previous === 0.0) {
            if ((float) $current === 0.0) {
                return sprintf('0.0%% %s', $suffix);
            }

            return sprintf('+100.0%% %s', $suffix);
        }

        $change = (($current - $previous) / $previous) * 100;
        $prefix = $change > 0 ? '+' : '';

        return sprintf('%s%s%% %s', $prefix, number_format($change, 1, '.', ''), $suffix);
    }

    private function formatPercentage(float $value): string
    {
        return sprintf('%s%%', number_format($value, 1, '.', ''));
    }
}
