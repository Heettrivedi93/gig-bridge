<?php

use App\Models\Category;
use App\Models\Gig;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

function ensureRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function makeSeller(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureRole('seller'));

    return $user;
}

function makeBuyer(): User
{
    $user = User::factory()->create();
    $user->assignRole(ensureRole('buyer'));

    return $user;
}

function makeCategoryTree(): array
{
    $parent = Category::create([
        'name' => 'Design',
        'slug' => 'design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Landing Pages',
        'slug' => 'landing-pages',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function makeActiveSubscription(User $seller, int $gigLimit = 3): Subscription
{
    $plan = Plan::create([
        'name' => "Seller Plan {$gigLimit}",
        'price' => 0,
        'duration_days' => 30,
        'gig_limit' => $gigLimit,
        'features' => [],
        'status' => 'active',
    ]);

    return Subscription::create([
        'user_id' => $seller->id,
        'plan_id' => $plan->id,
        'starts_at' => now(),
        'ends_at' => now()->addDays(30),
        'status' => 'active',
    ]);
}

function gigPayload(Category $parent, Category $child, array $overrides = []): array
{
    return array_replace_recursive([
        'title' => 'Modern Landing Page Design',
        'description' => 'I will design and deliver a polished landing page.',
        'category_id' => $parent->id,
        'subcategory_id' => $child->id,
        'tags' => 'figma, ui, web',
        'status' => 'active',
        'images' => [
            UploadedFile::fake()->image('gig-cover-1.jpg'),
            UploadedFile::fake()->image('gig-cover-2.jpg'),
        ],
        'packages' => [
            'basic' => [
                'title' => 'Starter',
                'description' => 'Simple one-section page',
                'price' => '50',
                'delivery_days' => '2',
                'revision_count' => '1',
            ],
            'standard' => [
                'title' => 'Growth',
                'description' => 'Full landing page with supporting sections',
                'price' => '120',
                'delivery_days' => '4',
                'revision_count' => '2',
            ],
            'premium' => [
                'title' => 'Scale',
                'description' => 'Premium landing page and conversion polish',
                'price' => '220',
                'delivery_days' => '6',
                'revision_count' => '4',
            ],
        ],
    ], $overrides);
}

test('seller can create a gig with packages and images', function () {
    Storage::fake('public');

    $seller = makeSeller();
    [$parent, $child] = makeCategoryTree();
    makeActiveSubscription($seller, 3);

    $response = $this
        ->actingAs($seller)
        ->post(route('seller.gigs.store'), gigPayload($parent, $child));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $gig = Gig::query()->with(['packages', 'images'])->first();

    expect($gig)->not->toBeNull();
    expect($gig->title)->toBe('Modern Landing Page Design');
    expect($gig->status)->toBe('active');
    expect($gig->tags)->toBe(['figma', 'ui', 'web']);
    expect($gig->packages)->toHaveCount(3);
    expect($gig->images)->toHaveCount(2);

    foreach ($gig->images as $image) {
        Storage::disk('public')->assertExists($image->path);
    }
});

test('seller can update a gig and deactivate it', function () {
    Storage::fake('public');

    $seller = makeSeller();
    [$parent, $child] = makeCategoryTree();
    makeActiveSubscription($seller, 3);

    $this->actingAs($seller)->post(route('seller.gigs.store'), gigPayload($parent, $child));
    $gig = Gig::query()->with('images')->firstOrFail();
    $payload = gigPayload($parent, $child, [
        'title' => 'Updated gig title',
        'status' => 'inactive',
        'remove_image_ids' => [$gig->images->first()->id],
    ]);
    $payload['images'] = [UploadedFile::fake()->image('replacement.jpg')];

    $response = $this
        ->actingAs($seller)
        ->post(route('seller.gigs.update', $gig).'?_method=PUT', $payload);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $gig->refresh();

    expect($gig->title)->toBe('Updated gig title');
    expect($gig->status)->toBe('inactive');
    expect($gig->images()->count())->toBe(2);
});

test('seller cannot activate more gigs than the active subscription allows', function () {
    Storage::fake('public');

    $seller = makeSeller();
    [$parent, $child] = makeCategoryTree();
    makeActiveSubscription($seller, 1);

    $this->actingAs($seller)->post(route('seller.gigs.store'), gigPayload($parent, $child));

    $response = $this
        ->actingAs($seller)
        ->from(route('seller.gigs.index'))
        ->post(route('seller.gigs.store'), gigPayload($parent, $child, [
            'title' => 'Second active gig',
        ]));

    $response
        ->assertSessionHasErrors('status')
        ->assertRedirect(route('seller.gigs.index'));

    expect(Gig::query()->count())->toBe(1);
});

test('seller keeps current gig limit until a future downgrade subscription starts', function () {
    Storage::fake('public');

    $seller = makeSeller();
    [$parent, $child] = makeCategoryTree();
    $proPlan = Plan::create([
        'name' => 'Pro plan',
        'price' => 49.99,
        'duration_days' => 30,
        'gig_limit' => 50,
        'features' => [],
        'status' => 'active',
    ]);
    $standardPlan = Plan::create([
        'name' => 'Standard plan',
        'price' => 19.99,
        'duration_days' => 30,
        'gig_limit' => 10,
        'features' => [],
        'status' => 'active',
    ]);

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

    $this->actingAs($seller)
        ->post(route('seller.gigs.store'), gigPayload($parent, $child, [
            'title' => 'Gig under current higher plan',
        ]))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(Gig::query()->count())->toBe(1);
});

test('buyer cannot access seller gig management', function () {
    $buyer = makeBuyer();

    $this->actingAs($buyer)
        ->get(route('seller.gigs.index'))
        ->assertForbidden();
});
