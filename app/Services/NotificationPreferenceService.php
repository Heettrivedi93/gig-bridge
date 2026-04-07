<?php

namespace App\Services;

use App\Models\Setting;

class NotificationPreferenceService
{
    public function emailEnabled(): bool
    {
        return (bool) Setting::getValue('notifications_email_enabled', true);
    }

    public function supportsEmailEvent(string $event): bool
    {
        $events = Setting::getValue('notifications_email_events', ['registration', 'order_placed', 'order_completed', 'order_cancelled', 'payments']);

        return in_array($event, is_array($events) ? $events : [], true);
    }

    public function inAppEnabled(): bool
    {
        return (bool) Setting::getValue('notifications_in_app_enabled', true);
    }

    public function supportsInAppEvent(string $event): bool
    {
        $events = Setting::getValue('notifications_in_app_events', ['orders', 'payment_released']);

        return in_array($event, is_array($events) ? $events : [], true);
    }
}
