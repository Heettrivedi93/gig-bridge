<?php

namespace App\Notifications;

use App\Services\NotificationPreferenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SystemUserNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $title,
        private readonly string $message,
        private readonly ?string $inAppEvent = null,
        private readonly ?string $emailEvent = null,
        private readonly ?string $actionUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        $preferences = app(NotificationPreferenceService::class);
        $channels = [];

        if ($this->inAppEvent && $preferences->inAppEnabled() && $preferences->supportsInAppEvent($this->inAppEvent)) {
            $channels[] = 'database';
        }

        if (
            $this->emailEvent
            && $preferences->emailEnabled()
            && $preferences->supportsEmailEvent($this->emailEvent)
            && filled($notifiable->email ?? null)
        ) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'event' => $this->inAppEvent ?? $this->emailEvent,
            'action_url' => $this->actionUrl,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title)
            ->greeting(sprintf('Hello %s,', $notifiable->name ?? 'there'))
            ->line($this->message);

        if ($this->actionUrl) {
            $mail->action('Open in GigBridge', url($this->actionUrl));
        }

        return $mail->line('Thank you for using GigBridge.');
    }
}
