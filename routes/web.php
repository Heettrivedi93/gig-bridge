<?php

use App\Http\Controllers\Admin\AdminCategoryController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminPlanController;
use App\Http\Controllers\Admin\AdminSettingController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\SellerGigController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::prefix('seller')->name('seller.')->group(function () {
        Route::get('gigs', [SellerGigController::class, 'index'])->name('gigs.index');
        Route::post('gigs', [SellerGigController::class, 'store'])->name('gigs.store');
        Route::put('gigs/{gig}', [SellerGigController::class, 'update'])->name('gigs.update');
        Route::delete('gigs/{gig}', [SellerGigController::class, 'destroy'])->name('gigs.destroy');
    });
});

// Admin routes
Route::prefix('admin')->name('admin.')->middleware(['auth', \App\Http\Middleware\EnsureSuperAdmin::class])->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    // Categories
    Route::get('categories', [AdminCategoryController::class, 'index'])->name('categories.index');
    Route::post('categories', [AdminCategoryController::class, 'store'])->name('categories.store');
    Route::put('categories/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
    Route::delete('categories/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

    // Users
    Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
    Route::put('users/{user}', [AdminUserController::class, 'update'])->name('users.update');

    // Subscription plans
    Route::get('plans', [AdminPlanController::class, 'index'])->name('plans.index');
    Route::post('plans', [AdminPlanController::class, 'store'])->name('plans.store');
    Route::put('plans/{plan}', [AdminPlanController::class, 'update'])->name('plans.update');
    Route::delete('plans/{plan}', [AdminPlanController::class, 'destroy'])->name('plans.destroy');

    // System settings
    Route::get('settings', [AdminSettingController::class, 'index'])->name('settings.index');
    Route::put('settings', [AdminSettingController::class, 'update'])->name('settings.update');
});

require __DIR__.'/settings.php';
