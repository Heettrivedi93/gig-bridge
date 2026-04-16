<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationPreferenceService
{
    public function userPreferences(User $user): array
    {
        $user = $this->userWithPreferences($user);

        $stored = is_array($user->notification_preferences ?? null)
            ? $user->notification_preferences
            : [];

        return [
            'email_enabled' => (bool) ($stored['email_enabled'] ?? true),
            'email_events' => $this->normalizedUserEmailEvents(
                $stored['email_events'] ?? $this->defaultUserEmailEvents($user),
                $user,
            ),
            'in_app_enabled' => (bool) ($stored['in_app_enabled'] ?? true),
            'in_app_events' => $this->normalizedInAppEvents(
                $stored['in_app_events'] ?? $this->defaultUserInAppEvents($user),
                $user,
            ),
            'twilio_enabled' => (bool) ($stored['twilio_enabled'] ?? true),
            'twilio_events' => $this->normalizedTwilioEvents(
                $stored['twilio_events'] ?? $this->defaultUserTwilioEvents($user),
                $user,
            ),
        ];
    }

    public function updateUserPreferences(User $user, array $preferences): void
    {
        $user->forceFill([
            'notification_preferences' => [
                'email_enabled' => (bool) ($preferences['email_enabled'] ?? true),
                'email_events' => $this->normalizedUserEmailEvents(
                    $preferences['email_events'] ?? [],
                    $user,
                ),
                'in_app_enabled' => (bool) ($preferences['in_app_enabled'] ?? true),
                'in_app_events' => $this->normalizedInAppEvents(
                    $preferences['in_app_events'] ?? [],
                    $user,
                ),
                'twilio_enabled' => (bool) ($preferences['twilio_enabled'] ?? true),
                'twilio_events' => $this->normalizedTwilioEvents(
                    $preferences['twilio_events'] ?? [],
                    $user,
                ),
            ],
        ])->save();
    }

    public function userEventOptions(User $user): array
    {
        $roleKeys = $this->resolvedNotificationRoleKeys($user);
        $emailOptions = collect();
        $inAppOptions = collect();
        $twilioOptions = collect();

        foreach ($roleKeys as $roleKey) {
            $definition = $this->roleEventDefinitions()[$roleKey] ?? [];
            $emailOptions = $emailOptions->merge($definition['email'] ?? []);
            $inAppOptions = $inAppOptions->merge($definition['in_app'] ?? []);
            $twilioOptions = $twilioOptions->merge($definition['twilio'] ?? []);
        }

        return [
            'email' => $this->uniqueEventOptions($emailOptions),
            'in_app' => $this->uniqueEventOptions($inAppOptions),
            'twilio' => $this->uniqueEventOptions($twilioOptions),
        ];
    }

    public function emailEnabled(): bool
    {
        return (bool) Setting::getValue('notifications_email_enabled', true);
    }

    public function supportsEmailEvent(string $event): bool
    {
        $events = $this->normalizedEmailEvents(
            Setting::getValue('notifications_email_events', $this->defaultEmailEvents())
        );

        return in_array($event, $events, true);
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

    public function userEmailEnabled(User $user): bool
    {
        return $this->emailEnabled() && $this->userPreferences($user)['email_enabled'];
    }

    public function userSupportsEmailEvent(User $user, string $event): bool
    {
        if (! $this->userEmailEnabled($user)) {
            return false;
        }

        return in_array($event, $this->userPreferences($user)['email_events'], true);
    }

    public function userInAppEnabled(User $user): bool
    {
        return $this->inAppEnabled() && $this->userPreferences($user)['in_app_enabled'];
    }

    public function userSupportsInAppEvent(User $user, string $event): bool
    {
        return $this->userInAppEnabled($user)
            && in_array($event, $this->userPreferences($user)['in_app_events'], true);
    }

    public function userTwilioEnabled(User $user): bool
    {
        return $this->twilioEnabled() && $this->userPreferences($user)['twilio_enabled'];
    }

    public function userSupportsTwilioEvent(User $user, string $event): bool
    {
        return $this->userTwilioEnabled($user)
            && $this->supportsTwilioEvent($event)
            && in_array($event, $this->userPreferences($user)['twilio_events'], true);
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

        $allowed = [
            'registration',
            'order_placed',
            'order_delivered',
            'order_completed',
            'order_cancelled',
        ];

        return array_values(array_unique(array_filter(
            $normalized,
            fn (string $event) => in_array($event, $allowed, true)
        )));
    }

    private function normalizedInAppEvents(mixed $events, User $user): array
    {
        if (! is_array($events)) {
            return $this->defaultUserInAppEvents($user);
        }

        $allowed = $this->eventOptionKeys('in_app', $user);

        return array_values(array_unique(array_filter(
            $events,
            fn (mixed $event) => is_string($event) && in_array($event, $allowed, true)
        )));
    }

    private function normalizedUserEmailEvents(mixed $events, User $user): array
    {
        if (! is_array($events)) {
            return $this->defaultUserEmailEvents($user);
        }

        $allowed = $this->eventOptionKeys('email', $user);
        $normalized = array_values(array_unique(array_map(
            fn (mixed $event) => $event === 'payments' ? 'payment_released' : $event,
            array_filter(
                $events,
                fn (mixed $event) => is_string($event) && in_array($event === 'payments' ? 'payment_released' : $event, $allowed, true)
            )
        )));

        return $normalized;
    }

    private function normalizedTwilioEvents(mixed $events, User $user): array
    {
        if (! is_array($events)) {
            return $this->defaultUserTwilioEvents($user);
        }

        $allowed = $this->eventOptionKeys('twilio', $user);

        return array_values(array_unique(array_filter(
            $events,
            fn (mixed $event) => is_string($event) && in_array($event, $allowed, true)
        )));
    }

    private function defaultEmailEvents(): array
    {
        return [
            'registration',
            'order_placed',
            'order_delivered',
            'order_completed',
            'order_cancelled',
        ];
    }

    private function eventOptionKeys(string $channel, User $user): array
    {
        return Collection::make($this->userEventOptions($user)[$channel] ?? [])
            ->pluck('key')
            ->all();
    }

    private function userWithPreferences(User $user): User
    {
        if (array_key_exists('notification_preferences', $user->getAttributes())) {
            return $user;
        }

        return $user->newQuery()
            ->whereKey($user->getKey())
            ->first() ?? $user;
    }

    private function defaultUserEmailEvents(User $user): array
    {
        return $this->eventOptionKeys('email', $user);
    }

    private function defaultUserInAppEvents(User $user): array
    {
        return $this->eventOptionKeys('in_app', $user);
    }

    private function defaultUserTwilioEvents(User $user): array
    {
        return $this->eventOptionKeys('twilio', $user);
    }

    private function resolvedNotificationRoleKeys(User $user): array
    {
        $roleNames = $user->getRoleNames()->map(fn (string $role) => strtolower($role))->all();
        $roleKeys = array_values(array_intersect($roleNames, ['buyer', 'seller']));

        if ($roleKeys !== []) {
            return $roleKeys;
        }

        return ['default'];
    }

    private function roleEventDefinitions(): array
    {
        return [
            'default' => [
                'email' => [
                    ['key' => 'registration', 'label' => 'Registration'],
                ],
                'in_app' => [
                    ['key' => 'messages', 'label' => 'Messages'],
                ],
                'twilio' => [],
            ],
            'buyer' => [
                'email' => [
                    ['key' => 'registration',    'label' => 'Registration'],
                    ['key' => 'order_delivered', 'label' => 'Order delivered'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ],
                'in_app' => [
                    ['key' => 'orders',   'label' => 'Order updates'],
                    ['key' => 'messages', 'label' => 'Messages'],
                ],
                'twilio' => [
                    ['key' => 'order_delivered', 'label' => 'Order delivered'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ],
            ],
            'seller' => [
                'email' => [
                    ['key' => 'registration',    'label' => 'Registration'],
                    ['key' => 'order_placed',    'label' => 'New order received'],
                    ['key' => 'order_completed', 'label' => 'Order completed'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ],
                'in_app' => [
                    ['key' => 'orders',           'label' => 'Order updates'],
                    ['key' => 'messages',         'label' => 'Messages'],
                    ['key' => 'reviews',          'label' => 'Reviews'],
                    ['key' => 'payment_released', 'label' => 'Payment released'],
                ],
                'twilio' => [
                    ['key' => 'order_placed',    'label' => 'New order received'],
                    ['key' => 'order_delivered', 'label' => 'Order delivered'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                    ['key' => 'payment_released','label' => 'Payment released'],
                ],
            ],
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array{key: string, label: string}>  $options
     * @return array<int, array{key: string, label: string}>
     */
    private function uniqueEventOptions(Collection $options): array
    {
        return $options
            ->unique('key')
            ->values()
            ->all();
    }
}
