<?php

use App\Models\Plan;
use App\Models\Setting;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;

function ensureSellerRole(): Role
{
    return Role::firstOrCreate(['name' => 'seller', 'guard_name' => 'web']);
}

function sellerUser(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureSellerRole());

    return $user;
}

function activePlan(array $attributes = []): Plan
{
    static $counter = 1;

    return Plan::create(array_merge([
        'name' => 'Plan '.$counter++,
        'price' => 19.99,
        'duration_days' => 30,
        'gig_limit' => 10,
        'features' => ['Priority listing'],
        'status' => 'active',
    ], $attributes));
}

function configurePaypal(): void
{
    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'USD',
    ]);
}

test('seller can view plans page with paypal config', function () {
    $seller = sellerUser();
    $plan = activePlan();

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $plan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    configurePaypal();

    $this->actingAs($seller)
        ->get(route('seller.plans.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('seller/plans/index')
            ->where('paypal.enabled', true)
            ->where('paypal.client_id', 'test-client-id')
            ->where('plans.0.name', $plan->name));
});

test('seller can create a paypal order for a paid plan using admin settings', function () {
    $seller = sellerUser();
    $plan = activePlan(['price' => 29.99]);
    configurePaypal();

    Http::fake([
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
            'id' => 'ORDER-123',
            'status' => 'CREATED',
        ], 201),
    ]);

    $this->actingAs($seller)
        ->postJson(route('seller.plans.paypal.order', $plan))
        ->assertOk()
        ->assertJson([
            'id' => 'ORDER-123',
        ]);

    $payment = SubscriptionPayment::query()->first();

    expect($payment)->not->toBeNull();
    expect($payment->provider_order_id)->toBe('ORDER-123');
    expect($payment->amount)->toEqual('29.99');
    expect($payment->currency)->toBe('USD');

    Http::assertSent(function ($request) {
        if ($request->url() !== 'https://api-m.sandbox.paypal.com/v2/checkout/orders') {
            return true;
        }

        return $request['intent'] === 'CAPTURE'
            && $request['purchase_units'][0]['amount']['currency_code'] === 'USD'
            && $request['purchase_units'][0]['amount']['value'] === '29.99';
    });
});

test('seller cannot create a paypal order with an unsupported admin currency', function () {
    $seller = sellerUser();
    $plan = activePlan(['price' => 29.99]);

    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'INR',
    ]);

    $this->actingAs($seller)
        ->postJson(route('seller.plans.paypal.order', $plan))
        ->assertStatus(422)
        ->assertJsonValidationErrors('paypal');

    expect(SubscriptionPayment::query()->count())->toBe(0);
});

test('seller gets a clear error when paypal currency does not allow decimal amounts', function () {
    $seller = sellerUser();
    $plan = activePlan(['price' => 29.99]);

    Setting::setMany([
        'payment_paypal_mode' => 'sandbox',
        'payment_paypal_client_id' => 'test-client-id',
        'payment_paypal_client_secret' => 'test-client-secret',
        'payment_currency' => 'JPY',
    ]);

    $this->actingAs($seller)
        ->postJson(route('seller.plans.paypal.order', $plan))
        ->assertStatus(422)
        ->assertJsonValidationErrors('paypal');

    expect(SubscriptionPayment::query()->count())->toBe(0);
});

test('seller can capture paypal order and activate purchased plan', function () {
    $seller = sellerUser();
    $currentPlan = activePlan(['name' => 'Free', 'price' => 0, 'gig_limit' => 3]);
    $newPlan = activePlan(['name' => 'Pro', 'price' => 49.99, 'gig_limit' => 50]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $currentPlan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    SubscriptionPayment::create([
        'user_id' => $seller->id,
        'plan_id' => $newPlan->id,
        'provider' => 'paypal',
        'provider_order_id' => 'ORDER-456',
        'amount' => 49.99,
        'currency' => 'USD',
        'status' => 'created',
    ]);

    configurePaypal();

    Http::fake([
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-456/capture' => Http::response([
            'status' => 'COMPLETED',
            'purchase_units' => [
                [
                    'payments' => [
                        'captures' => [
                            ['id' => 'CAPTURE-789'],
                        ],
                    ],
                ],
            ],
        ]),
    ]);

    $this->actingAs($seller)
        ->postJson(route('seller.plans.paypal.capture', $newPlan), [
            'order_id' => 'ORDER-456',
        ])
        ->assertOk()
        ->assertJson([
            'status' => 'COMPLETED',
        ]);

    expect($seller->fresh()->activeSubscription()?->plan_id)->toBe($newPlan->id);

    $payment = SubscriptionPayment::query()
        ->where('provider_order_id', 'ORDER-456')
        ->firstOrFail();

    expect($payment->status)->toBe('completed');
    expect($payment->provider_capture_id)->toBe('CAPTURE-789');
    expect($payment->subscription_id)->not->toBeNull();

    Http::assertSent(function ($request) {
        if ($request->url() !== 'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-456/capture') {
            return true;
        }

        return trim($request->body()) === '{}';
    });
});

test('seller can activate a free plan without paypal', function () {
    $seller = sellerUser();
    $freePlan = activePlan(['name' => 'Free', 'price' => 0]);

    $this->actingAs($seller)
        ->post(route('seller.plans.activate-free', $freePlan))
        ->assertRedirect();

    expect($seller->fresh()->activeSubscription()?->plan_id)->toBe($freePlan->id);
});

test('seller can view payment history with invoice data', function () {
    $seller = sellerUser();
    $plan = activePlan(['name' => 'Growth', 'price' => 49.99, 'gig_limit' => 50]);

    $subscription = Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $plan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    SubscriptionPayment::create([
        'user_id' => $seller->id,
        'plan_id' => $plan->id,
        'subscription_id' => $subscription->id,
        'provider' => 'paypal',
        'provider_order_id' => 'ORDER-999',
        'provider_capture_id' => 'CAPTURE-999',
        'amount' => 49.99,
        'currency' => 'USD',
        'status' => 'completed',
        'captured_at' => now(),
    ]);

    $this->actingAs($seller)
        ->get(route('seller.payments.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('seller/payments/index')
            ->where('payments.0.invoice_number', 'INV-CAPTURE-999')
            ->where('payments.0.plan.name', 'Growth')
            ->where('payments.0.subscription.status', 'active')
            ->where('seller.email', $seller->email));
});
