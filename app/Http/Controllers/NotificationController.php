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
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->get()
            ->map(fn ($notification) => [
                'id' => $notification->id,
                'title' => data_get($notification->data, 'title', 'Notification'),
                'message' => data_get($notification->data, 'message', ''),
                'event' => data_get($notification->data, 'event', ''),
                'action_url' => data_get($notification->data, 'action_url'),
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
        ]);
    }

    public function markAsRead(Request $request, string $notification): RedirectResponse
    {
        $record = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        if ($record->read_at === null) {
            $record->markAsRead();
        }

        return back()->with('success', 'Notification marked as read.');
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()
            ->unreadNotifications
            ->markAsRead();

        return back()->with('success', 'All notifications marked as read.');
    }
}
