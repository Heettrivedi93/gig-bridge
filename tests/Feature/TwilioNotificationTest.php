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

function ensureTwilioNotificationRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function twilioNotificationUser(string $role, string $phone): User
{
    $user = User::factory()->create([
        'status' => 'active',
        'phone' => $phone,
    ]);
    $user->assignRole(ensureTwilioNotificationRole($role));

    return $user;
}

function twilioNotificationCategory(): array
{
    $parent = Category::create([
        'name' => 'Twilio Design',
        'slug' => 'twilio-design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Twilio Logo Design',
        'slug' => 'twilio-logo-design',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function twilioNotificationGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Twilio Notification Gig',
        'description' => 'Used for Twilio notification tests.',
        'tags' => ['twilio'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic package',
        'description' => 'Package details',
        'price' => 95,
        'delivery_days' => 3,
        'revision_count' => 2,
    ]);

    return $gig;
}

function configureTwilioNotifications(array $events): void
{
    Setting::setMany([
        'twilio_enabled' => true,
        'twilio_account_sid' => 'AC123456789',
        'twilio_auth_token' => 'twilio-token',
        'twilio_from_number' => '+15005550006',
        'notifications_twilio_enabled' => true,
        'notifications_twilio_events' => $events,
        'notifications_in_app_enabled' => false,
        'notifications_email_enabled' => false,
    ]);
}

test('order placed sends twilio sms when enabled', function () {
    Http::fake([
        'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json' => Http::response(['sid' => 'SM123'], 201),
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-TWILIO-1',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-TWILIO-1/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-TWILIO-1',
            ],
        ]),
    ]);

    configureTwilioNotifications(['order_placed']);
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    [$category, $subcategory] = twilioNotificationCategory();
    $seller = twilioNotificationUser('seller', '+15550000001');
    $buyer = twilioNotificationUser('buyer', '+15550000002');
    $gig = twilioNotificationGig($seller, $category, $subcategory);
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
            'order_id' => 'ORDER-TWILIO-1',
        ])
        ->assertOk();

    Http::assertSent(fn ($request) => $request->url() === 'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json'
        && str_contains((string) $request->body(), 'To=%2B15550000001')
        && str_contains((string) $request->body(), 'From=%2B15005550006')
        && str_contains(urldecode((string) $request->body()), 'New order received')
    );
});

test('registration sends twilio sms when enabled', function () {
    Http::fake([
        'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json' => Http::response(['sid' => 'SM124'], 201),
    ]);

    configureTwilioNotifications(['registration']);
    ensureTwilioNotificationRole('buyer');

    $user = app(CreateNewUser::class)->create([
        'name' => 'Buyer Twilio Test',
        'email' => 'buyer-twilio@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'buyer',
    ]);

    $user->forceFill(['phone' => '+15550000003'])->save();
    app(\App\Services\SystemNotificationService::class)->registration($user->fresh());

    Http::assertSent(fn ($request) => $request->url() === 'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json'
        && str_contains((string) $request->body(), 'To=%2B15550000003')
        && str_contains(urldecode((string) $request->body()), 'Welcome to GigBridge')
    );
});

test('twilio request is skipped when twilio notifications are disabled', function () {
    Http::fake();

    Setting::setMany([
        'twilio_enabled' => false,
        'notifications_twilio_enabled' => false,
        'notifications_twilio_events' => ['order_placed'],
        'notifications_in_app_enabled' => false,
        'notifications_email_enabled' => false,
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    [$category, $subcategory] = twilioNotificationCategory();
    $seller = twilioNotificationUser('seller', '+15550000004');
    $buyer = twilioNotificationUser('buyer', '+15550000005');
    $gig = twilioNotificationGig($seller, $category, $subcategory);
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

    Http::assertNotSent(fn ($request) => $request->url() === 'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json');
});

test('twilio request failure does not break business action', function () {
    Log::spy();

    Http::fake([
        'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json' => Http::response(['message' => 'bad request'], 400),
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-TWILIO-2',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-TWILIO-2/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-TWILIO-2',
            ],
        ]),
    ]);

    configureTwilioNotifications(['order_placed']);
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    [$category, $subcategory] = twilioNotificationCategory();
    $seller = twilioNotificationUser('seller', '+15550000006');
    $buyer = twilioNotificationUser('buyer', '+15550000007');
    $gig = twilioNotificationGig($seller, $category, $subcategory);
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
            'order_id' => 'ORDER-TWILIO-2',
        ])
        ->assertOk();

    Log::shouldHaveReceived('warning')->once();
});

test('twilio request is skipped when user disables that twilio event', function () {
    Http::fake([
        'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json' => Http::response(['sid' => 'SM125'], 201),
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-TWILIO-3',
            'status' => 'CREATED',
        ], 201),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-TWILIO-3/capture' => Http::response([
            'status' => 'COMPLETED',
            'payer' => [
                'payer_id' => 'PAYER-TWILIO-3',
            ],
        ]),
    ]);

    configureTwilioNotifications(['order_placed']);
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);

    [$category, $subcategory] = twilioNotificationCategory();
    $seller = twilioNotificationUser('seller', '+15550000008');
    $seller->update([
        'notification_preferences' => [
            'twilio_enabled' => true,
            'twilio_events' => ['payment_released'],
        ],
    ]);

    $buyer = twilioNotificationUser('buyer', '+15550000009');
    $gig = twilioNotificationGig($seller, $category, $subcategory);
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
            'order_id' => 'ORDER-TWILIO-3',
        ])
        ->assertOk();

    Http::assertNotSent(fn ($request) => $request->url() === 'https://api.twilio.com/2010-04-01/Accounts/AC123456789/Messages.json');
});
