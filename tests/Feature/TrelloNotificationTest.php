<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

function ensureTrelloNotificationRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function trelloNotificationUser(string $role): User
{
    $user = User::factory()->create([
        'status' => 'active',
    ]);
    $user->assignRole(ensureTrelloNotificationRole($role));

    return $user;
}

function trelloNotificationCategory(): array
{
    $parent = Category::create([
        'name' => 'Trello Design',
        'slug' => 'trello-design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Trello Logo Design',
        'slug' => 'trello-logo-design',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function trelloNotificationGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Trello Notification Gig',
        'description' => 'Used for Trello notification tests.',
        'tags' => ['trello'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic package',
        'description' => 'Package details',
        'price' => 90,
        'delivery_days' => 3,
        'revision_count' => 2,
    ]);

    return $gig;
}

function configureTrelloNotifications(array $events): void
{
    Setting::setMany([
        'trello_enabled' => true,
        'trello_api_key' => 'trello-key',
        'trello_token' => 'trello-token',
        'trello_board_id' => 'board-id',
        'trello_list_id' => 'list-id',
        'notifications_trello_enabled' => true,
        'notifications_trello_events' => $events,
        'notifications_in_app_enabled' => false,
        'notifications_email_enabled' => false,
    ]);
}

test('order placed sends trello card when enabled', function () {
    Http::fake([
        'https://api.trello.com/1/cards' => Http::response(['id' => 'card-1'], 200),
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-TRELLO-1',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-TRELLO-1/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-TRELLO-1',
            ],
        ]),
    ]);

    configureTrelloNotifications(['order_placed']);
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    [$category, $subcategory] = trelloNotificationCategory();
    $seller = trelloNotificationUser('seller');
    $buyer = trelloNotificationUser('buyer');
    $gig = trelloNotificationGig($seller, $category, $subcategory);
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

    $order = Order::query()->latest('id')->firstOrFail();

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.order', $order))
        ->assertOk();

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.capture', $order), [
            'order_id' => 'ORDER-TRELLO-1',
        ])
        ->assertOk();

    Http::assertSent(fn ($request) => $request->url() === 'https://api.trello.com/1/cards'
        && $request['key'] === 'trello-key'
        && $request['token'] === 'trello-token'
        && $request['idList'] === 'list-id'
        && str_contains($request['name'], 'New order')
    );
});

test('registration sends trello card when enabled', function () {
    Http::fake([
        'https://api.trello.com/1/cards' => Http::response(['id' => 'card-2'], 200),
    ]);

    configureTrelloNotifications(['new_user_registrations']);
    ensureTrelloNotificationRole('buyer');

    app(CreateNewUser::class)->create([
        'name' => 'Buyer Trello Test',
        'email' => 'buyer-trello@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'buyer',
    ]);

    Http::assertSent(fn ($request) => $request->url() === 'https://api.trello.com/1/cards'
        && str_contains($request['name'], 'New buyer registration')
    );
});

test('trello request is skipped when trello notifications are disabled', function () {
    Http::fake();

    Setting::setMany([
        'trello_enabled' => false,
        'notifications_trello_enabled' => false,
        'notifications_trello_events' => ['order_placed'],
        'notifications_in_app_enabled' => false,
        'notifications_email_enabled' => false,
    ]);

    [$category, $subcategory] = trelloNotificationCategory();
    $seller = trelloNotificationUser('seller');
    $buyer = trelloNotificationUser('buyer');
    $gig = trelloNotificationGig($seller, $category, $subcategory);
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

    Http::assertNothingSent();
});

test('trello request failure does not break business action', function () {
    Log::spy();

    Http::fake([
        'https://api.trello.com/1/cards' => Http::response(['message' => 'bad request'], 400),
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-TRELLO-2',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-TRELLO-2/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-TRELLO-2',
            ],
        ]),
    ]);

    configureTrelloNotifications(['order_placed']);
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    [$category, $subcategory] = trelloNotificationCategory();
    $seller = trelloNotificationUser('seller');
    $buyer = trelloNotificationUser('buyer');
    $gig = trelloNotificationGig($seller, $category, $subcategory);
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

    $order = Order::query()->latest('id')->firstOrFail();

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.order', $order))
        ->assertOk();

    $this->actingAs($buyer)
        ->postJson(route('buyer.orders.paypal.capture', $order), [
            'order_id' => 'ORDER-TRELLO-2',
        ])
        ->assertOk();

    Log::shouldHaveReceived('warning')->once();
});
