import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    event: string;
    action_url?: string | null;
    read_at?: string | null;
    created_at?: string | null;
};

type NotificationsProp = {
    enabled: boolean;
    unread_count: number;
    items: NotificationItem[];
};

type PageProps = {
    notifications: NotificationsProp;
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

export function NotificationCenter() {
    const { notifications } = usePage<PageProps>().props;

    if (!notifications?.enabled) {
        return null;
    }

    const markAllAsRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    const markAsRead = (notificationId: string) => {
        router.post(`/notifications/${notificationId}/read`, {}, { preserveScroll: true });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-9">
                    <Bell className="size-4" />
                    {notifications.unread_count > 0 ? (
                        <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                            {notifications.unread_count > 99 ? '99+' : notifications.unread_count}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between px-3 py-2">
                    <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={notifications.unread_count === 0}
                    >
                        <CheckCheck className="size-4" />
                        Mark all read
                    </Button>
                </div>
                <DropdownMenuSeparator />
                {notifications.items.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No notifications yet.
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.items.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className="items-start gap-3 rounded-none px-3 py-3"
                                onSelect={() => {
                                    if (!notification.read_at) {
                                        markAsRead(notification.id);
                                    }
                                }}
                            >
                                <div className={`mt-1 size-2 rounded-full ${notification.read_at ? 'bg-muted' : 'bg-primary'}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-medium">{notification.title}</p>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatDate(notification.created_at)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {notification.message}
                                    </p>
                                    {notification.action_url ? (
                                        <Link
                                            href={notification.action_url}
                                            className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            Open
                                        </Link>
                                    ) : null}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
                <DropdownMenuSeparator />
                <div className="p-2">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/notifications">View all notifications</Link>
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
