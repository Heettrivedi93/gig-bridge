<?php

use App\Http\Controllers\Admin\AdminCategoryController;
use App\Http\Controllers\Admin\AdminAnnouncementController;
use App\Http\Controllers\Admin\AdminCouponController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminDisputeController;
use App\Http\Controllers\Admin\AdminGigModerationController;
use App\Http\Controllers\Admin\AdminOrderController;
use App\Http\Controllers\Admin\AdminPlanController;
use App\Http\Controllers\Admin\AdminSettingController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminWalletLedgerController;
use App\Http\Controllers\Admin\AdminWithdrawalController;
use App\Http\Controllers\GigFavouriteController;
use App\Http\Controllers\BuyerCatalogController;
use App\Http\Controllers\BuyerOrderController;
use App\Http\Controllers\AnnouncementDismissalController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DisputeController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SellerGigController;
use App\Http\Controllers\SellerOrderController;
use App\Http\Controllers\SellerPlanController;
use App\Http\Controllers\SellerProfileController;
use App\Http\Middleware\EnsureSuperAdmin;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

// Public seller profile page (no auth required)
Route::get('sellers/{user}', [SellerProfileController::class, 'show'])->name('sellers.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('announcements/{announcement}/dismiss', [AnnouncementDismissalController::class, 'store'])->name('announcements.dismiss');
    Route::get('orders/{order}/messages', [MessageController::class, 'orderThread'])->name('messages.order-thread');
    Route::post('orders/{order}/messages', [MessageController::class, 'storeForOrder'])->name('messages.order-store');
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');

    // Disputes (buyer + seller)
    Route::get('disputes', [DisputeController::class, 'index'])->name('disputes.index');
    Route::post('orders/{order}/disputes', [DisputeController::class, 'store'])->name('disputes.store');
    Route::get('disputes/{dispute}', [DisputeController::class, 'show'])->name('disputes.show');
    Route::post('disputes/{dispute}/messages', [DisputeController::class, 'sendMessage'])->name('disputes.messages.store');

    Route::prefix('seller')->name('seller.')->group(function () {
        Route::middleware('can:seller.gigs.access')->group(function () {
            Route::get('gigs', [SellerGigController::class, 'index'])->name('gigs.index');
            Route::post('gigs', [SellerGigController::class, 'store'])->name('gigs.store');
            Route::put('gigs/{gig}', [SellerGigController::class, 'update'])->name('gigs.update');
            Route::delete('gigs/{gig}', [SellerGigController::class, 'destroy'])->name('gigs.destroy');
            Route::put('availability', [SellerGigController::class, 'updateAvailability'])->name('availability.update');
        });

        Route::middleware('can:seller.orders.access')->group(function () {
            Route::get('orders', [SellerOrderController::class, 'index'])->name('orders.index');
            Route::get('orders/export/excel', [SellerOrderController::class, 'exportExcel'])->name('orders.export.excel');
            Route::get('orders/export/pdf', [SellerOrderController::class, 'exportPdf'])->name('orders.export.pdf');
            Route::post('orders/{order}/deliver', [SellerOrderController::class, 'deliver'])->name('orders.deliver');
            Route::post('orders/{order}/cancel', [SellerOrderController::class, 'cancel'])->name('orders.cancel');
        });

        Route::middleware('can:seller.plans.access')->group(function () {
            Route::get('plans', [SellerPlanController::class, 'index'])->name('plans.index');
            Route::post('plans/activate-next', [SellerPlanController::class, 'activateNext'])->name('plans.activate-next');
            Route::post('plans/{plan}/activate-free', [SellerPlanController::class, 'activateFree'])->name('plans.activate-free');
            Route::post('plans/{plan}/paypal/order', [SellerPlanController::class, 'createPaypalOrder'])->name('plans.paypal.order');
            Route::post('plans/{plan}/paypal/capture', [SellerPlanController::class, 'capturePaypalOrder'])->name('plans.paypal.capture');
        });

        Route::middleware('can:seller.wallet.access')->group(function () {
            Route::get('wallet', [SellerPlanController::class, 'wallet'])->name('wallet.index');
            Route::post('withdrawals', [SellerPlanController::class, 'requestWithdrawal'])->name('withdrawals.store');
        });

        Route::middleware('can:seller.payments.access')->group(function () {
            Route::get('payments', [SellerPlanController::class, 'history'])->name('payments.index');
            Route::get('payments/{payment}/invoice.pdf', [SellerPlanController::class, 'downloadInvoicePdf'])->name('payments.invoice.pdf');
        });
    });

    Route::prefix('buyer')->name('buyer.')->group(function () {
        Route::middleware('can:buyer.gigs.access')->group(function () {
            Route::get('gigs', [BuyerCatalogController::class, 'index'])->name('gigs.index');
            Route::get('gigs/{gig}', [BuyerCatalogController::class, 'show'])->name('gigs.show');
            Route::get('favourites', [GigFavouriteController::class, 'index'])->name('favourites.index');
            Route::post('gigs/{gig}/favourite', [GigFavouriteController::class, 'toggle'])->name('gigs.favourite');
        });

        Route::middleware('can:buyer.orders.access')->group(function () {
            Route::get('orders', [BuyerOrderController::class, 'index'])->name('orders.index');
            Route::post('gigs/{gig}/orders', [BuyerOrderController::class, 'store'])->name('orders.store');
            Route::post('orders/{order}/revision', [BuyerOrderController::class, 'requestRevision'])->name('orders.revision');
            Route::post('orders/{order}/complete', [BuyerOrderController::class, 'complete'])->name('orders.complete');
            Route::post('orders/{order}/review', [BuyerOrderController::class, 'review'])->name('orders.review');
            Route::post('orders/{order}/cancel', [BuyerOrderController::class, 'cancel'])->name('orders.cancel');
            Route::post('orders/{order}/paypal/order', [BuyerOrderController::class, 'createPaypalOrder'])->name('orders.paypal.order');
            Route::post('orders/{order}/paypal/capture', [BuyerOrderController::class, 'capturePaypalOrder'])->name('orders.paypal.capture');
        });

        Route::middleware('can:buyer.payments.access')->group(function () {
            Route::get('payments', [BuyerOrderController::class, 'payments'])->name('payments.index');
            Route::get('payments/{order}/invoice.pdf', [BuyerOrderController::class, 'downloadInvoicePdf'])->name('payments.invoice.pdf');
        });
    });
});

