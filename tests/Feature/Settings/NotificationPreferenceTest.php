<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function ensureNotificationPreferenceRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

test('notification preferences page is displayed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('notification-preferences.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/notifications')
            ->where('preferences.email_enabled', true)
            ->where('preferences.in_app_enabled', true)
            ->where('preferences.twilio_enabled', true)
            ->has('eventOptions.email')
            ->has('eventOptions.in_app')
            ->has('eventOptions.twilio'),
        );
});

test('seller sees seller specific notification events', function () {
    $user = User::factory()->create();
    $user->assignRole(ensureNotificationPreferenceRole('seller'));

    $this->actingAs($user)
        ->get(route('notification-preferences.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/notifications')
            ->where('eventOptions.email', [
                ['key' => 'registration', 'label' => 'Registration'],
                ['key' => 'order_placed', 'label' => 'New order received'],
                ['key' => 'revision_requested', 'label' => 'Revision requested'],
                ['key' => 'order_completed', 'label' => 'Order completed'],
                ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ['key' => 'messages', 'label' => 'Messages'],
                ['key' => 'payment_released', 'label' => 'Payment released'],
            ])
            ->where('eventOptions.in_app', [
                ['key' => 'orders', 'label' => 'Order updates'],
                ['key' => 'messages', 'label' => 'Messages'],
                ['key' => 'payment_released', 'label' => 'Payment released'],
            ])
            ->where('eventOptions.twilio', [
                ['key' => 'registration', 'label' => 'Registration'],
                ['key' => 'order_placed', 'label' => 'New order received'],
                ['key' => 'order_completed', 'label' => 'Order completed'],
                ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ['key' => 'payment_released', 'label' => 'Payment released'],
            ]),
        );
});

test('buyer sees buyer specific notification events', function () {
    $user = User::factory()->create();
    $user->assignRole(ensureNotificationPreferenceRole('buyer'));

    $this->actingAs($user)
        ->get(route('notification-preferences.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/notifications')
            ->where('eventOptions.email', [
                ['key' => 'registration', 'label' => 'Registration'],
                ['key' => 'order_delivered', 'label' => 'Order delivered'],
                ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ['key' => 'messages', 'label' => 'Messages'],
            ])
            ->where('eventOptions.in_app', [
                ['key' => 'orders', 'label' => 'Order updates'],
                ['key' => 'messages', 'label' => 'Messages'],
            ])
            ->where('eventOptions.twilio', [
                ['key' => 'registration', 'label' => 'Registration'],
                ['key' => 'order_delivered', 'label' => 'Order delivered'],
                ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
            ]),
        );
});

test('super admin is redirected away from notification preferences', function () {
    $user = User::factory()->create();
    $user->assignRole(ensureNotificationPreferenceRole('super_admin'));

    $this->actingAs($user)
        ->get(route('notification-preferences.edit'))
        ->assertRedirect(route('profile.edit'));
});

test('notification preferences can be updated', function () {
    $user = User::factory()->create();
    $user->assignRole(ensureNotificationPreferenceRole('seller'));

    $this->actingAs($user)
        ->put(route('notification-preferences.update'), [
            'email_enabled' => true,
            'email_events' => ['messages', 'payment_released'],
            'in_app_enabled' => false,
            'in_app_events' => [],
            'twilio_enabled' => true,
            'twilio_events' => ['order_placed', 'payment_released'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('notification-preferences.edit'));

    expect($user->fresh()->notification_preferences)->toBe([
        'email_enabled' => true,
        'email_events' => ['messages', 'payment_released'],
        'in_app_enabled' => false,
        'in_app_events' => [],
        'twilio_enabled' => true,
        'twilio_events' => ['order_placed', 'payment_released'],
    ]);
});

test('unsupported notification events are removed for the current user role', function () {
    $user = User::factory()->create();
    $user->assignRole(ensureNotificationPreferenceRole('buyer'));

    $this->actingAs($user)
        ->put(route('notification-preferences.update'), [
            'email_enabled' => true,
            'email_events' => ['order_placed', 'messages', 'payment_released'],
            'in_app_enabled' => true,
            'in_app_events' => ['orders', 'messages', 'payment_released'],
            'twilio_enabled' => true,
            'twilio_events' => ['order_placed', 'order_delivered', 'order_cancelled'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('notification-preferences.edit'));

    expect($user->fresh()->notification_preferences)->toBe([
        'email_enabled' => true,
        'email_events' => ['messages'],
        'in_app_enabled' => true,
        'in_app_events' => ['orders', 'messages'],
        'twilio_enabled' => true,
        'twilio_events' => ['order_delivered', 'order_cancelled'],
    ]);
});
