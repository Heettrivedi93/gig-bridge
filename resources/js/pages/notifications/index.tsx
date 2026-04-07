import { Head, Link } from '@inertiajs/react';
import { BellRing } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    event: string;
    action_url?: string | null;
    read_at?: string | null;
    created_at?: string | null;
};

type Props = {
    notifications: NotificationItem[];
};

function formatDate(value?: string | null) {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export default function NotificationsIndex({ notifications }: Props) {
    return (
        <>
            <Head title="Notifications" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Notifications"
                    description="Review recent in-app notifications triggered by orders and payment events."
                />

                <div className="grid gap-4">
                    {notifications.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                            <BellRing className="mx-auto size-8 text-muted-foreground" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                No notifications yet.
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-semibold">
                                                {notification.title}
                                            </h2>
                                            <Badge variant={notification.read_at ? 'outline' : 'default'}>
                                                {notification.read_at ? 'Read' : 'Unread'}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {notification.message}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(notification.created_at)}
                                    </p>
                                </div>

                                {notification.action_url ? (
                                    <div className="mt-4">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={notification.action_url}>Open related page</Link>
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Notifications', href: '/notifications' },
    ],
};
