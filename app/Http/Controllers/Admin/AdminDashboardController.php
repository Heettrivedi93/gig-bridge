<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Plan;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $paidOrders = Order::query()->whereIn('payment_status', ['paid', 'released']);
        $paidPlanPayments = SubscriptionPayment::query()->where('status', 'completed');
        $commissionRevenue = (float) (clone $paidOrders)->sum('platform_fee_amount');
        $paidPlanRevenue = (float) (clone $paidPlanPayments)->sum('amount');
        $totalPlatformRevenue = $commissionRevenue + $paidPlanRevenue;
        $grossSales = (float) (clone $paidOrders)->sum('gross_amount');

        $stats = [
            [
                'label' => 'Paid Plan Revenue',
                'value' => number_format($paidPlanRevenue, 2, '.', ''),
                'delta' => sprintf('%d completed plan payments', (clone $paidPlanPayments)->count()),
                'key' => 'paid_plan_revenue',
            ],
            [
                'label' => 'Commission Revenue',
                'value' => number_format($commissionRevenue, 2, '.', ''),
                'delta' => sprintf('From %d paid seller orders', (clone $paidOrders)->count()),
                'key' => 'commission_revenue',
            ],
            [
                'label' => 'Total Platform Revenue',
                'value' => number_format($totalPlatformRevenue, 2, '.', ''),
                'delta' => sprintf('Gross seller sales USD %s', number_format($grossSales, 2, '.', '')),
                'key' => 'total_platform_revenue',
            ],
            [
                'label' => 'Gross Seller Sales',
                'value' => number_format($grossSales, 2, '.', ''),
                'delta' => sprintf('%d paid seller orders', (clone $paidOrders)->count()),
                'key' => 'gross_seller_sales',
            ],
        ];

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
            'stats' => $stats,
            'recentActivity' => $recentActivity,
            'businessStats' => [
                [
                    'label' => 'Total Users',
                    'value' => User::count(),
                    'detail' => sprintf('+%d this month', User::where('created_at', '>=', now()->startOfMonth())->count()),
                ],
                [
                    'label' => 'Active Users',
                    'value' => User::where('status', 'active')->count(),
                    'detail' => sprintf('%d banned', User::where('status', 'banned')->count()),
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
}
