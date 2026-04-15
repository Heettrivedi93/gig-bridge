<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Review;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index(Request $request)
    {
        [$range, $startDate, $previousStartDate, $previousEndDate, $bucketUnit, $bucketFormat] = $this->resolveRange(
            $request->string('range')->value()
        );
        [$selectedRevenueMonth, $revenueMonthOptions] = $this->resolveRevenueMonth(
            $request->string('month')->value()
        );

        $paidStatuses = ['paid', 'released', 'refunded'];
        $paidOrders = Order::query()->whereIn('payment_status', $paidStatuses);
        $paidPlanPayments = SubscriptionPayment::query()->where('status', 'completed');

        $currentPaidOrders = (clone $paidOrders)->where('created_at', '>=', $startDate);
        $previousPaidOrders = (clone $paidOrders)
            ->whereBetween('created_at', [$previousStartDate, $previousEndDate]);
        $currentPlanPayments = (clone $paidPlanPayments)->where('created_at', '>=', $startDate);
        $previousPlanPayments = (clone $paidPlanPayments)
            ->whereBetween('created_at', [$previousStartDate, $previousEndDate]);

        $currentOrderRows = (clone $currentPaidOrders)->get(['gross_amount', 'refunded_amount', 'platform_fee_percentage']);
        $previousOrderRows = (clone $previousPaidOrders)->get(['gross_amount', 'refunded_amount', 'platform_fee_percentage']);

        $grossSales        = $currentOrderRows->sum(fn (Order $o) => (float) $o->gross_amount);
        $totalRefunds      = $currentOrderRows->sum(fn (Order $o) => (float) ($o->refunded_amount ?? 0));
        $netSales          = $grossSales - $totalRefunds;
        $commissionRevenue = $currentOrderRows->reduce(function (float $c, Order $o) {
            $net = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
            return $c + round($net * ((float) $o->platform_fee_percentage / 100), 2);
        }, 0.0);

        $previousGrossSales        = $previousOrderRows->sum(fn (Order $o) => (float) $o->gross_amount);
        $previousTotalRefunds      = $previousOrderRows->sum(fn (Order $o) => (float) ($o->refunded_amount ?? 0));
        $previousNetSales          = $previousGrossSales - $previousTotalRefunds;
        $previousCommissionRevenue = $previousOrderRows->reduce(function (float $c, Order $o) {
            $net = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
            return $c + round($net * ((float) $o->platform_fee_percentage / 100), 2);
        }, 0.0);

        $paidPlanRevenue = (float) (clone $currentPlanPayments)->sum('amount');
        $previousPaidPlanRevenue = (float) (clone $previousPlanPayments)->sum('amount');
        $totalPlatformRevenue = $commissionRevenue + $paidPlanRevenue;
        $newUsers = User::whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))->where('created_at', '>=', $startDate)->count();
        $completedOrders = Order::query()
            ->where('created_at', '>=', $startDate)
            ->where('status', 'completed')
            ->count();
        $previousNewUsers = User::whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))
            ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
            ->count();
        $previousCompletedOrders = Order::query()
            ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
            ->where('status', 'completed')
            ->count();

        $stats = [
            [
                'label' => 'Platform Revenue',
                'value' => number_format($totalPlatformRevenue, 2, '.', ''),
                'delta' => $this->formatDelta(
                    $totalPlatformRevenue,
                    $previousCommissionRevenue + $previousPaidPlanRevenue,
                    'vs previous period'
                ),
                'meta' => sprintf(
                    'Commission USD %s + plan revenue USD %s',
                    number_format($commissionRevenue, 2, '.', ''),
                    number_format($paidPlanRevenue, 2, '.', '')
                ),
                'key' => 'platform_revenue',
            ],
            [
                'label' => 'Gross Marketplace Sales',
                'value' => number_format($grossSales, 2, '.', ''),
                'delta' => $this->formatDelta($grossSales, $previousGrossSales, 'vs previous period'),
                'meta' => sprintf('Refunds USD %s · Net sales USD %s', number_format($totalRefunds, 2, '.', ''), number_format($netSales, 2, '.', '')),
                'key' => 'gross_sales',
            ],
            [
                'label' => 'New Users',
                'value' => (string) $newUsers,
                'delta' => $this->formatDelta($newUsers, $previousNewUsers, 'vs previous period'),
                'meta' => sprintf(
                    '%d sellers and %d buyers joined',
                    User::role('seller')->where('created_at', '>=', $startDate)->count(),
                    User::role('buyer')->where('created_at', '>=', $startDate)->count()
                ),
                'key' => 'new_users',
            ],
            [
                'label' => 'Completed Orders',
                'value' => (string) $completedOrders,
                'delta' => $this->formatDelta($completedOrders, $previousCompletedOrders, 'vs previous period'),
                'meta' => sprintf(
                    '%s completion rate',
                    $this->formatPercentage(
                        Order::query()->where('created_at', '>=', $startDate)->count() > 0
                            ? ($completedOrders / max(Order::query()->where('created_at', '>=', $startDate)->count(), 1)) * 100
                            : 0
                    )
                ),
                'key' => 'completed_orders',
            ],
        ];

        $trendStartDate = $selectedRevenueMonth
            ? Carbon::createFromFormat('Y-m', $selectedRevenueMonth)->startOfMonth()
            : $startDate->copy();
        $trendEndDate = $selectedRevenueMonth
            ? Carbon::createFromFormat('Y-m', $selectedRevenueMonth)->endOfMonth()
            : now();
        $trendBucketUnit = $selectedRevenueMonth ? 'day' : $bucketUnit;
        $trendBucketFormat = $selectedRevenueMonth ? 'Y-m-d' : $bucketFormat;
        $trendPaidOrders = Order::query()
            ->whereIn('payment_status', $paidStatuses)
            ->whereBetween('created_at', [$trendStartDate, $trendEndDate]);
        $trendPlanPayments = SubscriptionPayment::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$trendStartDate, $trendEndDate]);

        $trendRows = (clone $trendPaidOrders)
            ->get(['created_at', 'gross_amount', 'refunded_amount', 'platform_fee_percentage']);
        $planTrendRows = (clone $trendPlanPayments)
            ->get(['created_at', 'amount']);

        $orderTrends = $trendRows->groupBy(fn (Order $order) => $order->created_at?->format($trendBucketFormat) ?? '');
        $planTrends = $planTrendRows->groupBy(fn (SubscriptionPayment $payment) => $payment->created_at?->format($trendBucketFormat) ?? '');

        $revenueTrend = collect($this->buildTrendPeriod($trendStartDate, $trendEndDate, $trendBucketUnit))->map(function (Carbon $date) use (
            $trendBucketFormat,
            $trendBucketUnit,
            $orderTrends,
            $planTrends
        ) {
            $bucket = $date->format($trendBucketFormat);
            $orderItems = $orderTrends->get($bucket, collect());
            $planItems = $planTrends->get($bucket, collect());
            $gross      = $orderItems->sum(fn (Order $o) => (float) $o->gross_amount);
            $refunds    = $orderItems->sum(fn (Order $o) => (float) ($o->refunded_amount ?? 0));
            $commission = $orderItems->reduce(function (float $c, Order $o) {
                $net = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
                return $c + round($net * ((float) $o->platform_fee_percentage / 100), 2);
            }, 0.0);
            $plans = (float) $planItems->sum('amount');

            return [
                'label'              => $trendBucketUnit === 'month' ? $date->format('M Y') : $date->format('M d'),
                'gross_sales'        => round($gross, 2),
                'total_refunds'      => round($refunds, 2),
                'net_sales'          => round($gross - $refunds, 2),
                'commission_revenue' => round($commission, 2),
                'plan_revenue'       => round($plans, 2),
                'platform_revenue'   => round($commission + $plans, 2),
            ];
        })->values();

        $ordersInRange = Order::query()->where('created_at', '>=', $startDate);
        $ordersCountInRange = (clone $ordersInRange)->count();
        $statusOrder = [
            'pending' => 'Pending',
            'active' => 'Active',
            'delivered' => 'Delivered',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ];

        $orderFunnel = collect($statusOrder)->map(function (string $label, string $status) use ($ordersInRange, $ordersCountInRange) {
            $count = (clone $ordersInRange)->where('status', $status)->count();

            return [
                'key' => $status,
                'label' => $label,
                'count' => $count,
                'share' => $ordersCountInRange > 0 ? round(($count / $ordersCountInRange) * 100, 1) : 0,
            ];
        })->values();

        $paymentBreakdown = collect([
            'pending' => 'Pending',
            'paid' => 'Paid',
            'released' => 'Released',
            'refunded' => 'Refunded',
        ])->map(function (string $label, string $status) use ($startDate, $ordersCountInRange) {
            $count = Order::query()
                ->where('created_at', '>=', $startDate)
                ->where('payment_status', $status)
                ->count();

            return [
                'key' => $status,
                'label' => $label,
                'count' => $count,
                'share' => $ordersCountInRange > 0 ? round(($count / $ordersCountInRange) * 100, 1) : 0,
            ];
        })->values();

        $topSellerRows = Order::query()
            ->with('seller:id,name')
            ->selectRaw('seller_id, COUNT(*) as orders_count, SUM(gross_amount) as gross_sales, SUM(COALESCE(refunded_amount,0)) as total_refunds, SUM((gross_amount - COALESCE(refunded_amount,0)) * platform_fee_percentage / 100) as platform_revenue')
            ->whereIn('payment_status', $paidStatuses)
            ->where('created_at', '>=', $startDate)
            ->groupBy('seller_id')
            ->orderByDesc('gross_sales')
            ->take(5)
            ->get();
        $sellerRatings = Review::query()
            ->selectRaw('seller_id, AVG(rating) as average_rating')
            ->whereIn('seller_id', $topSellerRows->pluck('seller_id'))
            ->groupBy('seller_id')
            ->pluck('average_rating', 'seller_id');
        $topSellers = $topSellerRows->map(fn ($row) => [
            'name'             => $row->seller?->name ?? 'Seller',
            'gross_sales'      => round((float) $row->gross_sales, 2),
            'total_refunds'    => round((float) $row->total_refunds, 2),
            'net_sales'        => round((float) $row->gross_sales - (float) $row->total_refunds, 2),
            'platform_revenue' => round((float) $row->platform_revenue, 2),
            'orders_count'     => (int) $row->orders_count,
            'average_rating'   => round((float) ($sellerRatings[$row->seller_id] ?? 0), 1),
        ])->values();

        $topCategories = Order::query()
            ->join('gigs', 'orders.gig_id', '=', 'gigs.id')
            ->leftJoin('categories', 'gigs.category_id', '=', 'categories.id')
            ->selectRaw('categories.name as category_name, COUNT(orders.id) as orders_count, SUM(orders.gross_amount) as gross_sales, SUM(COALESCE(orders.refunded_amount,0)) as total_refunds')
            ->whereIn('orders.payment_status', $paidStatuses)
            ->where('orders.created_at', '>=', $startDate)
            ->groupBy('categories.name')
            ->orderByDesc('gross_sales')
            ->take(5)
            ->get()
            ->map(fn ($row) => [
                'name'          => $row->category_name ?: 'Uncategorized',
                'orders_count'  => (int) $row->orders_count,
                'gross_sales'   => round((float) $row->gross_sales, 2),
                'total_refunds' => round((float) $row->total_refunds, 2),
                'net_sales'     => round((float) $row->gross_sales - (float) $row->total_refunds, 2),
            ])
            ->values();

        $refundCount = Order::query()
            ->where('created_at', '>=', $startDate)
            ->where('payment_status', 'refunded')
            ->count();
        $cancelledCount = Order::query()
            ->where('created_at', '>=', $startDate)
            ->where('status', 'cancelled')
            ->count();
        $activeSellers = Order::query()
            ->whereIn('payment_status', $paidStatuses)
            ->where('created_at', '>=', $startDate)
            ->distinct('seller_id')
            ->count('seller_id');
        $averageOrderValue = (float) (clone $currentPaidOrders)->avg('gross_amount');
        $averageRating = (float) Review::query()
            ->where('created_at', '>=', $startDate)
            ->avg('rating');

        $platformHealth = [
            [
                'label' => 'Cancellation Rate',
                'value' => $this->formatPercentage($ordersCountInRange > 0 ? ($cancelledCount / $ordersCountInRange) * 100 : 0),
                'detail' => sprintf('%d cancelled orders in the selected window', $cancelledCount),
                'tone' => $cancelledCount > 0 ? 'warning' : 'positive',
            ],
            [
                'label' => 'Refund Rate',
                'value' => $this->formatPercentage($ordersCountInRange > 0 ? ($refundCount / $ordersCountInRange) * 100 : 0),
                'detail' => sprintf('%d refunded payments in the selected window', $refundCount),
                'tone' => $refundCount > 0 ? 'warning' : 'positive',
            ],
            [
                'label' => 'Average Order Value',
                'value' => sprintf('USD %s', number_format($averageOrderValue, 2, '.', '')),
                'detail' => 'Based on paid and released seller orders',
                'tone' => 'neutral',
            ],
            [
                'label' => 'Average Rating',
                'value' => number_format($averageRating, 1, '.', ''),
                'detail' => sprintf('%d active sellers converted at least one paid order', $activeSellers),
                'tone' => $averageRating >= 4 ? 'positive' : 'neutral',
            ],
        ];

        $insights = array_values(array_filter([
            $revenueTrend->sum('platform_revenue') > 0
                ? sprintf(
                    '%s generated the most platform revenue in this window.',
                    $revenueTrend->sortByDesc('platform_revenue')->first()['label'] ?? 'This period'
                )
                : null,
            $topSellers->isNotEmpty()
                ? sprintf(
                    '%s is the top seller by GMV with USD %s in paid sales.',
                    $topSellers->first()['name'],
                    number_format($topSellers->first()['gross_sales'], 2, '.', '')
                )
                : null,
            $topCategories->isNotEmpty()
                ? sprintf(
                    '%s leads category sales with %d paid orders.',
                    $topCategories->first()['name'],
                    $topCategories->first()['orders_count']
                )
                : null,
            $refundCount > 0
                ? sprintf('Refund activity needs attention: %d refunded orders landed in the selected range.', $refundCount)
                : 'No refunds were recorded in the selected range.',
        ]));

        $recentUserItems = User::query()
            ->latest('created_at')
            ->take(4)
            ->get(['name', 'email', 'created_at'])
            ->map(fn (User $user) => [
                'text' => sprintf('New user: %s (%s)', $user->name, $user->email),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        $recentPlanItems = Plan::query()
            ->latest('created_at')
            ->take(3)
            ->get(['name', 'created_at'])
            ->map(fn (Plan $plan) => [
                'text' => sprintf('Plan updated: %s', $plan->name),
                'created_at' => $plan->created_at?->toIso8601String(),
            ]);

        $recentCategoryItems = Category::query()
            ->latest('created_at')
            ->take(3)
            ->get(['name', 'created_at'])
            ->map(fn (Category $category) => [
                'text' => sprintf('Category touched: %s', $category->name),
                'created_at' => $category->created_at?->toIso8601String(),
            ]);

        $recentActivity = (new Collection())
            ->concat($recentUserItems)
            ->concat($recentPlanItems)
            ->concat($recentCategoryItems)
            ->sortByDesc('created_at')
            ->take(6)
            ->values();

        return Inertia::render('admin/dashboard', [
            'filters' => [
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
            ],
            'stats' => $stats,
            'revenueTrend' => $revenueTrend,
            'orderFunnel' => $orderFunnel,
            'paymentBreakdown' => $paymentBreakdown,
            'topSellers' => $topSellers,
            'topCategories' => $topCategories,
            'platformHealth' => $platformHealth,
            'insights' => $insights,
            'recentActivity' => $recentActivity,
            'businessStats' => [
                [
                    'label' => 'Total Users',
                    'value' => User::whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))->count(),
                    'detail' => sprintf('+%d this month', User::whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))->where('created_at', '>=', now()->startOfMonth())->count()),
                ],
                [
                    'label' => 'Active Users',
                    'value' => User::whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))->where('status', 'active')->count(),
                    'detail' => sprintf('%d banned', User::whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))->where('status', 'banned')->count()),
                ],
                [
                    'label' => 'Categories',
                    'value' => Category::count(),
                    'detail' => sprintf('%d parent categories', Category::whereNull('parent_id')->count()),
                ],
                [
                    'label' => 'Active Plans',
                    'value' => Plan::where('status', 'active')->count(),
                    'detail' => sprintf('%d total plans', Plan::count()),
                ],
            ],
        ]);
    }

    private function resolveRange(?string $requestedRange): array
    {
        $range = in_array($requestedRange, ['7d', '30d', '90d', '12m'], true)
            ? $requestedRange
            : '7d';

        $now = now();

        return match ($range) {
            '7d' => [
                $range,
                $now->copy()->subDays(6)->startOfDay(),
                $now->copy()->subDays(13)->startOfDay(),
                $now->copy()->subDays(7)->endOfDay(),
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
                $now->copy()->subDays(29)->startOfDay(),
                $now->copy()->subDays(59)->startOfDay(),
                $now->copy()->subDays(30)->endOfDay(),
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
