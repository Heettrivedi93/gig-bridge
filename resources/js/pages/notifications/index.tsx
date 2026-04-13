import { Head, Link, router } from '@inertiajs/react';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import Heading from '@/components/heading';
import EmptyState from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { roleLayout } from '@/hooks/use-role-layout';

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
    notificationItems: NotificationItem[];
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

export default function NotificationsIndex({ notificationItems }: Props) {
    const unreadCount = notificationItems.filter(
        (notification) => !notification.read_at,
    ).length;

    const markAllAsRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Notifications" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Notifications"
                        description="Review recent in-app notifications triggered by orders and payment events."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck className="size-4" />
                        Mark all messages
                    </Button>
                </div>

                <div className="grid gap-4">
                    {notificationItems.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="No notifications yet"
                            description="Order updates, messages, and payment events will appear here."
                        />
                    ) : (
                        notificationItems.map((notification) => (
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
                                            <Badge
                                                variant={
                                                    notification.read_at
                                                        ? 'outline'
                                                        : 'default'
                                                }
                                            >
                                                {notification.read_at
                                                    ? 'Read'
                                                    : 'Unread'}
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
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link
                                                href={notification.action_url}
                                            >
                                                Open related page
                                            </Link>
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

NotificationsIndex.layout = roleLayout((isSuperAdmin) => [
    {
        title: 'Dashboard',
        href: isSuperAdmin ? '/admin/dashboard' : '/dashboard',
    },
    { title: 'Notifications', href: '/notifications' },
]);
