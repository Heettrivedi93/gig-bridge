<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\OrderCancellation;
use App\Models\Order;
use App\Models\OrderRevision;
use App\Models\Setting;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function ensureMarketRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function buyerUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureMarketRole('buyer'));

    return $user;
}

function sellerMarketUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureMarketRole('seller'));

    return $user;
}

function activeCategoryWithChild(): array
{
    $parent = Category::create([
        'name' => 'Design',
        'slug' => 'design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Logo Design',
        'slug' => 'logo-design',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function publishedGig(User $seller, Category $category, Category $subcategory, array $attributes = []): Gig
{
    $gig = Gig::create(array_merge([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Minimalist Logo Design',
        'description' => 'A clean logo package for startups and new brands.',
        'tags' => ['logo', 'branding'],
        'status' => 'active',
    ], $attributes));

    foreach ([
        ['tier' => 'basic', 'price' => 25, 'delivery_days' => 3],
        ['tier' => 'standard', 'price' => 50, 'delivery_days' => 5],
        ['tier' => 'premium', 'price' => 80, 'delivery_days' => 7],
    ] as $package) {
        GigPackage::create([
            'gig_id' => $gig->id,
            'tier' => $package['tier'],
            'title' => ucfirst($package['tier']).' package',
            'description' => 'Package details',
            'price' => $package['price'],
            'delivery_days' => $package['delivery_days'],
            'revision_count' => 2,
        ]);
    }

    return $gig;
}

test('buyer can browse published gigs with filters', function () {
    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();

    $matchingGig = publishedGig($seller, $category, $subcategory);
    publishedGig($seller, $category, $subcategory, [
        'title' => 'Enterprise Brand Strategy',
        'description' => 'Positioning workshop and messaging framework for growing teams.',
        'tags' => ['brand', 'strategy'],
    ]);

    $this->actingAs($buyer)
        ->get(route('buyer.gigs.index', ['keyword' => 'logo', 'category_id' => $category->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('buyer/gigs/index')
            ->where('gigs.0.id', $matchingGig->id)
            ->where('filters.keyword', 'logo'));
});

test('buyer can open a gig and create a pending order', function () {
    Storage::fake('public');

    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();
    $gig = publishedGig($seller, $category, $subcategory);
    $package = $gig->packages()->where('tier', 'standard')->firstOrFail();

    $this->actingAs($buyer)
        ->get(route('buyer.gigs.show', $gig))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('buyer/gigs/show')
            ->where('gig.id', $gig->id)
            ->where('gig.packages.1.id', $package->id));

    $this->actingAs($buyer)
        ->post(route('buyer.orders.store', $gig), [
            'package_id' => $package->id,
            'quantity' => 2,
            'requirements' => 'Need a modern, geometric look for a fintech startup.',
            'brief_file' => UploadedFile::fake()->create('brief.pdf', 100),
            'reference_link' => 'https://example.com/reference',
            'style_notes' => 'Use calm colors and minimal iconography.',
            'coupon_code' => 'WELCOME10',
            'billing_name' => 'Buyer One',
            'billing_email' => 'buyer@example.com',
        ])
        ->assertRedirect(route('buyer.orders.index'));

    $order = Order::query()->firstOrFail();

    expect($order->buyer_id)->toBe($buyer->id);
    expect($order->seller_id)->toBe($seller->id);
    expect($order->status)->toBe('pending');
    expect($order->payment_status)->toBe('pending');
    expect($order->price)->toEqual('100.00');
    expect($order->brief_file_path)->not->toBeNull();

    $this->actingAs($buyer)
        ->get(route('buyer.orders.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('buyer/orders/index')
            ->where('orders.0.gig_title', $gig->title)
            ->where('orders.0.payment_status', 'pending'));
});

test('buyer can create and capture paypal payment for a pending order', function () {
    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();
    $gig = publishedGig($seller, $category, $subcategory);
    $package = $gig->packages()->where('tier', 'basic')->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need it soon.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 25,
        'price' => 25,
        'status' => 'pending',
        'payment_status' => 'pending',
        'escrow_held' => false,
    ]);

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
            'id' => 'ORDER-BUYER-1',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-BUYER-1/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-123',
            ],
        ]),
    ]);

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.order', $order))
        ->assertOk()
        ->assertJson([
            'id' => 'ORDER-BUYER-1',
        ]);

    expect($order->fresh()->paypal_order_id)->toBe('ORDER-BUYER-1');

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.capture', $order), [
            'order_id' => 'ORDER-BUYER-1',
        ])
        ->assertOk()
        ->assertJson([
            'status' => 'COMPLETED',
        ]);

    $order->refresh();

    expect($order->status)->toBe('active');
    expect($order->payment_status)->toBe('paid');
    expect($order->fund_status)->toBe('escrow');
    expect($order->escrow_held)->toBeTrue();
    expect($order->paypal_payer_id)->toBe('PAYER-123');
    expect(Wallet::query()->where('owner_type', 'system')->first()?->escrow_balance)->toEqual('25.00');
});

