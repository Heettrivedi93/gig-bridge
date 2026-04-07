<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\Category;
use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\SystemUserNotification;
use App\Services\MailConfigurationService;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

function ensureEmailNotificationRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function emailNotificationUser(string $role): User
{
    $user = User::factory()->create([
        'status' => 'active',
    ]);
    $user->assignRole(ensureEmailNotificationRole($role));

    return $user;
}

function emailNotificationCategory(): array
{
    $parent = Category::create([
        'name' => 'Email Design',
        'slug' => 'email-design',
        'status' => 'active',
    ]);

    $child = Category::create([
        'name' => 'Email Logo Design',
        'slug' => 'email-logo-design',
        'parent_id' => $parent->id,
        'status' => 'active',
    ]);

    return [$parent, $child];
}

function emailNotificationGig(User $seller, Category $category, Category $subcategory): Gig
{
    $gig = Gig::create([
        'user_id' => $seller->id,
        'category_id' => $category->id,
        'subcategory_id' => $subcategory->id,
        'title' => 'Email Notification Gig',
        'description' => 'Used for email notification tests.',
        'tags' => ['email'],
        'status' => 'active',
    ]);

    GigPackage::create([
        'gig_id' => $gig->id,
        'tier' => 'basic',
        'title' => 'Basic package',
        'description' => 'Package details',
        'price' => 80,
        'delivery_days' => 3,
        'revision_count' => 2,
    ]);

    return $gig;
}

test('runtime mail configuration is loaded from super admin settings', function () {
    Setting::setMany([
        'email_driver' => 'smtp',
        'email_host' => 'smtp.example.com',
        'email_port' => '587',
        'email_username' => 'mailer@example.com',
        'email_password' => 'secret-value',
        'email_encryption' => 'tls',
        'email_from_address' => 'hello@example.com',
        'email_from_name' => 'GigBridge Mail',
    ]);

    app(MailConfigurationService::class)->apply();

    expect(config('mail.default'))->toBe('smtp');
    expect(config('mail.mailers.smtp.host'))->toBe('smtp.example.com');
    expect(config('mail.mailers.smtp.port'))->toBe(587);
    expect(config('mail.mailers.smtp.username'))->toBe('mailer@example.com');
    expect(config('mail.mailers.smtp.password'))->toBe('secret-value');
    expect(config('mail.mailers.smtp.scheme'))->toBeNull();
    expect(config('mail.from.address'))->toBe('hello@example.com');
    expect(config('mail.from.name'))->toBe('GigBridge Mail');
});

test('registration email notification respects super admin email settings', function () {
    Notification::fake();

    ensureEmailNotificationRole('buyer');

    Setting::setValue('notifications_email_enabled', true);
    Setting::setValue('notifications_email_events', ['registration']);
    Setting::setValue('notifications_in_app_enabled', false);

    $user = app(CreateNewUser::class)->create([
        'name' => 'Buyer Email Test',
        'email' => 'buyer-email@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'buyer',
    ]);

    Notification::assertSentTo(
        $user,
        SystemUserNotification::class,
        fn (SystemUserNotification $notification, array $channels) => in_array('mail', $channels, true)
    );
});

test('order placed email notification is sent when enabled', function () {
    Notification::fake();

    Setting::setValue('notifications_email_enabled', true);
    Setting::setValue('notifications_email_events', ['order_placed']);
    Setting::setValue('notifications_in_app_enabled', false);

    [$category, $subcategory] = emailNotificationCategory();
    $seller = emailNotificationUser('seller');
    $buyer = emailNotificationUser('buyer');
    $gig = emailNotificationGig($seller, $category, $subcategory);
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

    Notification::assertSentTo(
        $seller,
        SystemUserNotification::class,
        fn (SystemUserNotification $notification, array $channels) => in_array('mail', $channels, true)
    );
});

test('email notification is skipped when email notifications are disabled', function () {
    Notification::fake();

    Setting::setValue('notifications_email_enabled', false);
    Setting::setValue('notifications_email_events', ['order_placed']);
    Setting::setValue('notifications_in_app_enabled', false);

    [$category, $subcategory] = emailNotificationCategory();
    $seller = emailNotificationUser('seller');
    $buyer = emailNotificationUser('buyer');
    $gig = emailNotificationGig($seller, $category, $subcategory);
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

    Notification::assertNothingSent();
});
