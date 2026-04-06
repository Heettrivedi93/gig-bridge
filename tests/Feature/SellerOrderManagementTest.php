<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\OrderCancellation;
use App\Models\OrderDelivery;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function ensureSellerOrderRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function sellerOrderUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureSellerOrderRole('seller'));

    return $user;
}

function buyerOrderUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureSellerOrderRole('buyer'));

    return $user;
}

function sellerOrderCategory(): array
{
    $parent = Category::create([
        'name' => 'Writing',
        'slug' => 'writing',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Blog Writing',
        'slug' => 'blog-writing',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function sellerOrderGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'SEO Blog Writing',
        'description' => 'Articles written for search and conversion.',
        'tags' => ['seo', 'content'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic article',
        'description' => 'Short article',
        'price' => 40,
        'delivery_days' => 3,
        'revision_count' => 2,
    ]);

    return $gig;
}

test('seller can view assigned orders', function () {
    [$category, $subcategory] = sellerOrderCategory();
    $seller = sellerOrderUser();
    $buyer = buyerOrderUser();
    $gig = sellerOrderGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need an SEO blog post.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 40,
        'price' => 40,
        'status' => 'active',
        'payment_status' => 'paid',
        'escrow_held' => true,
    ]);

    $this->actingAs($seller)
        ->get(route('seller.orders.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('seller/orders/index')
            ->where('orders.0.gig_title', $gig->title)
            ->where('orders.0.buyer.name', $buyer->name));
});

test('seller can submit delivery for active paid order', function () {
    Storage::fake('public');

    [$category, $subcategory] = sellerOrderCategory();
    $seller = sellerOrderUser();
    $buyer = buyerOrderUser();
    $gig = sellerOrderGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need an SEO blog post.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 40,
        'price' => 40,
        'status' => 'active',
        'payment_status' => 'paid',
        'escrow_held' => true,
    ]);

    $this->actingAs($seller)
        ->post(route('seller.orders.deliver', $order), [
            'delivery_file' => UploadedFile::fake()->create('delivery.zip', 100),
            'delivery_note' => 'Final files attached.',
        ])
        ->assertRedirect();

    expect($order->fresh()->status)->toBe('delivered');
    expect($order->fresh()->delivered_at)->not->toBeNull();
    expect(OrderDelivery::query()->where('order_id', $order->id)->count())->toBe(1);
});

test('seller can cancel order with audit trail', function () {
    [$category, $subcategory] = sellerOrderCategory();
    $seller = sellerOrderUser();
    $buyer = buyerOrderUser();
    $gig = sellerOrderGig($seller, $category, $subcategory);
    $package = $gig->packages()->firstOrFail();

    $order = Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need an SEO blog post.',
        'billing_name' => 'Buyer One',
        'billing_email' => 'buyer@example.com',
        'unit_price' => 40,
        'price' => 40,
        'status' => 'active',
        'payment_status' => 'paid',
        'escrow_held' => true,
    ]);

    $this->actingAs($seller)
        ->post(route('seller.orders.cancel', $order), [
            'cancellation_reason' => 'Buyer requirements changed significantly.',
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->status)->toBe('cancelled');
    expect($order->payment_status)->toBe('refunded');
    expect($order->cancelled_at)->not->toBeNull();
    expect(OrderCancellation::query()->where('order_id', $order->id)->first()?->cancelled_by)->toBe('seller');
});
