<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use App\Notifications\SystemUserNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TwilioNotificationService
{
    public function __construct(
        private readonly NotificationPreferenceService $preferences,
    ) {}

    public function send(User $user, string $event, string $title, string $message): void
    {
        if (! $this->isEnabled($event, $user)) {
            // Twilio is configured and the event is enabled, but the user has no phone number.
            // Notify them in-app so they know the SMS was not sent.
            if ($this->isEnabledExceptPhone($event, $user)) {
                try {
                    $user->notify(new SystemUserNotification(
                        'SMS notification not sent',
                        'Your SMS notification for "' . $title . '" could not be delivered because your phone number is not set. Please add your mobile number in your profile settings to receive SMS notifications.',
                        'orders',
                        null,
                        '/settings/profile',
                    ));
                } catch (Throwable $e) {
                    Log::warning('Failed to send missing-phone in-app notice.', ['user_id' => $user->id, 'message' => $e->getMessage()]);
                }
            }

            return;
        }

        $accountSid = (string) Setting::getValue('twilio_account_sid', '');
        $authToken = (string) Setting::getValue('twilio_auth_token', '');
        $fromNumber = (string) Setting::getValue('twilio_from_number', '');
        $toNumber = (string) $user->phone;
        $body = trim($title."\n".$message);

        Log::info('Sending Twilio notification request.', [
            'event' => $event,
            'user_id' => $user->id,
            'from' => $fromNumber,
            'to' => $toNumber,
            'account_sid_suffix' => substr($accountSid, -6),
        ]);

        try {
            $response = Http::asForm()
                ->withBasicAuth($accountSid, $authToken)
                ->timeout(10)
                ->post(sprintf(
                    'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json',
                    $accountSid,
                ), [
                    'From' => $fromNumber,
                    'To' => $toNumber,
                    'Body' => $body,
                ]);

            if ($response->failed()) {
                Log::warning('Twilio notification request failed.', [
                    'event' => $event,
                    'user_id' => $user->id,
                    'from' => $fromNumber,
                    'to' => $toNumber,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            } else {
                Log::info('Twilio notification request accepted.', [
                    'event' => $event,
                    'user_id' => $user->id,
                    'from' => $fromNumber,
                    'to' => $toNumber,
                    'status' => $response->status(),
                    'sid' => $response->json('sid'),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Twilio notification request threw an exception.', [
                'event' => $event,
                'user_id' => $user->id,
                'from' => $fromNumber,
                'to' => $toNumber,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function isEnabled(string $event, User $user): bool
    {
        if (! (bool) Setting::getValue('twilio_enabled', false)) {
            return false;
        }

        if (! (bool) Setting::getValue('notifications_twilio_enabled', false)) {
            return false;
        }

        if (! $this->preferences->userSupportsTwilioEvent($user, $event)) {
            return false;
        }

        if (! filled($user->phone)) {
            return false;
        }

        return filled((string) Setting::getValue('twilio_account_sid', ''))
            && filled((string) Setting::getValue('twilio_auth_token', ''))
            && filled((string) Setting::getValue('twilio_from_number', ''));
    }

    // Same as isEnabled() but ignores the phone check — used to detect the
    // "would have sent but phone is missing" case for the in-app warning.
    private function isEnabledExceptPhone(string $event, User $user): bool
    {
        if (! (bool) Setting::getValue('twilio_enabled', false)) {
            return false;
        }

        if (! (bool) Setting::getValue('notifications_twilio_enabled', false)) {
            return false;
        }

        if (! $this->preferences->userSupportsTwilioEvent($user, $event)) {
            return false;
        }

        if (filled($user->phone)) {
            return false;
        }

        return filled((string) Setting::getValue('twilio_account_sid', ''))
            && filled((string) Setting::getValue('twilio_auth_token', ''))
            && filled((string) Setting::getValue('twilio_from_number', ''));
    }
}
