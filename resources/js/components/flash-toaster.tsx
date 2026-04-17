import { usePage } from '@inertiajs/react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type FlashLevel = 'success' | 'error' | 'warning' | 'info';

// ── Imperative toast API ──────────────────────────────────────────────────────
// Call window.dispatchEvent(new CustomEvent('app:toast', { detail: { level, message } }))
// or use the exported `toast` helper from anywhere in the app.
export function toast(level: FlashLevel, message: string) {
    window.dispatchEvent(
        new CustomEvent('app:toast', { detail: { level, message } }),
    );
}

type FlashPayload = Partial<Record<FlashLevel, string | null | undefined>> & {
    nonce?: string | null;
};

type ToastItem = {
    id: string;
    level: FlashLevel;
    message: string;
    leaving: boolean;
};

const toastStyles: Record<FlashLevel, string> = {
    success:
        'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-100',
    error:
        'border-red-200 bg-red-50 text-red-950 dark:border-red-900/80 dark:bg-red-950/60 dark:text-red-100',
    warning:
        'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-100',
    info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/80 dark:bg-sky-950/60 dark:text-sky-100',
};

const icons = {
    success: CheckCircle2,
    error: CircleAlert,
    warning: CircleAlert,
    info: Info,
} satisfies Record<FlashLevel, typeof CheckCircle2>;

const FLASH_LEVELS: FlashLevel[] = ['success', 'error', 'warning', 'info'];
const TOAST_DURATION = 5500;
const TOAST_EXIT_DURATION = 220;

type PageProps = {
    flash?: FlashPayload;
    errors?: Record<string, string>;
};

export default function FlashToaster() {
    const { flash, errors } = usePage<PageProps>().props;
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const activeKeys = useRef(new Set<string>());
    const timeoutIds = useRef<Map<string, number[]>>(new Map());

    const clearToastTimers = (id: string) => {
        const timers = timeoutIds.current.get(id) ?? [];

        for (const timer of timers) {
            window.clearTimeout(timer);
        }

        timeoutIds.current.delete(id);
    };

    const registerToastTimers = useEffectEvent((id: string, key: string) => {
        const leaveTimer = window.setTimeout(() => {
            setToasts((current) =>
                current.map((toast) =>
                    toast.id === id ? { ...toast, leaving: true } : toast,
                ),
            );
        }, TOAST_DURATION);

        const removeTimer = window.setTimeout(() => {
            activeKeys.current.delete(key);
            clearToastTimers(id);
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, TOAST_DURATION + TOAST_EXIT_DURATION);

        timeoutIds.current.set(id, [leaveTimer, removeTimer]);
    });

    const enqueueToast = useEffectEvent((level: FlashLevel, rawMessage: string) => {
        const message = rawMessage.trim();

        if (!message) {
            return;
        }

        const key = `${level}:${message}`;

        if (activeKeys.current.has(key)) {
            const existingToast = toasts.find((toast) => `${toast.level}:${toast.message}` === key);

            if (existingToast) {
                clearToastTimers(existingToast.id);
                setToasts((current) => current.filter((toast) => toast.id !== existingToast.id));
            }

            activeKeys.current.delete(key);
        }

        activeKeys.current.add(key);

        const id = `${key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

        setToasts((current) => [...current, { id, level, message, leaving: false }]);
        registerToastTimers(id, key);
    });

    useEffect(() => {
        const handler = (e: Event) => {
            const { level, message } = (e as CustomEvent<{ level: FlashLevel; message: string }>).detail;
            enqueueToast(level, message);
        };
        window.addEventListener('app:toast', handler);
        return () => window.removeEventListener('app:toast', handler);
    }, []);

    useEffect(() => {
        for (const level of FLASH_LEVELS) {
            const message = flash?.[level];

            if (message) {
                enqueueToast(level, message);
            }
        }
    }, [flash?.nonce, flash?.success, flash?.error, flash?.warning, flash?.info]);

    useEffect(() => {
        const messages = Array.from(
            new Set(
                Object.values(errors ?? {})
                    .flatMap((message) =>
                        typeof message === 'string' ? [message.trim()] : [],
                    )
                    .filter(Boolean),
            ),
        );

        for (const message of messages) {
            enqueueToast('error', message);
        }
    }, [errors]);

    useEffect(() => {
        const timers = timeoutIds.current;
        const keys = activeKeys.current;

        return () => {
            for (const activeTimers of timers.values()) {
                for (const timer of activeTimers) {
                    window.clearTimeout(timer);
                }
            }

            timers.clear();
            keys.clear();
        };
    }, []);

    const dismissToast = (id: string) => {
        const toast = toasts.find((item) => item.id === id);

        if (toast) {
            activeKeys.current.delete(`${toast.level}:${toast.message}`);
        }

        clearToastTimers(id);
        setToasts((current) =>
            current.map((toast) =>
                toast.id === id ? { ...toast, leaving: true } : toast,
            ),
        );

        const removeTimer = window.setTimeout(() => {
            clearToastTimers(id);
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, TOAST_EXIT_DURATION);

        timeoutIds.current.set(id, [removeTimer]);
    };

    return (
        <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
            {toasts.map((toast) => {
                const Icon = icons[toast.level];

                return (
                    <div
                        key={toast.id}
                        className={cn(
                            'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur toast-surface',
                            toast.leaving ? 'toast-leave' : 'toast-enter',
                            toastStyles[toast.level],
                        )}
                        role="status"
                        aria-live="polite"
                    >
                        <Icon className="mt-0.5 size-5 shrink-0" />

                        <p className="min-w-0 flex-1 text-sm font-medium leading-5">
                            {toast.message}
                        </p>

                        <button
                            type="button"
                            onClick={() => dismissToast(toast.id)}
                            className="rounded-md p-1 opacity-70 transition hover:opacity-100"
                            aria-label="Dismiss notification"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
