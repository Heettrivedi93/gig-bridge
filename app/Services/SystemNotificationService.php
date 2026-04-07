<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Notifications\SystemUserNotification;
use Illuminate\Support\Collection;

class SystemNotificationService
{
    public function __construct(
        private readonly NotificationPreferenceService $preferences,
        private readonly TrelloNotificationService $trello,
        private readonly TwilioNotificationService $twilio,
    ) {}

    public function orderPlaced(Order $order): void
    {
        $order->loadMissing(['buyer:id,name,phone', 'seller:id,name,email,phone', 'gig:id,title']);

        $this->notifyUsers(
            [$order->seller],
            'New order received',
            sprintf(
                '%s placed order #%d for %s.',
                $order->buyer?->name ?? 'A buyer',
                $order->id,
                $order->gig?->title ?? 'your gig',
            ),
            'orders',
            'order_placed',
            'order_placed',
            '/seller/orders',
        );

        $this->notifyTrello(
            'order_placed',
            sprintf('New order #%d placed', $order->id),
            sprintf(
                "Buyer: %s\nSeller: %s\nGig: %s\nOpen: %s",
                $order->buyer?->name ?? 'Buyer',
                $order->seller?->name ?? 'Seller',
                $order->gig?->title ?? 'Gig',
                url('/admin/orders'),
            ),
        );
    }

    public function orderDelivered(Order $order): void
    {
        $order->loadMissing(['buyer:id,name,phone', 'seller:id,name,phone', 'gig:id,title']);

        $this->notifyUsers(
            [$order->buyer],
            'Order delivered',
            sprintf(
                '%s delivered order #%d for %s.',
                $order->seller?->name ?? 'Your seller',
                $order->id,
                $order->gig?->title ?? 'your order',
            ),
            'orders',
            null,
            'order_delivered',
            '/buyer/orders',
        );

        $this->notifyTrello(
            'order_delivered',
            sprintf('Order #%d delivered', $order->id),
            sprintf(
                "Seller: %s\nGig: %s\nBuyer view: %s",
                $order->seller?->name ?? 'Seller',
                $order->gig?->title ?? 'Gig',
                url('/buyer/orders'),
            ),
        );
    }

    public function revisionRequested(Order $order): void
    {
        $order->loadMissing(['buyer:id,name,phone', 'seller:id,name,phone', 'gig:id,title']);

        $this->notifyUsers(
            [$order->seller],
            'Revision requested',
            sprintf(
                '%s requested a revision for order #%d.',
                $order->buyer?->name ?? 'Your buyer',
                $order->id,
            ),
            'orders',
            null,
            null,
            '/seller/orders',
        );
    }

    public function orderCompleted(Order $order): void
    {
        $order->loadMissing(['buyer:id,name,phone', 'seller:id,name,phone', 'gig:id,title']);

        $this->notifyUsers(
            [$order->seller],
            'Order completed',
            sprintf(
                '%s marked order #%d as completed.',
                $order->buyer?->name ?? 'Your buyer',
                $order->id,
            ),
            'orders',
            'order_completed',
            'order_completed',
            '/seller/orders',
        );

        $this->notifyTrello(
            'order_completed',
            sprintf('Order #%d completed', $order->id),
            sprintf(
                "Buyer: %s\nGig: %s\nAdmin view: %s",
                $order->buyer?->name ?? 'Buyer',
                $order->gig?->title ?? 'Gig',
                url('/admin/orders'),
            ),
        );
    }

    public function orderCancelledByBuyer(Order $order): void
    {
        $order->loadMissing(['buyer:id,name,phone', 'seller:id,name,phone']);

        $this->notifyUsers(
            [$order->seller],
            'Order cancelled',
            sprintf(
                '%s cancelled order #%d.',
                $order->buyer?->name ?? 'Your buyer',
                $order->id,
            ),
            'orders',
            'order_cancelled',
            'order_cancelled',
            '/seller/orders',
        );

        $this->notifyTrello(
            'order_cancelled',
            sprintf('Order #%d cancelled by buyer', $order->id),
            sprintf(
                "Buyer: %s\nSeller: %s\nAdmin view: %s",
                $order->buyer?->name ?? 'Buyer',
                $order->seller?->name ?? 'Seller',
                url('/admin/orders'),
            ),
        );
    }

