<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();
    Storage::fake('public');

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'bio' => 'Laravel developer and marketplace seller.',
            'phone' => '+1 555 200 3000',
            'profile_picture' => UploadedFile::fake()->image('avatar.jpg', 300, 300),
            'skills' => 'Laravel, React, Support',
            'location' => 'Lahore, Pakistan',
            'website' => 'https://example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->bio)->toBe('Laravel developer and marketplace seller.');
    expect($user->phone)->toBe('+1 555 200 3000');
    expect($user->skills)->toBe('Laravel, React, Support');
    expect($user->location)->toBe('Lahore, Pakistan');
    expect($user->website)->toBe('https://example.com');
    expect($user->profile_picture)->not->toBeNull();
    expect($user->email_verified_at)->toBeNull();

    Storage::disk('public')->assertExists($user->profile_picture);
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('profile picture can be removed', function () {
    Storage::fake('public');

    $path = UploadedFile::fake()->image('existing-avatar.jpg')->store('profile-pictures', 'public');

    $user = User::factory()->create([
        'profile_picture' => $path,
    ]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'remove_profile_picture' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh()->profile_picture)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