test('buyer can view payment history with invoice data', function () {
    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();
    $gig = publishedGig($seller, $category, $subcategory);
    $package = $gig->packages()->where('tier', 'premium')->firstOrFail();

    Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need a premium version.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 80,
        'price' => 80,
        'status' => 'active',
        'payment_status' => 'paid',
        'escrow_held' => true,
        'paypal_order_id' => 'ORDER-HISTORY-1',
        'paypal_payer_id' => 'PAYER-HISTORY-1',
    ]);

    $this->actingAs($buyer)
        ->get(route('buyer.payments.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('buyer/payments/index')
            ->where('payments.0.invoice_number', 'INV-ORDER-1')
            ->where('payments.0.gig.title', $gig->title)
            ->where('payments.0.package.tier', 'premium')
            ->where('payments.0.seller.name', $seller->name));
});

test('buyer can request revision for delivered paid order', function () {
    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();
    $gig = publishedGig($seller, $category, $subcategory);
    $package = $gig->packages()->where('tier', 'basic')->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need some revisions.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 25,
        'price' => 25,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'escrow_held' => true,
        'delivered_at' => now(),
    ]);

    $this->actingAs($buyer)
        ->post(route('buyer.orders.revision', $order), [
            'revision_note' => 'Please adjust the spacing and icon alignment.',
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->status)->toBe('active');
    expect(OrderRevision::query()->where('order_id', $order->id)->count())->toBe(1);
});

test('buyer can complete delivered paid order', function () {
    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();
    $gig = publishedGig($seller, $category, $subcategory);
    $package = $gig->packages()->where('tier', 'basic')->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Looks good.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 25,
        'price' => 25,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'escrow_held' => true,
        'delivered_at' => now(),
    ]);

    $this->actingAs($buyer)
        ->post(route('buyer.orders.complete', $order))
        ->assertRedirect();

    $order->refresh();

    expect($order->status)->toBe('completed');
    expect($order->fund_status)->toBe('releasable');
    expect($order->completed_at)->not->toBeNull();
    expect($order->escrow_held)->toBeTrue();
});

test('buyer can cancel order with audit trail', function () {
    [$category, $subcategory] = activeCategoryWithChild();
    $seller = sellerMarketUser();
    $buyer = buyerUser();
    $gig = publishedGig($seller, $category, $subcategory);
    $package = $gig->packages()->where('tier', 'basic')->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need to cancel this.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 25,
        'price' => 25,
        'status' => 'active',
        'payment_status' => 'paid',
        'escrow_held' => true,
    ]);

    $this->actingAs($buyer)
        ->post(route('buyer.orders.cancel', $order), [
            'cancellation_reason' => 'Project scope changed.',
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->status)->toBe('cancelled');
    expect($order->payment_status)->toBe('refunded');
    expect($order->cancelled_at)->not->toBeNull();
    expect(OrderCancellation::query()->where('order_id', $order->id)->first()?->cancelled_by)->toBe('buyer');
});
