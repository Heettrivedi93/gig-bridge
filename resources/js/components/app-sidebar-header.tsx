import { usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationCenter } from '@/components/notification-center';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

function fallbackBreadcrumbs(
    url: string | undefined,
    roles: string[] | undefined,
): BreadcrumbItemType[] {
    const isSuperAdmin = roles?.includes('super_admin') ?? false;
    const dashboardHref = isSuperAdmin ? '/admin/dashboard' : '/dashboard';
    const path = (url ?? '/').split('?')[0];

    if (path === '/dashboard' || path === '/admin/dashboard') {
        return [{ title: 'Dashboard', href: dashboardHref }];
    }

    if (path === '/notifications') {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Notifications', href: '/notifications' },
        ];
    }

    if (path.startsWith('/seller/gigs')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'My Gigs', href: '/seller/gigs' },
        ];
    }

    if (path.startsWith('/seller/orders')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Orders', href: '/seller/orders' },
        ];
    }

    if (path.startsWith('/seller/plans')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Plans', href: '/seller/plans' },
        ];
    }

    if (path.startsWith('/seller/wallet')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Wallet', href: '/seller/wallet' },
        ];
    }

    if (path.startsWith('/seller/payments')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Payment History', href: '/seller/payments' },
        ];
    }

    if (path === '/buyer/gigs') {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Explore Gigs', href: '/buyer/gigs' },
        ];
    }

    if (path.startsWith('/buyer/gigs/')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Explore Gigs', href: '/buyer/gigs' },
            { title: 'Gig Details', href: path },
        ];
    }

    if (path.startsWith('/buyer/orders')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Orders', href: '/buyer/orders' },
        ];
    }

    if (path.startsWith('/buyer/payments')) {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Payment History', href: '/buyer/payments' },
        ];
    }

    if (path === '/settings/profile') {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Settings', href: '/settings/profile' },
            { title: 'Profile', href: '/settings/profile' },
        ];
    }

    if (path === '/settings/security') {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Settings', href: '/settings/profile' },
            { title: 'Security', href: '/settings/security' },
        ];
    }

    if (path === '/settings/appearance') {
        return [
            { title: 'Dashboard', href: dashboardHref },
            { title: 'Settings', href: '/settings/profile' },
            { title: 'Appearance', href: '/settings/appearance' },
        ];
    }

    return [];
}

function ensureDashboardPrefix(
    breadcrumbs: BreadcrumbItemType[],
    roles: string[] | undefined,
): BreadcrumbItemType[] {
    const isSuperAdmin = roles?.includes('super_admin') ?? false;
    const dashboardCrumb: BreadcrumbItemType = {
        title: 'Dashboard',
        href: isSuperAdmin ? '/admin/dashboard' : '/dashboard',
    };

    if (breadcrumbs.length === 0) {
        return breadcrumbs;
    }

    const firstCrumb = breadcrumbs[0];

    if (firstCrumb?.title === 'Dashboard') {
        return breadcrumbs;
    }

    return [dashboardCrumb, ...breadcrumbs];
}

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const page = usePage<{ auth?: { user?: { roles?: string[] } | null } }>();
    const resolvedBreadcrumbs = ensureDashboardPrefix(
        breadcrumbs.length > 0
            ? breadcrumbs
            : fallbackBreadcrumbs(page.url, page.props.auth?.user?.roles),
        page.props.auth?.user?.roles,
    );

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={resolvedBreadcrumbs} />
            </div>
            <div className="ml-auto">
                <NotificationCenter />
            </div>
        </header>
    );
}
