<?php

use App\Models\Announcement;
use App\Models\User;
use Spatie\Permission\Models\Role;

function ensureDashboardAnnouncementRole(string $name): Role
{
    return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
}

function buyerAnnouncementUser(): User
{
    $user = User::factory()->create(['status' => 'active']);
    $user->assignRole(ensureDashboardAnnouncementRole('buyer'));

    return $user;
}

function sellerAnnouncementUser(): User
{
    $user = User::factory()->create(['status' => 'active']);
    $user->assignRole(ensureDashboardAnnouncementRole('seller'));

    return $user;
}

test('dashboard only shows active announcements matching the user audience', function () {
    $buyer = buyerAnnouncementUser();
    $seller = sellerAnnouncementUser();

    Announcement::create([
        'message' => 'Seller-only release note',
        'audience' => 'sellers',
        'status' => 'active',
        'expires_at' => now()->addDay(),
    ]);

    Announcement::create([
        'message' => 'Expired buyer notice',
        'audience' => 'buyers',
        'status' => 'active',
        'expires_at' => now()->subMinute(),
    ]);

    Announcement::create([
        'message' => 'Inactive buyer notice',
        'audience' => 'buyers',
        'status' => 'inactive',
        'expires_at' => now()->addDay(),
    ]);

    $matchingAnnouncement = Announcement::create([
        'message' => 'Buyer maintenance starts at midnight.',
        'audience' => 'buyers',
        'status' => 'active',
        'expires_at' => now()->addDay(),
    ]);

    $this->actingAs($buyer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('announcement.id', $matchingAnnouncement->id)
            ->where('announcement.message', 'Buyer maintenance starts at midnight.')
            ->where('announcement.audience', 'buyers'));

    $this->actingAs($seller)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('announcement.message', 'Seller-only release note')
            ->where('announcement.audience', 'sellers'));
});

test('users can dismiss dashboard announcements', function () {
    $buyer = buyerAnnouncementUser();
    $announcement = Announcement::create([
        'message' => 'Policy update for all users.',
        'audience' => 'all',
        'status' => 'active',
        'expires_at' => now()->addDay(),
    ]);

    $this->actingAs($buyer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('announcement.id', $announcement->id));

    $this->actingAs($buyer)
        ->post(route('announcements.dismiss', $announcement))
        ->assertRedirect();

    $this->assertDatabaseHas('announcement_dismissals', [
        'announcement_id' => $announcement->id,
        'user_id' => $buyer->id,
    ]);

    $this->actingAs($buyer)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('announcement', null));
});
