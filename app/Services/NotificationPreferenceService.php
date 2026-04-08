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
        $events = $this->normalizedEmailEvents(
            Setting::getValue('notifications_email_events', $this->defaultEmailEvents())
        );

        $aliases = [
            'payment_released' => ['payment_released', 'payments'],
            'payments' => ['payment_released', 'payments'],
        ];

        $acceptedEvents = $aliases[$event] ?? [$event];

        return collect($acceptedEvents)->contains(
            fn (string $acceptedEvent) => in_array($acceptedEvent, $events, true)
        );
    }

    private function normalizedEmailEvents(mixed $events): array
    {
        if (! is_array($events) || $events === []) {
            return $this->defaultEmailEvents();
        }

        $normalized = array_values(array_unique(array_map(
            fn (mixed $event) => $event === 'payments' ? 'payment_released' : $event,
            array_filter($events, fn (mixed $event) => is_string($event) && $event !== '')
        )));

        $legacyOnlyEvents = ['messages', 'reviews', 'withdrawals', 'subscriptions'];
        $hasLegacySchema = collect($normalized)->contains(
            fn (string $event) => in_array($event, $legacyOnlyEvents, true)
        );

        if ($hasLegacySchema) {
            $normalized = array_values(array_unique([
                ...array_filter(
                    $normalized,
                    fn (string $event) => ! in_array($event, $legacyOnlyEvents, true)
                ),
                'messages',
                'order_delivered',
                'revision_requested',
                'payment_released',
            ]));
        }

        $hasAnyOrderEmailEnabled = collect($normalized)->contains(
            fn (string $event) => in_array($event, [
                'order_placed',
                'order_delivered',
                'revision_requested',
                'order_completed',
                'order_cancelled',
            ], true)
        );

        if ($hasAnyOrderEmailEnabled) {
            $normalized = array_values(array_unique([
                ...$normalized,
                'order_delivered',
                'revision_requested',
                'order_completed',
                'order_cancelled',
            ]));
        }

        return $normalized;
    }

    private function defaultEmailEvents(): array
    {
        return [
            'registration',
            'order_placed',
            'order_delivered',
            'revision_requested',
            'order_completed',
            'order_cancelled',
            'messages',
            'payment_released',
        ];
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

    public function twilioEnabled(): bool
    {
        return (bool) Setting::getValue('notifications_twilio_enabled', false);
    }

    public function supportsTwilioEvent(string $event): bool
    {
        $events = Setting::getValue('notifications_twilio_events', ['order_placed', 'payment_released']);

        return in_array($event, is_array($events) ? $events : [], true);
    }
}