// Admin routes
Route::prefix('admin')->name('admin.')->middleware(['auth', EnsureSuperAdmin::class])->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    // Announcements
    Route::get('announcements', [AdminAnnouncementController::class, 'index'])->name('announcements.index');
    Route::post('announcements', [AdminAnnouncementController::class, 'store'])->name('announcements.store');
    Route::put('announcements/{announcement}', [AdminAnnouncementController::class, 'update'])->name('announcements.update');
    Route::delete('announcements/{announcement}', [AdminAnnouncementController::class, 'destroy'])->name('announcements.destroy');

    // Categories
    Route::get('categories', [AdminCategoryController::class, 'index'])->name('categories.index');
    Route::post('categories', [AdminCategoryController::class, 'store'])->name('categories.store');
    Route::put('categories/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
    Route::delete('categories/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

    // Users
    Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
    Route::put('users/{user}', [AdminUserController::class, 'update'])->name('users.update');

    // Orders
    Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
    Route::put('orders/{order}', [AdminOrderController::class, 'update'])->name('orders.update');
    Route::post('orders/{order}/release-funds', [AdminOrderController::class, 'releaseFunds'])->name('orders.release-funds');

    // Gig moderation
    Route::get('gigs', [AdminGigModerationController::class, 'index'])->name('gigs.index');
    Route::post('gigs/{gig}/approve', [AdminGigModerationController::class, 'approve'])->name('gigs.approve');
    Route::post('gigs/{gig}/reject', [AdminGigModerationController::class, 'reject'])->name('gigs.reject');

    // Withdrawals
    Route::get('withdrawals', [AdminWithdrawalController::class, 'index'])->name('withdrawals.index');
    Route::put('withdrawals/{withdrawal}', [AdminWithdrawalController::class, 'update'])->name('withdrawals.update');

    // Ledger
    Route::get('ledger', [AdminWalletLedgerController::class, 'index'])->name('ledger.index');

    // Subscription plans
    Route::get('plans', [AdminPlanController::class, 'index'])->name('plans.index');
    Route::post('plans', [AdminPlanController::class, 'store'])->name('plans.store');
    Route::put('plans/{plan}', [AdminPlanController::class, 'update'])->name('plans.update');
    Route::delete('plans/{plan}', [AdminPlanController::class, 'destroy'])->name('plans.destroy');

    // Coupons
    Route::get('coupons', [AdminCouponController::class, 'index'])->name('coupons.index');
    Route::post('coupons', [AdminCouponController::class, 'store'])->name('coupons.store');
    Route::put('coupons/{coupon}', [AdminCouponController::class, 'update'])->name('coupons.update');
    Route::delete('coupons/{coupon}', [AdminCouponController::class, 'destroy'])->name('coupons.destroy');

    // System settings
    Route::get('settings', [AdminSettingController::class, 'index'])->name('settings.index');
    Route::put('settings', [AdminSettingController::class, 'update'])->name('settings.update');

    // Disputes
    Route::get('disputes', [AdminDisputeController::class, 'index'])->name('disputes.index');
    Route::get('disputes/{dispute}', [AdminDisputeController::class, 'show'])->name('disputes.show');
    Route::post('disputes/{dispute}/messages', [AdminDisputeController::class, 'sendMessage'])->name('disputes.messages.store');
    Route::post('disputes/{dispute}/resolve', [AdminDisputeController::class, 'resolve'])->name('disputes.resolve');
});

require __DIR__.'/settings.php';
