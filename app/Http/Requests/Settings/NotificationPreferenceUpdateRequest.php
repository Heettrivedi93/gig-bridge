<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class NotificationPreferenceUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email_enabled' => ['required', 'boolean'],
            'in_app_enabled' => ['required', 'boolean'],
            'twilio_enabled' => ['required', 'boolean'],
            'email_events' => ['array'],
            'email_events.*' => ['string'],
            'in_app_events' => ['array'],
            'in_app_events.*' => ['string'],
            'twilio_events' => ['array'],
            'twilio_events.*' => ['string'],
        ];
    }
}
