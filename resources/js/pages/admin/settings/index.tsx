import { Head, useForm, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLogoIcon from '@/components/app-logo-icon';
import admin from '@/routes/admin';

type SettingsForm = {
    email_driver: 'smtp' | 'sendmail' | 'mailgun';
    email_host: string;
    email_port: string;
    email_username: string;
    email_password: string;
    email_encryption: 'tls' | 'ssl' | 'none' | '';
    email_from_address: string;
    email_from_name: string;

    brand_site_name: string;
    brand_contact_email: string;
    brand_contact_phone: string;
    brand_logo_url: string | null;

    payment_paypal_mode: 'sandbox' | 'live';
    payment_paypal_client_id: string;
    payment_paypal_client_secret: string;
    payment_currency: string;
    payment_platform_fee_percentage: string;
    payment_auto_release_days: string;
    payment_refund_policy_text: string;

    trello_enabled: boolean;
    trello_api_key: string;
    trello_token: string;
    trello_board_id: string;
    trello_list_id: string;

    twilio_enabled: boolean;
    twilio_account_sid: string;
    twilio_auth_token: string;
    twilio_from_number: string;

    notifications_email_enabled: boolean;
    notifications_in_app_enabled: boolean;
    notifications_trello_enabled: boolean;
    notifications_twilio_enabled: boolean;
    notifications_email_events: string[];
    notifications_in_app_events: string[];
    notifications_trello_events: string[];
    notifications_twilio_events: string[];
    setting_meta: Record<string, unknown>;
};

type EventOption = { key: string; label: string };

type Props = {
    settings: SettingsForm;
    eventOptions: {
        email: EventOption[];
        in_app: EventOption[];
        trello: EventOption[];
        twilio: EventOption[];
    };
};

type SettingTab = 'email' | 'brand' | 'payment' | 'trello' | 'twilio' | 'notifications';

function EventCheckboxList({
    title,
    options,
    values,
    toggle,
}: {
    title: string;
    options: EventOption[];
    values: string[];
    toggle: (key: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label>{title}</Label>
            <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
                {options.map((item) => (
                    <label
                        key={item.key}
                        htmlFor={`${title}-${item.key}`}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40"
                    >
                        <input
                            id={`${title}-${item.key}`}
                            type="checkbox"
                            checked={values.includes(item.key)}
                            onChange={() => toggle(item.key)}
                            className="size-4 accent-primary"
                        />
                        <span>{item.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

export default function AdminSettingsIndex({ settings, eventOptions }: Props) {
    const form = useForm<SettingsForm>(settings);
    const [activeTab, setActiveTab] = useState<SettingTab>('email');
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(settings.brand_logo_url ?? null);
    const [logoUploading, setLogoUploading] = useState(false);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoPreview(URL.createObjectURL(file));
        const data = new FormData();
        data.append('logo', file);
        setLogoUploading(true);
        router.post('/admin/settings/logo', data, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setLogoUploading(false),
        });
    };

    const handleLogoReset = () => {
        setLogoPreview(null);
        router.delete('/admin/settings/logo', { preserveScroll: true });
    };

    const toggleValue = (
        key:
            | 'notifications_email_events'
            | 'notifications_in_app_events'
            | 'notifications_trello_events'
            | 'notifications_twilio_events',
        value: string,
    ) => {
        const current = form.data[key];

        if (current.includes(value)) {
            form.setData(
                key,
                current.filter((item) => item !== value),
            );

            return;
        }

        form.setData(key, [...current, value]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/settings', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Settings" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Settings"
                    description="Manage email, brand, payment, Trello, and notification configuration in one place."
                />

                <div className="flex flex-wrap gap-2 rounded-xl border border-sidebar-border/70 bg-card p-2 dark:border-sidebar-border">
                    <Button
                        type="button"
                        variant={activeTab === 'email' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('email')}
                    >
                        Email
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'brand' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('brand')}
                    >
                        Brand
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'payment' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('payment')}
                    >
                        Payment
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'trello' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('trello')}
                    >
                        Trello
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'twilio' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('twilio')}
                    >
                        Twilio
                    </Button>
                    <Button
                        type="button"
                        variant={
                            activeTab === 'notifications' ? 'default' : 'ghost'
                        }
                        size="sm"
                        onClick={() => setActiveTab('notifications')}
                    >
                        Notifications
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <section
                        className={
                            activeTab === 'email'
                                ? 'rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border'
                                : 'hidden'
                        }
                    >
                        <h2 className="mb-4 text-base font-semibold">
                            3.4 Email Settings (SMTP)
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Driver</Label>
                                <Select
                                    value={form.data.email_driver}
                                    onValueChange={(v) =>
                                        form.setData(
                                            'email_driver',
                                            v as SettingsForm['email_driver'],
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="smtp">
                                            SMTP
                                        </SelectItem>
                                        <SelectItem value="sendmail">
                                            Sendmail
                                        </SelectItem>
                                        <SelectItem value="mailgun">
                                            Mailgun
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={form.errors.email_driver}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-host">Host</Label>
                                <Input
                                    id="email-host"
                                    value={form.data.email_host}
                                    onChange={(e) =>
                                        form.setData(
                                            'email_host',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.email_host} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-port">Port</Label>
                                <Input
                                    id="email-port"
                                    type="number"
                                    min="1"
                                    value={form.data.email_port}
                                    onChange={(e) =>
                                        form.setData(
                                            'email_port',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.email_port} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-encryption">
                                    Encryption
                                </Label>
                                <Select
                                    value={form.data.email_encryption || 'none'}
                                    onValueChange={(v) =>
                                        form.setData(
                                            'email_encryption',
                                            v as SettingsForm['email_encryption'],
                                        )
                                    }
                                >
                                    <SelectTrigger id="email-encryption">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            None
                                        </SelectItem>
                                        <SelectItem value="tls">TLS</SelectItem>
                                        <SelectItem value="ssl">SSL</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={form.errors.email_encryption}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-username">Username</Label>
                                <Input
                                    id="email-username"
                                    value={form.data.email_username}
                                    onChange={(e) =>
                                        form.setData(
                                            'email_username',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.email_username}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-password">Password</Label>
                                <Input
                                    id="email-password"
                                    type="password"
                                    value={form.data.email_password}
                                    onChange={(e) =>
                                        form.setData(
                                            'email_password',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.email_password}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-from-address">
                                    From Address
                                </Label>
                                <Input
                                    id="email-from-address"
                                    type="email"
                                    value={form.data.email_from_address}
                                    onChange={(e) =>
                                        form.setData(
                                            'email_from_address',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.email_from_address}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email-from-name">
                                    From Name
                                </Label>
                                <Input
                                    id="email-from-name"
                                    value={form.data.email_from_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'email_from_name',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.email_from_name}
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        className={
                            activeTab === 'brand'
                                ? 'rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border'
                                : 'hidden'
                        }
                    >
                        <h2 className="mb-4 text-base font-semibold">Brand Settings</h2>

                        {/* Logo */}
                        <div className="mb-6">
                            <Label className="mb-2 block">Brand Logo</Label>
                            <div className="flex items-center gap-4">
                                <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Brand logo" className="size-full object-contain" />
                                    ) : (
                                        <AppLogoIcon className="size-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoChange}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={logoUploading}
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        {logoUploading ? 'Uploading…' : 'Upload Logo'}
                                    </Button>
                                    {logoPreview && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleLogoReset}
                                        >
                                            Reset to Default
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG or SVG. Max 2 MB.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="brand-site-name">Site Name</Label>
                                <Input
                                    id="brand-site-name"
                                    value={form.data.brand_site_name}
                                    onChange={(e) => form.setData('brand_site_name', e.target.value)}
                                />
                                <InputError message={form.errors.brand_site_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="brand-contact-email">Contact Email</Label>
                                <Input
                                    id="brand-contact-email"
                                    type="email"
                                    value={form.data.brand_contact_email}
                                    onChange={(e) => form.setData('brand_contact_email', e.target.value)}
                                />
                                <InputError message={form.errors.brand_contact_email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="brand-contact-phone">Contact Phone</Label>
                                <Input
                                    id="brand-contact-phone"
                                    value={form.data.brand_contact_phone}
                                    onChange={(e) => form.setData('brand_contact_phone', e.target.value)}
                                />
                                <InputError message={form.errors.brand_contact_phone} />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Contact email and phone appear in the footer of all notification emails sent to users.</p>
                    </section>

                    <section
                        className={
                            activeTab === 'payment'
                                ? 'rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border'
                                : 'hidden'
                        }
                    >
                        <h2 className="mb-4 text-base font-semibold">
                            3.6 Payment Settings
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>PayPal Mode</Label>
                                <Select
                                    value={form.data.payment_paypal_mode}
                                    onValueChange={(v) =>
                                        form.setData(
                                            'payment_paypal_mode',
                                            v as SettingsForm['payment_paypal_mode'],
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sandbox">
                                            Sandbox
                                        </SelectItem>
                                        <SelectItem value="live">
                                            Live
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={form.errors.payment_paypal_mode}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment-currency">
                                    Currency
                                </Label>
                                <Input
                                    id="payment-currency"
                                    value={form.data.payment_currency}
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_currency',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.payment_currency}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment-fee">
                                    Platform Fee %
                                </Label>
                                <Input
                                    id="payment-fee"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={
                                        form.data
                                            .payment_platform_fee_percentage
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_platform_fee_percentage',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={
                                        form.errors
                                            .payment_platform_fee_percentage
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment-auto-release-days">
                                    Auto Release Days
                                </Label>
                                <Input
                                    id="payment-auto-release-days"
                                    type="number"
                                    min="1"
                                    value={form.data.payment_auto_release_days}
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_auto_release_days',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={
                                        form.errors.payment_auto_release_days
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="payment-client-id">
                                    PayPal Client ID
                                </Label>
                                <Input
                                    id="payment-client-id"
                                    value={form.data.payment_paypal_client_id}
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_paypal_client_id',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={
                                        form.errors.payment_paypal_client_id
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment-client-secret">
                                    PayPal Client Secret
                                </Label>
                                <Input
                                    id="payment-client-secret"
                                    value={
                                        form.data.payment_paypal_client_secret
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_paypal_client_secret',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={
                                        form.errors.payment_paypal_client_secret
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment-refund-policy">
                                    Refund Policy Text
                                </Label>
                                <textarea
                                    id="payment-refund-policy"
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    value={form.data.payment_refund_policy_text}
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_refund_policy_text',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={
                                        form.errors.payment_refund_policy_text
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        className={
                            activeTab === 'trello'
                                ? 'rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border'
                                : 'hidden'
                        }
                    >
                        <h2 className="mb-4 text-base font-semibold">
                            3.7 Trello Settings
                        </h2>
                        <div className="mb-4">
                            <label
                                htmlFor="trello-enabled"
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    id="trello-enabled"
                                    type="checkbox"
                                    checked={form.data.trello_enabled}
                                    onChange={(e) =>
                                        form.setData(
                                            'trello_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="size-4 accent-primary"
                                />
                                Enable Trello integration
                            </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="trello-api-key">
                                    Trello API Key
                                </Label>
                                <Input
                                    id="trello-api-key"
                                    value={form.data.trello_api_key}
                                    onChange={(e) =>
                                        form.setData(
                                            'trello_api_key',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.trello_api_key}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="trello-token">
                                    Trello Token
                                </Label>
                                <Input
                                    id="trello-token"
                                    value={form.data.trello_token}
                                    onChange={(e) =>
                                        form.setData(
                                            'trello_token',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.trello_token}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="trello-board-id">
                                    Board ID
                                </Label>
                                <Input
                                    id="trello-board-id"
                                    value={form.data.trello_board_id}
                                    onChange={(e) =>
                                        form.setData(
                                            'trello_board_id',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.trello_board_id}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="trello-list-id">List ID</Label>
                                <Input
                                    id="trello-list-id"
                                    value={form.data.trello_list_id}
                                    onChange={(e) =>
                                        form.setData(
                                            'trello_list_id',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.trello_list_id}
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        className={
                            activeTab === 'twilio'
                                ? 'rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border'
                                : 'hidden'
                        }
                    >
                        <h2 className="mb-4 text-base font-semibold">
                            3.8 Twilio Settings
                        </h2>
                        <div className="mb-4">
                            <label
                                htmlFor="twilio-enabled"
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    id="twilio-enabled"
                                    type="checkbox"
                                    checked={form.data.twilio_enabled}
                                    onChange={(e) =>
                                        form.setData('twilio_enabled', e.target.checked)
                                    }
                                    className="size-4 accent-primary"
                                />
                                Enable Twilio SMS integration
                            </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="twilio-account-sid">Account SID</Label>
                                <Input
                                    id="twilio-account-sid"
                                    value={form.data.twilio_account_sid}
                                    onChange={(e) =>
                                        form.setData('twilio_account_sid', e.target.value)
                                    }
                                />
                                <InputError message={form.errors.twilio_account_sid} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="twilio-auth-token">Auth Token</Label>
                                <Input
                                    id="twilio-auth-token"
                                    value={form.data.twilio_auth_token}
                                    onChange={(e) =>
                                        form.setData('twilio_auth_token', e.target.value)
                                    }
                                />
                                <InputError message={form.errors.twilio_auth_token} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="twilio-from-number">From Number</Label>
                                <Input
                                    id="twilio-from-number"
                                    value={form.data.twilio_from_number}
                                    onChange={(e) =>
                                        form.setData('twilio_from_number', e.target.value)
                                    }
                                    placeholder="+15005550006"
                                />
                                <InputError message={form.errors.twilio_from_number} />
                            </div>
                        </div>
                    </section>

                    <section
                        className={
                            activeTab === 'notifications'
                                ? 'rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border'
                                : 'hidden'
                        }
                    >
                        <h2 className="mb-4 text-base font-semibold">
                            3.8 Notification Settings
                        </h2>
                        <div className="grid gap-3 md:grid-cols-3">
                            <label
                                htmlFor="notifications-email-enabled"
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    id="notifications-email-enabled"
                                    type="checkbox"
                                    checked={
                                        form.data.notifications_email_enabled
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'notifications_email_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="size-4 accent-primary"
                                />
                                Enable Email Notifications
                            </label>
                            <label
                                htmlFor="notifications-in-app-enabled"
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    id="notifications-in-app-enabled"
                                    type="checkbox"
                                    checked={
                                        form.data.notifications_in_app_enabled
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'notifications_in_app_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="size-4 accent-primary"
                                />
                                Enable In-App Notifications
                            </label>
                            <label
                                htmlFor="notifications-trello-enabled"
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    id="notifications-trello-enabled"
                                    type="checkbox"
                                    checked={
                                        form.data.notifications_trello_enabled
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'notifications_trello_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="size-4 accent-primary"
                                />
                                Enable Trello Notifications
                            </label>
                            <label
                                htmlFor="notifications-twilio-enabled"
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    id="notifications-twilio-enabled"
                                    type="checkbox"
                                    checked={form.data.notifications_twilio_enabled}
                                    onChange={(e) =>
                                        form.setData('notifications_twilio_enabled', e.target.checked)
                                    }
                                    className="size-4 accent-primary"
                                />
                                Enable Twilio SMS Notifications
                            </label>
                        </div>
                        <div className="mt-4 space-y-4">
                            <EventCheckboxList
                                title="Email Events"
                                options={eventOptions.email}
                                values={form.data.notifications_email_events}
                                toggle={(key) =>
                                    toggleValue(
                                        'notifications_email_events',
                                        key,
                                    )
                                }
                            />
                            <EventCheckboxList
                                title="In-App Events"
                                options={eventOptions.in_app}
                                values={form.data.notifications_in_app_events}
                                toggle={(key) =>
                                    toggleValue(
                                        'notifications_in_app_events',
                                        key,
                                    )
                                }
                            />
                            <EventCheckboxList
                                title="Trello Events"
                                options={eventOptions.trello}
                                values={form.data.notifications_trello_events}
                                toggle={(key) =>
                                    toggleValue(
                                        'notifications_trello_events',
                                        key,
                                    )
                                }
                            />
                            <EventCheckboxList
                                title="Twilio Events"
                                options={eventOptions.twilio}
                                values={form.data.notifications_twilio_events}
                                toggle={(key) =>
                                    toggleValue(
                                        'notifications_twilio_events',
                                        key,
                                    )
                                }
                            />
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Save All Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminSettingsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Settings', href: '/admin/settings' },
    ],
};
