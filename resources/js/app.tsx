import { createInertiaApp } from '@inertiajs/react';
import '@/echo';
import FlashToaster from '@/components/flash-toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { ConfirmDialogProvider } from '@/hooks/use-confirm';
import AdminLayout from '@/layouts/admin-layout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';

const appName = import.meta.env.VITE_APP_NAME || 'GigBridge';

function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <FlashToaster />
            {children}
        </>
    );
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        if (name === 'welcome') {
            return RootLayout;
        }

        if (name.startsWith('auth/')) {
            return [RootLayout, AuthLayout];
        }

        if (name.startsWith('admin/')) {
            return [RootLayout, AdminLayout];
        }

        return [RootLayout, AppLayout];
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <ConfirmDialogProvider>{app}</ConfirmDialogProvider>
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
