<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Message;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use Spatie\Permission\Models\Role;

function ensureDashboardRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('seller can see their ranking on dashboard', function () {
    $seller = User::factory()->create();
    $seller->assignRole(ensureDashboardRole('seller'));
    $buyer = User::factory()->create();
    $buyer->assignRole(ensureDashboardRole('buyer'));

    $category = Category::create([
        'name' => 'Writing',
        'slug' => 'writing',
        'status' => 'active',
    ]);

    $subcategory = Category::create([
        'name' => 'Copywriting',
        'slug' => 'copywriting',
        'parent_id' => $category->id,
        'status' => 'active',
    ]);

    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'I will write landing page copy',
        'description' => 'Conversion-oriented copy for landing pages.',
        'tags' => ['copy'],
        'status' => 'active',
        'approval_status' => 'approved',
    ]);

    $package = GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic',
        'description' => 'One page',
        'price' => 100,
        'delivery_days' => 3,
        'revision_count' => 1,
    ]);

    for ($i = 0; $i < 5; $i++) {
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'gig_id' => $gig->id,
            'package_id' => $package->id,
            'quantity' => 1,
            'requirements' => 'Need copy.',
            'billing_name' => 'Buyer',
            'billing_email' => 'buyer@example.com',
            'unit_price' => 100,
            'subtotal_amount' => 100,
            'discount_amount' => 0,
            'price' => 100,
            'gross_amount' => 100,
            'platform_fee_percentage' => 10,
            'platform_fee_amount' => 10,
            'seller_net_amount' => 90,
            'status' => 'completed',
            'payment_status' => 'paid',
            'fund_status' => 'releasable',
            'completed_at' => now()->subDays($i + 1),
        ]);

        Review::create([
            'order_id' => $order->id,
            'gig_id' => $gig->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'rating' => 5,
            'comment' => 'Great work.',
        ]);
    }

    Message::create([
        'sender_id' => $buyer->id,
        'receiver_id' => $seller->id,
        'order_id' => Order::firstOrFail()->id,
        'body' => 'Can you share an update?',
        'created_at' => now()->subHours(4),
        'updated_at' => now()->subHours(4),
    ]);

    Message::create([
        'sender_id' => $seller->id,
        'receiver_id' => $buyer->id,
        'order_id' => Order::firstOrFail()->id,
        'body' => 'Yes, almost done.',
        'created_at' => now()->subHours(3),
        'updated_at' => now()->subHours(3),
    ]);

    $this->actingAs($seller);

    $response = $this->get(route('dashboard'));
    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('sellerLevel.label', 'Level 1')
            ->where('sellerLevel.value', 'level_1'));
});
