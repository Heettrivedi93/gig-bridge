<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\PaypalCheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminSettingController extends Controller
{
    public function index()
    {
        $defaults = $this->defaults();
        $settings = Setting::getManyWithDefaults($defaults);

        return Inertia::render('admin/settings/index', [
            'settings' => [
                ...$settings,
                'brand_logo_url' => Setting::getValue('brand_logo_path')
                    ? Storage::disk('public')->url((string) Setting::getValue('brand_logo_path'))
                    : null,
            ],
            'eventOptions' => [
                'email' => [
                    ['key' => 'order_placed', 'label' => 'Order placed'],
                    ['key' => 'order_delivered', 'label' => 'Order delivered'],
                    ['key' => 'order_completed', 'label' => 'Order completed'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                ],
                'in_app' => [
                    ['key' => 'orders', 'label' => 'Orders'],
                    ['key' => 'messages', 'label' => 'Messages'],
                    ['key' => 'reviews', 'label' => 'Reviews'],
                    ['key' => 'payment_released', 'label' => 'Payment released'],
                ],
                'trello' => [
                    ['key' => 'order_placed', 'label' => 'Order placed'],
                    ['key' => 'order_delivered', 'label' => 'Order delivered'],
                    ['key' => 'order_completed', 'label' => 'Order completed'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                    ['key' => 'new_messages', 'label' => 'New messages'],
                    ['key' => 'withdrawal_requests', 'label' => 'Withdrawal requests'],
                    ['key' => 'new_user_registrations', 'label' => 'New user registrations'],
                ],
                'twilio' => [
                    ['key' => 'order_placed', 'label' => 'Order placed'],
                    ['key' => 'order_delivered', 'label' => 'Order delivered'],
                    ['key' => 'order_completed', 'label' => 'Order completed'],
                    ['key' => 'order_cancelled', 'label' => 'Order cancelled'],
                    ['key' => 'payment_released', 'label' => 'Payment released'],
                ],
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'email_driver' => ['required', 'in:smtp,sendmail,mailgun'],
            'email_host' => ['nullable', 'string', 'max:255'],
            'email_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'email_username' => ['nullable', 'string', 'max:255'],
            'email_password' => ['nullable', 'string', 'max:2000'],
            'email_encryption' => ['nullable', 'in:tls,ssl,none'],
            'email_from_address' => ['nullable', 'email', 'max:255'],
            'email_from_name' => ['nullable', 'string', 'max:255'],

            'brand_site_name'     => ['nullable', 'string', 'max:255'],
            'brand_contact_email' => ['nullable', 'email', 'max:255'],
            'brand_contact_phone' => ['nullable', 'string', 'max:50'],
            'brand_address'       => ['nullable', 'string', 'max:2000'],

            'payment_paypal_mode' => ['required', 'in:sandbox,live'],
            'payment_paypal_client_id' => ['nullable', 'string', 'max:2000'],
            'payment_paypal_client_secret' => ['nullable', 'string', 'max:2000'],
            'payment_currency' => ['required', 'string', 'size:3', Rule::in(PaypalCheckoutService::supportedCurrencies())],
            'payment_platform_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'payment_auto_release_days' => ['required', 'integer', 'min:1', 'max:365'],
            'payment_refund_policy_text' => ['nullable', 'string', 'max:5000'],

            'trello_enabled' => ['required', 'boolean'],
            'trello_api_key' => ['nullable', 'string', 'max:2000'],
            'trello_token' => ['nullable', 'string', 'max:2000'],
            'trello_board_id' => ['nullable', 'string', 'max:255'],
            'trello_list_id' => ['nullable', 'string', 'max:255'],

            'twilio_enabled' => ['required', 'boolean'],
            'twilio_account_sid' => ['nullable', 'string', 'max:255'],
            'twilio_auth_token' => ['nullable', 'string', 'max:2000'],
            'twilio_from_number' => ['nullable', 'string', 'max:50'],

            'notifications_email_enabled' => ['required', 'boolean'],
            'notifications_in_app_enabled' => ['required', 'boolean'],
            'notifications_trello_enabled' => ['required', 'boolean'],
            'notifications_twilio_enabled' => ['required', 'boolean'],
            'notifications_email_events' => ['array'],
            'notifications_email_events.*' => ['string'],
            'notifications_in_app_events' => ['array'],
            'notifications_in_app_events.*' => ['string'],
            'notifications_trello_events' => ['array'],
            'notifications_trello_events.*' => ['string'],
            'notifications_twilio_events' => ['array'],
            'notifications_twilio_events.*' => ['string'],
            'setting_meta' => ['nullable', 'array'],
        ]);

        Setting::setMany([
            'email_driver' => $data['email_driver'],
            'email_host' => $data['email_host'] ?: '',
            'email_port' => $data['email_port'] ? (string) $data['email_port'] : '',
            'email_username' => $data['email_username'] ?: '',
            'email_password' => $data['email_password'] ?: '',
            'email_encryption' => $data['email_encryption'] ?: 'none',
            'email_from_address' => $data['email_from_address'] ?: '',
            'email_from_name' => $data['email_from_name'] ?: '',

            'brand_site_name'     => $data['brand_site_name'] ?: 'GigBridge',
            'brand_contact_email' => $data['brand_contact_email'] ?: '',
            'brand_contact_phone' => $data['brand_contact_phone'] ?: '',
            'brand_address'       => $data['brand_address'] ?: '',

            'payment_paypal_mode' => $data['payment_paypal_mode'],
            'payment_paypal_client_id' => $data['payment_paypal_client_id'] ?: '',
            'payment_paypal_client_secret' => $data['payment_paypal_client_secret'] ?: '',
            'payment_currency' => strtoupper($data['payment_currency']),
            'payment_platform_fee_percentage' => (string) $data['payment_platform_fee_percentage'],
            'payment_auto_release_days' => (string) $data['payment_auto_release_days'],
            'payment_refund_policy_text' => $data['payment_refund_policy_text'] ?: '',

            'trello_enabled' => (bool) $data['trello_enabled'],
            'trello_api_key' => $data['trello_api_key'] ?: '',
            'trello_token' => $data['trello_token'] ?: '',
            'trello_board_id' => $data['trello_board_id'] ?: '',
            'trello_list_id' => $data['trello_list_id'] ?: '',

            'twilio_enabled' => (bool) $data['twilio_enabled'],
            'twilio_account_sid' => $data['twilio_account_sid'] ?: '',
            'twilio_auth_token' => $data['twilio_auth_token'] ?: '',
            'twilio_from_number' => $data['twilio_from_number'] ?: '',

            'notifications_email_enabled' => (bool) $data['notifications_email_enabled'],
            'notifications_in_app_enabled' => (bool) $data['notifications_in_app_enabled'],
            'notifications_trello_enabled' => (bool) $data['notifications_trello_enabled'],
            'notifications_twilio_enabled' => (bool) $data['notifications_twilio_enabled'],
            'notifications_email_events' => array_values($data['notifications_email_events'] ?? []),
            'notifications_in_app_events' => array_values($data['notifications_in_app_events'] ?? []),
            'notifications_trello_events' => array_values($data['notifications_trello_events'] ?? []),
            'notifications_twilio_events' => array_values($data['notifications_twilio_events'] ?? []),
            'setting_meta' => $data['setting_meta'] ?? [],
        ]);

        return back()
            ->with('success', 'Settings updated successfully.')
            ->with('flash_nonce', Str::uuid()->toString());
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $old = Setting::getValue('brand_logo_path');
        if ($old) {
            Storage::disk('public')->delete((string) $old);
        }

        $path = $request->file('logo')->store('brand', 'public');
        Setting::setMany(['brand_logo_path' => $path]);

        return back()
            ->with('success', 'Logo updated successfully.')
            ->with('flash_nonce', Str::uuid()->toString());
    }

    public function resetLogo()
    {
        $old = Setting::getValue('brand_logo_path');
        if ($old) {
            Storage::disk('public')->delete((string) $old);
        }

        Setting::setMany(['brand_logo_path' => '']);

        return back()
            ->with('success', 'Logo reset to default.')
            ->with('flash_nonce', Str::uuid()->toString());
    }

    private function defaults(): array
    {
        return [
            'email_driver' => 'smtp',
            'email_host' => '',
            'email_port' => '',
            'email_username' => '',
            'email_password' => '',
            'email_encryption' => 'none',
            'email_from_address' => '',
            'email_from_name' => '',

            'brand_site_name'     => 'GigBridge',
            'brand_contact_email' => '',
            'brand_contact_phone' => '',
            'brand_address'       => '',
            'brand_logo_path'     => '',

            'payment_paypal_mode' => 'sandbox',
            'payment_paypal_client_id' => '',
            'payment_paypal_client_secret' => '',
            'payment_currency' => 'USD',
            'payment_platform_fee_percentage' => '10',
            'payment_auto_release_days' => '3',
            'payment_refund_policy_text' => '',

            'trello_enabled' => false,
            'trello_api_key' => '',
            'trello_token' => '',
            'trello_board_id' => '',
            'trello_list_id' => '',

            'twilio_enabled' => false,
            'twilio_account_sid' => '',
            'twilio_auth_token' => '',
            'twilio_from_number' => '',

            'notifications_email_enabled' => true,
            'notifications_in_app_enabled' => true,
            'notifications_trello_enabled' => false,
            'notifications_twilio_enabled' => false,
            'notifications_email_events' => $this->defaultEmailEvents(),
            'notifications_in_app_events' => $this->defaultInAppEvents(),
            'notifications_trello_events' => $this->defaultTrelloEvents(),
            'notifications_twilio_events' => $this->defaultTwilioEvents(),
            'setting_meta' => [],
        ];
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

    private function defaultInAppEvents(): array
    {
        return ['orders', 'messages', 'reviews', 'payment_released'];
    }

    private function defaultTrelloEvents(): array
    {
        return [
            'order_placed',
            'order_delivered',
            'order_completed',
            'order_cancelled',
            'new_messages',
            'withdrawal_requests',
            'new_user_registrations',
        ];
    }

    private function defaultTwilioEvents(): array
    {
        return [
            'order_placed',
            'order_delivered',
            'order_completed',
            'order_cancelled',
            'payment_released',
        ];
    }
}
