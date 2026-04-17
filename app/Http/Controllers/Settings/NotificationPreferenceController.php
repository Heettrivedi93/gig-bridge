<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\NotificationPreferenceUpdateRequest;
use App\Services\NotificationPreferenceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationPreferenceController extends Controller
{
    public function __construct(
        private readonly NotificationPreferenceService $preferences,
    ) {}

    public function edit(Request $request): Response|RedirectResponse
    {
        if ($request->user()?->hasRole('super_admin')) {
            return to_route('profile.edit')
                ->with('info', 'Notification preferences are available for buyer and seller accounts only.');
        }

        return Inertia::render('settings/notifications', [
            'preferences' => $this->preferences->userPreferences($request->user()),
            'eventOptions' => $this->preferences->userEventOptions($request->user()),
            'has_phone' => filled($request->user()?->phone),
        ]);
    }

    public function update(NotificationPreferenceUpdateRequest $request): RedirectResponse
    {
        if ($request->user()?->hasRole('super_admin')) {
            return to_route('profile.edit')
                ->with('info', 'Notification preferences are available for buyer and seller accounts only.');
        }

        $this->preferences->updateUserPreferences($request->user(), $request->validated());

        return to_route('notification-preferences.edit')
            ->with('success', 'Notification preferences updated successfully.');
    }
}
