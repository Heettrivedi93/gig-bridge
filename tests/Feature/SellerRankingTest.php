<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Message;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use Spatie\Permission\Models\Role;

function ensureSellerRankingRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function sellerRankingBuyer(): User
{
    $user = User::factory()->create(['status' => 'active']);
    $user->assignRole(ensureSellerRankingRole('buyer'));

    return $user;
}

function sellerRankingSeller(): User
{
    $user = User::factory()->create(['status' => 'active']);
    $user->assignRole(ensureSellerRankingRole('seller'));

    return $user;
}

function sellerRankingCategories(): array
{
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

    return [$category, $subcategory];
}

function rankedSellerGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'High-converting landing page copy',
        'description' => 'Conversion-focused copywriting for SaaS and ecommerce brands.',
        'tags' => ['copy', 'sales'],
        'status' => 'active',
        'approval_status' => 'approved',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic copy pack',
        'description' => 'One landing page.',
        'price' => 120,
        'delivery_days' => 3,
        'revision_count' => 2,
    ]);

    return $gig;
}

function buildLevelOneSellerMetrics(User $seller, User $buyer, Gig $gig): void
{
    $package = $gig->packages()->firstOrFail();

    for ($i = 0; $i < 5; $i++) {
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'gig_id' => $gig->id,
            'package_id' => $package->id,
            'quantity' => 1,
            'requirements' => 'Need crisp copy.',
            'billing_name' => 'Buyer Test',
            'billing_email' => 'buyer@example.com',
            'unit_price' => 120,
            'subtotal_amount' => 120,
            'discount_amount' => 0,
            'price' => 120,
            'gross_amount' => 120,
            'seller_net_amount' => 100,
            'platform_fee_percentage' => 16.67,
            'platform_fee_amount' => 20,
            'status' => 'completed',
            'payment_status' => 'paid',
            'fund_status' => 'releasable',
            'completed_at' => now()->subDays(10 - $i),
        ]);

        Review::create([
            'order_id' => $order->id,
            'gig_id' => $gig->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'rating' => 5,
            'comment' => 'Excellent work.',
        ]);
    }

    Message::create([
        'sender_id' => $buyer->id,
        'receiver_id' => $seller->id,
        'order_id' => Order::firstOrFail()->id,
        'body' => 'Can you share an update?',
        'created_at' => now()->subHours(6),
        'updated_at' => now()->subHours(6),
    ]);

    Message::create([
        'sender_id' => $seller->id,
        'receiver_id' => $buyer->id,
        'order_id' => Order::firstOrFail()->id,
        'body' => 'Yes, draft is almost ready.',
        'created_at' => now()->subHours(5),
        'updated_at' => now()->subHours(5),
    ]);
}

test('seller ranking badge appears on buyer gig cards and seller profile', function () {
    [$category, $subcategory] = sellerRankingCategories();
    $buyer = sellerRankingBuyer();
    $seller = sellerRankingSeller();
    $gig = rankedSellerGig($seller, $category, $subcategory);

    buildLevelOneSellerMetrics($seller, $buyer, $gig);

    $this->actingAs($buyer)
        ->get(route('buyer.gigs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('buyer/gigs/index')
            ->where('gigs.0.seller_level.label', 'Level 1')
            ->where('gigs.0.seller_level.value', 'level_1'));

    $this->get(route('sellers.show', $seller))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sellers/show')
            ->where('seller.seller_level.label', 'Level 1')
            ->where('gigs.0.seller_level.value', 'level_1'));

    expect($seller->fresh()->seller_level)->toBe('level_1');
});
