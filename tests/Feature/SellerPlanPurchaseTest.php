<?php

use App\Http\Controllers\SellerPlanController;
use App\Models\Category;
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

function sellerPlanCategoryTree(): array
{
    $parent = Category::create([
        'name' => 'Seller Plan Parent',
        'slug' => 'seller-plan-parent',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Seller Plan Child',
        'slug' => 'seller-plan-child',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
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
            ->where('plans.0.name', $plan->name)
            ->where('currentSubscription.plan_name', $plan->name)
            ->where('nextSubscription', null));
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

test('seller can capture paypal order and activate paid plan immediately when current plan is free', function () {
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

    $seller->refresh();
    $activeSubscription = $seller->activeSubscription();
    $upcomingSubscription = $seller->upcomingSubscription();

    expect($activeSubscription?->plan_id)->toBe($newPlan->id);
    expect($upcomingSubscription)->toBeNull();
    expect(
        Subscription::query()
            ->where('user_id', $seller->id)
            ->where('plan_id', $currentPlan->id)
            ->first()?->status
    )->toBe('replaced');

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

test('seller can capture paypal order and queue purchased plan after current paid subscription', function () {
    $seller = sellerUser();
    $currentPlan = activePlan(['name' => 'Standard', 'price' => 19.99, 'gig_limit' => 10]);
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
        'provider_order_id' => 'ORDER-PAID-456',
        'amount' => 49.99,
        'currency' => 'USD',
        'status' => 'created',
    ]);

    configurePaypal();

    Http::fake([
        'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
            'access_token' => 'sandbox-token',
        ]),
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-PAID-456/capture' => Http::response([
            'status' => 'COMPLETED',
            'purchase_units' => [
                [
                    'payments' => [
                        'captures' => [
                            ['id' => 'CAPTURE-PAID-789'],
                        ],
                    ],
                ],
            ],
        ]),
    ]);

    $this->actingAs($seller)
        ->postJson(route('seller.plans.paypal.capture', $newPlan), [
            'order_id' => 'ORDER-PAID-456',
        ])
        ->assertOk()
        ->assertJson([
            'status' => 'COMPLETED',
        ]);

    $seller->refresh();

    expect($seller->activeSubscription()?->plan_id)->toBe($currentPlan->id);
    expect($seller->upcomingSubscription()?->plan_id)->toBe($newPlan->id);
});

test('seller automatically falls back to the free plan when no active plan remains', function () {
    $seller = sellerUser();
    $freePlan = activePlan(['name' => 'Free', 'price' => 0]);

    $this->actingAs($seller)
        ->get(route('seller.plans.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('seller/plans/index')
            ->where('currentSubscription.plan_name', $freePlan->name));

    expect($seller->fresh()->activeSubscription()?->plan_id)->toBe($freePlan->id);
    expect($seller->fresh()->upcomingSubscription())->toBeNull();
});

test('future downgrade subscription does not become current before its start date', function () {
    $seller = sellerUser();
    $proPlan = activePlan(['name' => 'Pro', 'price' => 49.99, 'gig_limit' => 50]);
    $standardPlan = activePlan(['name' => 'Standard', 'price' => 19.99, 'gig_limit' => 10]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $proPlan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $standardPlan->id,
        'starts_at' => now()->addDays(30),
        'ends_at' => now()->addDays(60),
        'status' => 'active',
    ]);

    expect($seller->fresh()->activeSubscription()?->plan_id)->toBe($proPlan->id);
});

test('buying another plan replaces the previously queued next subscription', function () {
    $seller = sellerUser();
    $currentPlan = activePlan(['name' => 'Current', 'price' => 49.99, 'gig_limit' => 20]);
    $firstQueuedPlan = activePlan(['name' => 'First queued', 'price' => 29.99, 'gig_limit' => 15]);
    $secondQueuedPlan = activePlan(['name' => 'Second queued', 'price' => 19.99, 'gig_limit' => 10]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $currentPlan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $firstQueuedPlan->id,
        'starts_at' => now()->addDays(30),
        'ends_at' => now()->addDays(60),
        'status' => 'active',
    ]);

    $controller = app(SellerPlanController::class);
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('activatePlan');
    $method->setAccessible(true);
    $method->invoke($controller, $seller, $secondQueuedPlan, null);

    expect($seller->fresh()->activeSubscription()?->plan_id)->toBe($currentPlan->id);
    expect($seller->fresh()->upcomingSubscription()?->plan_id)->toBe($secondQueuedPlan->id);
    expect(
        Subscription::query()
            ->where('user_id', $seller->id)
            ->where('plan_id', $firstQueuedPlan->id)
            ->first()?->status
    )->toBe('replaced');
});

test('seller can activate queued higher plan early after reaching current gig limit', function () {
    $seller = sellerUser();
    $currentPlan = activePlan(['name' => 'Starter', 'price' => 19.99, 'gig_limit' => 1]);
    $nextPlan = activePlan(['name' => 'Growth', 'price' => 49.99, 'gig_limit' => 5]);
    [$parent, $child] = sellerPlanCategoryTree();

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $currentPlan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $nextPlan->id,
        'starts_at' => now()->addDays(30),
        'ends_at' => now()->addDays(60),
        'status' => 'active',
    ]);

    $seller->gigs()->create([
        'category_id' => $parent->id,
        'subcategory_id' => $child->id,
        'title' => 'Used capacity',
        'description' => 'Active gig to hit plan limit.',
        'tags' => ['test'],
        'status' => 'active',
    ]);

    $this->actingAs($seller)
        ->post(route('seller.plans.activate-next'))
        ->assertRedirect();

    $seller->refresh();

    expect($seller->activeSubscription()?->plan_id)->toBe($nextPlan->id);
    expect($seller->upcomingSubscription())->toBeNull();
});

test('seller cannot activate queued plan early before reaching current gig limit', function () {
    $seller = sellerUser();
    $currentPlan = activePlan(['name' => 'Starter', 'price' => 19.99, 'gig_limit' => 3]);
    $nextPlan = activePlan(['name' => 'Growth', 'price' => 49.99, 'gig_limit' => 5]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $currentPlan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);

    Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $nextPlan->id,
        'starts_at' => now()->addDays(30),
        'ends_at' => now()->addDays(60),
        'status' => 'active',
    ]);

    $this->actingAs($seller)
        ->post(route('seller.plans.activate-next'))
        ->assertSessionHasErrors('plan');
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
