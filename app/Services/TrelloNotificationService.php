<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TrelloNotificationService
{
    public function send(string $event, string $title, string $description): void
    {
        if (! $this->isEnabled($event)) {
            return;
        }

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://api.trello.com/1/cards', [
                    'key' => (string) Setting::getValue('trello_api_key', ''),
                    'token' => (string) Setting::getValue('trello_token', ''),
                    'idList' => (string) Setting::getValue('trello_list_id', ''),
                    'name' => $title,
                    'desc' => $description,
                ]);

            if ($response->failed()) {
                Log::warning('Trello notification request failed.', [
                    'event' => $event,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Trello notification request threw an exception.', [
                'event' => $event,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function isEnabled(string $event): bool
    {
        if (! (bool) Setting::getValue('trello_enabled', false)) {
            return false;
        }

        if (! (bool) Setting::getValue('notifications_trello_enabled', false)) {
            return false;
        }

        $events = Setting::getValue('notifications_trello_events', []);

        if (! in_array($event, is_array($events) ? $events : [], true)) {
            return false;
        }

        return filled((string) Setting::getValue('trello_api_key', ''))
            && filled((string) Setting::getValue('trello_token', ''))
            && filled((string) Setting::getValue('trello_list_id', ''));
    }
}
