<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            [
                'label' => 'Total Users',
                'value' => User::count(),
                'delta' => sprintf('+%d this month', User::where('created_at', '>=', now()->startOfMonth())->count()),
                'key' => 'users',
            ],
            [
                'label' => 'Active Users',
                'value' => User::where('status', 'active')->count(),
                'delta' => sprintf('%d banned', User::where('status', 'banned')->count()),
                'key' => 'active_users',
            ],
            [
                'label' => 'Categories',
                'value' => Category::count(),
                'delta' => sprintf('%d parent categories', Category::whereNull('parent_id')->count()),
                'key' => 'categories',
            ],
            [
                'label' => 'Active Plans',
                'value' => Plan::where('status', 'active')->count(),
                'delta' => sprintf('%d total plans', Plan::count()),
                'key' => 'plans',
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
        ]);
    }
}
