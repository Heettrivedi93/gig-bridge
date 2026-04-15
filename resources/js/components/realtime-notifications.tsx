import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from '@/components/flash-toaster';

type AuthProps = {
    auth: { user: { id: number } | null };
};

// Track seen notification IDs outside component to survive re-renders
const seenIds = new Set<string>();

export function RealtimeNotifications() {
    const { auth } = usePage<AuthProps>().props;
    const userId = auth?.user?.id;
    const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!userId) return;

        const echo = (window as any).Echo;
        if (!echo) return;

        const channel = echo.private(`App.Models.User.${userId}`);

        channel.notification((notification: {
            id?: string;
            title?: string;
            message?: string;
            action_url?: string | null;
        }) => {
            // Deduplicate by notification ID if present
            const notifId = notification.id ?? `${notification.title}:${Date.now()}`;
            if (seenIds.has(notifId)) return;
            seenIds.add(notifId);

            // Clean up old IDs to prevent memory leak
            if (seenIds.size > 50) {
                const first = seenIds.values().next().value;
                seenIds.delete(first);
            }

            const title = notification.title ?? 'New notification';
            const message = notification.message ?? '';
            toast('info', message ? `${title}: ${message}` : title);

            // Debounce reload so rapid notifications don't cause multiple reloads
            if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
            reloadTimerRef.current = setTimeout(() => {
                router.reload({ only: ['notifications'] });
            }, 500);
        });

        return () => {
            echo.leave(`App.Models.User.${userId}`);
            if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
        };
    }, [userId]);

    return null;
}
