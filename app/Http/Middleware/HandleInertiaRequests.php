<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $inAppNotificationsEnabled = (bool) Setting::getValue('notifications_in_app_enabled', true);
        $notifications = $user && $inAppNotificationsEnabled
            ? $user->notifications()
                ->latest()
                ->limit(8)
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
                ->values()
            : collect();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'flash' => [
                'nonce' => $request->session()->get('flash_nonce'),
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->effectivePortalPermissions(),
                    'avatar' => $user->profile_picture
                        ? Storage::disk('public')->url($user->profile_picture)
                        : null,
                ]) : null,
            ],
            'notifications' => [
                'enabled' => $inAppNotificationsEnabled,
                'items' => $notifications,
                'unread_count' => $user && $inAppNotificationsEnabled ? $user->unreadNotifications()->count() : 0,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
