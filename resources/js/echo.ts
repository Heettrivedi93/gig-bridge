import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Echo?: unknown;
        Pusher?: typeof Pusher;
    }
}

function resolveBroadcasterConfig() {
    const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
    const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

    if (!reverbKey && !pusherKey) {
        return null;
    }

    const csrfToken =
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';
    const authHeaders: Record<string, string> = {};

    if (csrfToken) {
        authHeaders['X-CSRF-TOKEN'] = csrfToken;
    }

    if (reverbKey) {
        const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
        const host = import.meta.env.VITE_REVERB_HOST ?? window.location.hostname;
        const port = Number.parseInt(
            import.meta.env.VITE_REVERB_PORT ?? '8080',
            10,
        );

        return {
            broadcaster: 'reverb' as const,
            key: reverbKey,
            wsHost: host,
            wsPort: port,
            wssPort: port,
            forceTLS: scheme === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: authHeaders,
            },
        };
    }

    const scheme = import.meta.env.VITE_PUSHER_SCHEME ?? 'https';
    const host = import.meta.env.VITE_PUSHER_HOST ?? undefined;
    const port = Number.parseInt(import.meta.env.VITE_PUSHER_PORT ?? '443', 10);
    const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1';

    return {
        broadcaster: 'pusher' as const,
        key: pusherKey as string,
        cluster,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: authHeaders,
        },
    };
}

const broadcasterConfig = resolveBroadcasterConfig();

if (broadcasterConfig) {
    window.Pusher = Pusher;
    window.Echo = new Echo(broadcasterConfig as any);
}
