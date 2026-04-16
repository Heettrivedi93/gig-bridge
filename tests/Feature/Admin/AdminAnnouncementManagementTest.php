<?php

use App\Models\Announcement;
use App\Models\User;
use Spatie\Permission\Models\Role;

function ensureAnnouncementRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function announcementAdmin(): User
{
    $user = User::factory()->create(['status' => 'active']);
    $user->assignRole(ensureAnnouncementRole('super_admin'));

    return $user;
}

test('super admin can create and view announcements', function () {
    $admin = announcementAdmin();

    $this->actingAs($admin)
        ->get(route('admin.announcements.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/announcements/index')
            ->where('announcements', []));

    $this->actingAs($admin)
        ->post(route('admin.announcements.store'), [
            'message' => 'Buyer checkout maintenance starts tonight at 11 PM UTC.',
            'audience' => 'buyers',
            'status' => 'active',
            'expires_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertRedirect();

    $announcement = Announcement::first();

    expect($announcement)->not->toBeNull();
    expect($announcement->message)->toBe('Buyer checkout maintenance starts tonight at 11 PM UTC.');
    expect($announcement->audience)->toBe('buyers');
    expect($announcement->status)->toBe('active');
    expect($announcement->created_by)->toBe($admin->id);

    $this->actingAs($admin)
        ->get(route('admin.announcements.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/announcements/index')
            ->where('announcements.0.message', 'Buyer checkout maintenance starts tonight at 11 PM UTC.')
            ->where('announcements.0.audience', 'buyers')
            ->where('announcements.0.status', 'active'));
});
