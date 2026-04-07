<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;

function ensureNotificationRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function notificationUser(string $role): User
{
    $user = User::factory()->create([
        'status' => 'active',
    ]);
    $user->assignRole(ensureNotificationRole($role));

    return $user;
}

function notificationCategory(): array
{
    $parent = Category::create([
        'name' => 'Notification Design',
        'slug' => 'notification-design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Notification Logo Design',
        'slug' => 'notification-logo-design',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function notificationGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Notification Gig',
        'description' => 'Used for in-app notification tests.',
        'tags' => ['notifications'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic package',
        'description' => 'Package details',
        'price' => 75,
        'delivery_days' => 3,
        'revision_count' => 2,
    ]);

    return $gig;
}

test('seller receives in app notification when buyer payment is completed', function () {
    Setting::setValue('notifications_in_app_enabled', true);
    Setting::setValue('notifications_in_app_events', ['orders']);
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    Http::fake([
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-NOTIFY-1',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-NOTIFY-1/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-NOTIFY-1',
            ],
        ]),
    ]);

    [$category, $subcategory] = notificationCategory();
    $seller = notificationUser('seller');
    $buyer = notificationUser('buyer');
    $gig = notificationGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $this->actingAs($buyer)
        ->post(route('buyer.orders.store', $gig), [
            'package_id' => $package->id,
            'quantity' => 1,
            'requirements' => 'Need this completed quickly.',
            'billing_name' => 'Buyer Example',
            'billing_email' => 'buyer@example.com',
        ])
        ->assertRedirect(route('buyer.orders.index'));

    $order = Order::query()->firstOrFail();

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.order', $order))
        ->assertOk();

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.capture', $order), [
            'order_id' => 'ORDER-NOTIFY-1',
        ])
        ->assertOk();

    $seller->refresh();

    expect($seller->notifications)->toHaveCount(1);
    expect(data_get($seller->notifications->first()->data, 'event'))->toBe('orders');

    $this->actingAs($seller)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.unread_count', 1)
            ->where('notifications.items.0.event', 'orders'));
});

test('seller receives payment released notification and can mark it as read', function () {
    Setting::setValue('notifications_in_app_enabled', true);
    Setting::setValue('notifications_in_app_events', ['payment_released']);

    Wallet::query()->firstOrCreate(
        ['user_id' => null, 'owner_type' => 'system'],
        ['currency' => 'USD', 'status' => 'active', 'escrow_balance' => 0]
    );

    [$category, $subcategory] = notificationCategory();
    $admin = notificationUser('super_admin');
    $seller = notificationUser('seller');
    $buyer = notificationUser('buyer');
    $gig = notificationGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Release payment for this order.',
        'billing_name' => 'Buyer Example',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 75,
        'price' => 75,
        'gross_amount' => 75,
        'platform_fee_percentage' => 10,
        'platform_fee_amount' => 7.5,
        'seller_net_amount' => 67.5,
        'status' => 'completed',
        'payment_status' => 'paid',
        'fund_status' => 'releasable',
        'escrow_held' => true,
        'completed_at' => now(),
    ]);

    Wallet::query()->where('owner_type', 'system')->firstOrFail()->update([
        'escrow_balance' => 75,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.orders.release-funds', $order))
        ->assertRedirect();

    $seller->refresh();
    $notification = $seller->notifications()->latest()->first();

    expect($notification)->not->toBeNull();
    expect(data_get($notification->data, 'event'))->toBe('payment_released');
    expect($notification->read_at)->toBeNull();

    $this->actingAs($seller)
        ->post(route('notifications.read', $notification->id))
        ->assertRedirect();

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('in app notifications are not sent when disabled in settings', function () {
    Setting::setValue('notifications_in_app_enabled', false);
    Setting::setValue('notifications_in_app_events', ['orders', 'payment_released']);

    [$category, $subcategory] = notificationCategory();
    $seller = notificationUser('seller');
    $buyer = notificationUser('buyer');
    $gig = notificationGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $this->actingAs($buyer)
        ->post(route('buyer.orders.store', $gig), [
            'package_id' => $package->id,
            'quantity' => 1,
            'requirements' => 'Need this completed quickly.',
            'billing_name' => 'Buyer Example',
            'billing_email' => 'buyer@example.com',
        ])
        ->assertRedirect(route('buyer.orders.index'));

    expect($seller->fresh()->notifications)->toHaveCount(0);
});