    public function orderCancelledBySeller(Order $order): void
    {
        $order->loadMissing(['buyer:id,name,phone', 'seller:id,name,phone']);

        $this->notifyUsers(
            [$order->buyer],
            'Order cancelled',
            sprintf(
                '%s cancelled order #%d.',
                $order->seller?->name ?? 'Your seller',
                $order->id,
            ),
            'orders',
            'order_cancelled',
            'order_cancelled',
            '/buyer/orders',
        );

        $this->notifyTrello(
            'order_cancelled',
            sprintf('Order #%d cancelled by seller', $order->id),
            sprintf(
                "Buyer: %s\nSeller: %s\nAdmin view: %s",
                $order->buyer?->name ?? 'Buyer',
                $order->seller?->name ?? 'Seller',
                url('/admin/orders'),
            ),
        );
    }

    public function paymentReleased(Order $order): void
    {
        $order->loadMissing(['seller:id,name,phone', 'gig:id,title']);

        $this->notifyUsers(
            [$order->seller],
            'Payment released',
            sprintf(
                'Funds for order #%d%s are now available in your wallet.',
                $order->id,
                $order->gig?->title ? sprintf(' (%s)', $order->gig->title) : '',
            ),
            'payment_released',
            'payments',
            'payment_released',
            '/seller/wallet',
        );
    }

    public function registration(User $user): void
    {
        $this->notifyUsers(
            [$user],
            'Welcome to GigBridge',
            'Your account has been created successfully. You can now sign in and start using the platform.',
            null,
            'registration',
            'registration',
            '/dashboard',
        );

        $this->notifyTrello(
            'new_user_registrations',
            sprintf('New %s registration', $user->primaryRoleName() ?? 'user'),
            sprintf(
                "Name: %s\nEmail: %s\nRole: %s",
                $user->name,
                $user->email,
                $user->primaryRoleName() ?? 'user',
            ),
        );
    }

    /**
     * @param  array<int, User|null>  $users
     */
    private function notifyUsers(
        array $users,
        string $title,
        string $message,
        ?string $inAppEvent = null,
        ?string $emailEvent = null,
        ?string $twilioEvent = null,
        ?string $actionUrl = null,
    ): void {
        if (
            ! ($inAppEvent && $this->preferences->inAppEnabled() && $this->preferences->supportsInAppEvent($inAppEvent))
            && ! ($emailEvent && $this->preferences->emailEnabled() && $this->preferences->supportsEmailEvent($emailEvent))
            && ! ($twilioEvent && $this->preferences->twilioEnabled() && $this->preferences->supportsTwilioEvent($twilioEvent))
        ) {
            return;
        }

        Collection::make($users)
            ->filter(fn ($user) => $user instanceof User)
            ->unique('id')
            ->each(function (User $user) use ($title, $message, $inAppEvent, $emailEvent, $twilioEvent, $actionUrl) {
                if (
                    ($inAppEvent && $this->preferences->inAppEnabled() && $this->preferences->supportsInAppEvent($inAppEvent))
                    || ($emailEvent && $this->preferences->emailEnabled() && $this->preferences->supportsEmailEvent($emailEvent))
                ) {
                    $user->notify(new SystemUserNotification(
                        $title,
                        $message,
                        $inAppEvent,
                        $emailEvent,
                        $actionUrl,
                    ));
                }

                if ($twilioEvent && $this->preferences->twilioEnabled() && $this->preferences->supportsTwilioEvent($twilioEvent)) {
                    $this->twilio->send($user, $twilioEvent, $title, $message);
                }
            });
    }

    private function notifyTrello(string $event, string $title, string $description): void
    {
        $this->trello->send($event, $title, $description);
    }
}
