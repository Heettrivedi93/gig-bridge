import { Head, useForm } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';

type EventOption = {
    key: string;
    label: string;
};

type ChannelKey = 'email' | 'in_app' | 'twilio';

type FormData = {
    email_enabled: boolean;
    email_events: string[];
    in_app_enabled: boolean;
    in_app_events: string[];
    twilio_enabled: boolean;
    twilio_events: string[];
};

type Props = {
    preferences: FormData;
    eventOptions: Record<ChannelKey, EventOption[]>;
};

function EventCheckboxList({
    title,
    description,
    options,
    values,
    onToggle,
    disabled = false,
}: {
    title: string;
    description: string;
    options: EventOption[];
    values: string[];
    onToggle: (key: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid gap-3">
            <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 md:grid-cols-2">
                {options.map((option) => (
                    <label
                        key={option.key}
                        htmlFor={`${title}-${option.key}`}
                        className={`flex items-start gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors ${
                            disabled
                                ? 'cursor-not-allowed opacity-60'
                                : 'cursor-pointer hover:bg-muted/40'
                        }`}
                    >
                        <Checkbox
                            id={`${title}-${option.key}`}
                            checked={values.includes(option.key)}
                            onCheckedChange={() => onToggle(option.key)}
                            disabled={disabled}
                        />
                        <span className="text-sm">{option.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function ChannelCard({
    id,
    title,
    description,
    enabled,
    enabledKey,
    eventsKey,
    options,
    values,
    error,
    onEnabledChange,
    onToggle,
}: {
    id: ChannelKey;
    title: string;
    description: string;
    enabled: boolean;
    enabledKey: keyof FormData;
    eventsKey: keyof FormData;
    options: EventOption[];
    values: string[];
    error?: string;
    onEnabledChange: (key: keyof FormData, value: boolean) => void;
    onToggle: (key: keyof FormData, value: string) => void;
}) {
    if (options.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5">
            <label
                htmlFor={`${id}_enabled`}
                className="flex cursor-pointer items-start justify-between gap-4"
            >
                <div className="space-y-1">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Checkbox
                    id={`${id}_enabled`}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                        onEnabledChange(enabledKey, checked === true)
                    }
                />
            </label>

            <EventCheckboxList
                title={`${title} events`}
                description={`Pick which ${title.toLowerCase()} updates you want to keep enabled.`}
                options={options}
                values={values}
                onToggle={(value) => onToggle(eventsKey, value)}
                disabled={!enabled}
            />
            <InputError message={error} />
        </div>
    );
}

export default function NotificationSettings({
    preferences,
    eventOptions,
}: Props) {
    const form = useForm<FormData>(preferences);

    const toggleValue = (key: keyof FormData, value: string) => {
        const current = form.data[key];

        if (!Array.isArray(current)) {
            return;
        }

        form.setData(
            key,
            current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
        );
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.put('/settings/notifications', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Notification settings" />

            <h1 className="sr-only">Notification settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Notification preferences"
                    description="Choose which updates you want to receive by channel based on your account role."
                />

                <form onSubmit={submit} className="space-y-6">
                    <ChannelCard
                        id="email"
                        title="Email notifications"
                        description="Receive important account and order updates in your inbox."
                        enabled={form.data.email_enabled}
                        enabledKey="email_enabled"
                        eventsKey="email_events"
                        options={eventOptions.email}
                        values={form.data.email_events}
                        error={form.errors.email_events}
                        onEnabledChange={(key, value) => form.setData(key, value)}
                        onToggle={toggleValue}
                    />

                    <ChannelCard
                        id="in_app"
                        title="In-app notifications"
                        description="Show alerts in the notification center while you use the platform."
                        enabled={form.data.in_app_enabled}
                        enabledKey="in_app_enabled"
                        eventsKey="in_app_events"
                        options={eventOptions.in_app}
                        values={form.data.in_app_events}
                        error={form.errors.in_app_events}
                        onEnabledChange={(key, value) => form.setData(key, value)}
                        onToggle={toggleValue}
                    />

                    <ChannelCard
                        id="twilio"
                        title="Twilio SMS notifications"
                        description="Receive role-relevant updates by SMS when your account has a phone number."
                        enabled={form.data.twilio_enabled}
                        enabledKey="twilio_enabled"
                        eventsKey="twilio_events"
                        options={eventOptions.twilio}
                        values={form.data.twilio_events}
                        error={form.errors.twilio_events}
                        onEnabledChange={(key, value) => form.setData(key, value)}
                        onToggle={toggleValue}
                    />

                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={form.processing}>
                            Save preferences
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

NotificationSettings.layout = (page: React.ReactNode) => (
    <SettingsLayout
        breadcrumbs={
            [
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Settings', href: '/settings/profile' },
                { title: 'Notifications', href: '/settings/notifications' },
            ] satisfies BreadcrumbItem[]
        }
    >
        {page}
    </SettingsLayout>
);
