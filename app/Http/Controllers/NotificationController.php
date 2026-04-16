<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Mark all as read the moment the page is opened
        $user->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        $notifications = $user
            ->notifications()
            ->latest()
            ->get()
            ->map(fn ($notification) => [
                'id'         => $notification->id,
                'title'      => data_get($notification->data, 'title', 'Notification'),
                'message'    => data_get($notification->data, 'message', ''),
                'event'      => data_get($notification->data, 'event', ''),
                'action_url' => data_get($notification->data, 'action_url'),
                'read_at'    => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('notifications/index', [
            'notificationItems' => $notifications,
        ]);
    }

    public function markAsRead(Request $request, string $notification): RedirectResponse
    {
        $request->user()
            ->notifications()
            ->whereKey($notification)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }
}
