<?php

namespace App\Notifications;

use App\Models\Setting;
use App\Models\User;
use App\Services\NotificationPreferenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SystemUserNotification extends Notification implements ShouldBroadcast
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

        if (
            $this->inAppEvent
            && $notifiable instanceof User
            && $preferences->userSupportsInAppEvent($notifiable, $this->inAppEvent)
        ) {
            $channels[] = 'database';
            $channels[] = 'broadcast';
        }

        if (
            $this->emailEvent
            && $notifiable instanceof User
            && $preferences->userSupportsEmailEvent($notifiable, $this->emailEvent)
            && filled($notifiable->email ?? null)
        ) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title'      => $this->title,
            'message'    => $this->message,
            'event'      => $this->inAppEvent ?? $this->emailEvent,
            'action_url' => $this->actionUrl,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'title'      => $this->title,
            'message'    => $this->message,
            'event'      => $this->inAppEvent ?? $this->emailEvent,
            'action_url' => $this->actionUrl,
        ]);
    }

    public function broadcastType(): string
    {
        return 'notification.received';
    }

    public function toMail(object $notifiable): MailMessage
    {
        $fromAddress  = (string) Setting::getValue('email_from_address', config('mail.from.address'));
        $fromName     = (string) Setting::getValue('email_from_name', config('mail.from.name'));
        $siteName     = (string) Setting::getValue('brand_site_name', 'GigBridge') ?: 'GigBridge';
        $contactEmail = (string) Setting::getValue('brand_contact_email', '');
        $contactPhone = (string) Setting::getValue('brand_contact_phone', '');

        $mail = (new MailMessage)
            ->from($fromAddress ?: config('mail.from.address'), $fromName ?: config('mail.from.name'))
            ->subject($this->title)
            ->greeting(sprintf('Hello %s,', $notifiable->name ?? 'there'))
            ->line($this->message);

        if ($this->actionUrl) {
            $mail->action('Open in ' . $siteName, url($this->actionUrl));
        }

        $mail->line('Thank you for using ' . $siteName . '.');

        if ($contactEmail || $contactPhone) {
            $parts = array_filter([$contactEmail, $contactPhone]);
            $mail->line('Need help? Contact us: ' . implode(' | ', $parts));
        }

        return $mail;
    }
}
