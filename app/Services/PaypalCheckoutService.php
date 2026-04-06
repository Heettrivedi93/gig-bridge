<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use RuntimeException;

class PaypalCheckoutService
{
    private const SUPPORTED_CURRENCIES = [
        'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD',
        'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK',
        'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD',
    ];

    private const ZERO_DECIMAL_CURRENCIES = ['HUF', 'JPY', 'TWD'];

    public function __construct(private readonly HttpFactory $http)
    {
    }

    public function config(): array
    {
        $mode = (string) Setting::getValue('payment_paypal_mode', 'sandbox');
        $clientId = (string) Setting::getValue('payment_paypal_client_id', '');
        $clientSecret = (string) Setting::getValue('payment_paypal_client_secret', '');
        $currency = strtoupper((string) Setting::getValue('payment_currency', 'USD'));

        return [
            'mode' => $mode === 'live' ? 'live' : 'sandbox',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'currency' => $currency !== '' ? $currency : 'USD',
            'enabled' => $clientId !== '' && $clientSecret !== '',
            'base_url' => $mode === 'live'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com',
        ];
    }

    public function publicConfig(): array
    {
        $config = $this->config();
        $currency = $config['currency'];
        $enabled = $config['enabled'];
        $message = null;

        if (! $enabled) {
            $message = 'PayPal client ID and client secret must be saved in admin payment settings.';
        } elseif (! $this->supportsCurrency($currency)) {
            $enabled = false;
            $message = sprintf(
                'PayPal currency %s is not supported. Update the admin payment currency to a PayPal-supported code like USD, EUR, or GBP.',
                $currency,
            );
        }

        return [
            ...Arr::only($config, ['mode', 'client_id', 'currency']),
            'enabled' => $enabled,
            'message' => $message,
        ];
    }

    public function createOrder(array $payload): array
    {
        return $this->request('/v2/checkout/orders', $payload);
    }

    public function captureOrder(string $orderId): array
    {
        return $this->request("/v2/checkout/orders/{$orderId}/capture", []);
    }

    public function formatOrderAmount(float|string|int $amount, ?string $currency = null): string
    {
        $currencyCode = strtoupper($currency ?: (string) $this->config()['currency']);

        if (! $this->supportsCurrency($currencyCode)) {
            throw new RuntimeException(sprintf(
                'PayPal currency %s is not supported. Update the admin payment currency to a PayPal-supported code like USD, EUR, or GBP.',
                $currencyCode,
            ));
        }

        $normalizedAmount = (float) $amount;

        if ($this->usesZeroDecimalAmount($currencyCode)) {
            if (fmod($normalizedAmount, 1.0) !== 0.0) {
                throw new RuntimeException(sprintf(
                    'PayPal currency %s does not allow decimal amounts. Use a whole-number plan price or switch the admin payment currency.',
                    $currencyCode,
                ));
            }

            return number_format($normalizedAmount, 0, '.', '');
        }

        return number_format($normalizedAmount, 2, '.', '');
    }

    public static function supportedCurrencies(): array
    {
        return self::SUPPORTED_CURRENCIES;
    }

    public function supportsCurrency(?string $currency): bool
    {
        return in_array(strtoupper((string) $currency), self::SUPPORTED_CURRENCIES, true);
    }

    public function usesZeroDecimalAmount(?string $currency): bool
    {
        return in_array(strtoupper((string) $currency), self::ZERO_DECIMAL_CURRENCIES, true);
    }

    private function request(string $path, ?array $payload = null): array
    {
        $config = $this->config();

        if (! $config['enabled']) {
            throw new RuntimeException('PayPal is not configured. Please update the payment settings first.');
        }

        $tokenResponse = $this->http
            ->asForm()
            ->withBasicAuth($config['client_id'], $config['client_secret'])
            ->post("{$config['base_url']}/v1/oauth2/token", [
                'grant_type' => 'client_credentials',
            ]);

        if ($tokenResponse->failed()) {
            $message = $tokenResponse->json('error_description')
                ?? $tokenResponse->json('error')
                ?? $tokenResponse->json('message')
                ?? 'Unable to authenticate with PayPal.';

            throw new RuntimeException((string) $message);
        }

        $accessToken = (string) $tokenResponse->json('access_token');

        if ($accessToken === '') {
            throw new RuntimeException('PayPal authentication did not return an access token.');
        }

        try {
            $request = $this->http
                ->withToken($accessToken)
                ->acceptJson()
                ->asJson();

            if ($payload === null) {
                $response = $request
                    ->post("{$config['base_url']}{$path}")
                    ->throw();
            } elseif ($payload === []) {
                $response = $request
                    ->withBody('{}', 'application/json')
                    ->post("{$config['base_url']}{$path}")
                    ->throw();
            } else {
                $response = $request
                    ->post("{$config['base_url']}{$path}", $payload)
                    ->throw();
            }
        } catch (RequestException $exception) {
            $response = $exception->response;
            $details = Collection::make($response?->json('details', []))
                ->map(function (mixed $detail): string {
                    if (! is_array($detail)) {
                        return '';
                    }

                    $description = trim((string) ($detail['description'] ?? ''));
                    $issue = trim((string) ($detail['issue'] ?? ''));
                    $field = trim((string) ($detail['field'] ?? ''));

                    return collect([$description, $issue !== '' ? "Issue: {$issue}" : null, $field !== '' ? "Field: {$field}" : null])
                        ->filter()
                        ->implode(' ');
                })
                ->filter()
                ->implode(' ');

            $message = trim(implode(' ', array_filter([
                (string) ($response?->json('message') ?? ''),
                (string) ($response?->json('error_description') ?? ''),
                $details,
                $response?->json('debug_id') ? 'PayPal debug ID: '.$response->json('debug_id') : '',
            ])));

            if ($message === '') {
                $message = 'PayPal request failed.';
            }

            throw new RuntimeException((string) $message, previous: $exception);
        }

        return $response->json();
    }
}
