<?php

use App\Events\OrderMessageSent;
use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function ensureOrderMessagePermission(string $name): Permission
{
    return Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function ensureOrderMessageRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function orderMessageBuyer(): User
{
    $role = ensureOrderMessageRole('buyer');
    $role->givePermissionTo(ensureOrderMessagePermission('buyer.messages.access'));

    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

function orderMessageSeller(): User
{
    $role = ensureOrderMessageRole('seller');
    $role->givePermissionTo(ensureOrderMessagePermission('seller.messages.access'));

    $user = User::factory()->create();
    $user->assignRole($role);

    return $user;
}

function orderMessageOrder(User $buyer, User $seller): Order
{
    $parent = Category::create([
        'name' => 'Design',
        'slug' => 'design-order-message',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Logo',
        'slug' => 'logo-order-message',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $parent->id,
        'subcategory_id' => $child->id,
        'title' => 'Order message gig',
        'description' => 'Test gig',
        'tags' => ['test'],
        'status' => 'active',
    ]);

    $package = GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic',
        'description' => 'Basic package',
        'price' => 25,
        'delivery_days' => 3,
        'revision_count' => 1,
    ]);

    return Order::create([
        'buyer_id' => $buyer->id,
        'seller_id' => $seller->id,
        'gig_id' => $gig->id,
        'package_id' => $package->id,
        'quantity' => 1,
        'requirements' => 'Need a logo.',
        'billing_name' => 'Buyer Test',
        'billing_email' => 'buyer@test.com',
        'unit_price' => 25,
        'price' => 25,
        'status' => 'active',
        'payment_status' => 'paid',
        'escrow_held' => true,
    ]);
}

test('buyer can fetch and send order thread messages', function () {
    Event::fake([OrderMessageSent::class]);

    $buyer = orderMessageBuyer();
    $seller = orderMessageSeller();
    $order = orderMessageOrder($buyer, $seller);

    $this->actingAs($buyer)
        ->getJson(route('messages.order-thread', $order))
        ->assertOk()
        ->assertJsonPath('recipient.id', $seller->id)
        ->assertJsonPath('order.id', $order->id)
        ->assertJsonCount(0, 'messages');

    $this->actingAs($buyer)
        ->postJson(route('messages.order-store', $order), [
            'body' => 'Can you share a progress update?',
        ])
        ->assertCreated()
        ->assertJsonPath('success', true);

    $this->assertDatabaseHas('messages', [
        'order_id' => $order->id,
        'sender_id' => $buyer->id,
        'receiver_id' => $seller->id,
        'body' => 'Can you share a progress update?',
    ]);

    Event::assertDispatched(
        OrderMessageSent::class,
        fn (OrderMessageSent $event) => $event->orderId === $order->id
            && data_get($event->message, 'body') === 'Can you share a progress update?',
    );
});

test('user cannot access order thread for unrelated order', function () {
    $buyer = orderMessageBuyer();
    $seller = orderMessageSeller();
    $intruder = orderMessageBuyer();
    $order = orderMessageOrder($buyer, $seller);

    $this->actingAs($intruder)
        ->getJson(route('messages.order-thread', $order))
        ->assertForbidden();
});

test('order thread message requires body or attachment', function () {
    $buyer = orderMessageBuyer();
    $seller = orderMessageSeller();
    $order = orderMessageOrder($buyer, $seller);

    $this->actingAs($buyer)
        ->postJson(route('messages.order-store', $order), [
            'body' => '   ',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['body']);
});
