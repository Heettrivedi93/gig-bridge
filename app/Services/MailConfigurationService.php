<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Throwable;

class MailConfigurationService
{
    public function apply(): void
    {
        try {
            $hasSettingsTable = Schema::hasTable('settings');
        } catch (Throwable) {
            return;
        }

        if (! $hasSettingsTable) {
            return;
        }

        $driver = (string) Setting::getValue('email_driver', config('mail.default', 'log'));
        $encryption = (string) Setting::getValue('email_encryption', 'none');
        $fromAddress = (string) Setting::getValue('email_from_address', config('mail.from.address'));
        $fromName = (string) Setting::getValue('email_from_name', config('mail.from.name'));
        $smtpScheme = match ($encryption) {
            'ssl' => 'smtps',
            default => null,
        };

        config([
            'mail.default' => $driver ?: config('mail.default', 'log'),
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => (string) Setting::getValue('email_host', config('mail.mailers.smtp.host')),
            'mail.mailers.smtp.port' => (int) Setting::getValue('email_port', config('mail.mailers.smtp.port')),
            'mail.mailers.smtp.username' => (string) Setting::getValue('email_username', config('mail.mailers.smtp.username')),
            'mail.mailers.smtp.password' => (string) Setting::getValue('email_password', config('mail.mailers.smtp.password')),
            'mail.mailers.smtp.scheme' => $smtpScheme,
            'mail.mailers.sendmail.transport' => 'sendmail',
            'mail.mailers.mailgun.transport' => 'mailgun',
            'services.mailgun.domain' => (string) Setting::getValue('email_host', config('services.mailgun.domain')),
            'services.mailgun.secret' => (string) Setting::getValue('email_password', config('services.mailgun.secret')),
            'services.mailgun.endpoint' => (string) Setting::getValue('email_username', config('services.mailgun.endpoint', 'api.mailgun.net')),
            'mail.from.address' => $fromAddress ?: config('mail.from.address'),
            'mail.from.name' => $fromName ?: config('mail.from.name'),
        ]);
    }
}
