import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookText,
    BadgePercent,
    LayoutGrid,
    Package,
    Settings,
    ShoppingBag,
    Store,
    Tag,
    Users,
    Wallet2,
} from 'lucide-react';
import { isValidElement } from 'react';
import { AppContent } from '@/components/app-content';
import AppLogo from '@/components/app-logo';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import admin from '@/routes/admin';
import type { BreadcrumbItem, NavItem } from '@/types';

const adminNavItems: NavItem[] = [
    { title: 'Dashboard', href: admin.dashboard.url(), icon: LayoutGrid },
    { title: 'Notifications', href: '/notifications', icon: Bell },
    { title: 'Categories', href: admin.categories.index.url(), icon: Tag },
    { title: 'Plans', href: '/admin/plans', icon: Package },
    { title: 'Coupons', href: '/admin/coupons', icon: BadgePercent },
    { title: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { title: 'Gigs', href: '/admin/gigs', icon: Store },
    { title: 'Withdrawals', href: '/admin/withdrawals', icon: Wallet2 },
    { title: 'Ledger', href: '/admin/ledger', icon: BookText },
    { title: 'Users', href: '/admin/users', icon: Users },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
];

function AdminSidebar() {
    const { notifications } = usePage<{
        notifications?: { enabled?: boolean; unread_count?: number };
    }>().props;
    const items = adminNavItems.map((item) =>
        item.title === 'Notifications'
            ? {
                  ...item,
                  badge:
                      notifications?.enabled &&
                      (notifications.unread_count ?? 0) > 0
                          ? String(notifications.unread_count)
                          : null,
              }
            : item,
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={admin.dashboard.url()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

export default function AdminLayout({
    children,
    breadcrumbs = [],
}: {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}) {
    const inferredBreadcrumbs =
        breadcrumbs.length > 0 || !isValidElement(children)
            ? breadcrumbs
            : (((
                  children.type as {
                      layout?: { breadcrumbs?: BreadcrumbItem[] };
                  }
              ).layout?.breadcrumbs ?? []) as BreadcrumbItem[]);

    return (
        <AppShell variant="sidebar">
            <AdminSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={inferredBreadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
