import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Bookmark,
    CreditCard,
    LayoutGrid,
    ReceiptText,
    Search,
    ShieldAlert,
    ShoppingBag,
    Store,
    Wallet2,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
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
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth, notifications } = usePage<{
        auth: { user: { roles?: string[]; permissions?: string[] } | null };
        notifications?: { enabled?: boolean; unread_count?: number };
    }>().props;
    const isSeller = auth.user?.roles?.includes('seller') ?? false;
    const isBuyer = auth.user?.roles?.includes('buyer') ?? false;
    const permissions = auth.user?.permissions ?? [];
    const canAccess = (permission: string) => permissions.includes(permission);
    const notificationBadge =
        notifications?.enabled && (notifications.unread_count ?? 0) > 0
            ? String(notifications.unread_count)
            : null;
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Notifications',
            href: '/notifications',
            icon: Bell,
            badge: notificationBadge,
        },
        ...(isSeller && canAccess('seller.gigs.access')
            ? [
                  {
                      title: 'My Gigs',
                      href: '/seller/gigs',
                      icon: Store,
                  } satisfies NavItem,
              ]
            : []),
        ...(isSeller && canAccess('seller.plans.access')
            ? [
                  {
                      title: 'Plans',
                      href: '/seller/plans',
                      icon: ReceiptText,
                  } satisfies NavItem,
              ]
            : []),
        ...(isSeller && canAccess('seller.orders.access')
            ? [
                  {
                      title: 'Orders',
                      href: '/seller/orders',
                      icon: ShoppingBag,
                  } satisfies NavItem,
              ]
            : []),
        ...(isSeller && canAccess('seller.orders.access')
            ? [
                  {
                      title: 'My Disputes',
                      href: '/disputes',
                      icon: ShieldAlert,
                  } satisfies NavItem,
              ]
            : []),
        ...(isSeller && canAccess('seller.wallet.access')
            ? [
                  {
                      title: 'Wallet',
                      href: '/seller/wallet',
                      icon: Wallet2,
                  } satisfies NavItem,
              ]
            : []),
        ...(isSeller && canAccess('seller.payments.access')
            ? [
                  {
                      title: 'Payment History',
                      href: '/seller/payments',
                      icon: CreditCard,
                  } satisfies NavItem,
              ]
            : []),
        ...(isBuyer && canAccess('buyer.gigs.access')
            ? [
                  {
                      title: 'Explore Gigs',
                      href: '/buyer/gigs',
                      icon: Search,
                  } satisfies NavItem,
              ]
            : []),
        ...(isBuyer && canAccess('buyer.gigs.access')
            ? [
                  {
                      title: 'Saved Gigs',
                      href: '/buyer/favourites',
                      icon: Bookmark,
                  } satisfies NavItem,
              ]
            : []),
        ...(isBuyer && canAccess('buyer.orders.access')
            ? [
                  {
                      title: 'Orders',
                      href: '/buyer/orders',
                      icon: ShoppingBag,
                  } satisfies NavItem,
              ]
            : []),
        ...(isBuyer && canAccess('buyer.orders.access')
            ? [
                  {
                      title: 'My Disputes',
                      href: '/disputes',
                      icon: ShieldAlert,
                  } satisfies NavItem,
              ]
            : []),
        ...(isBuyer && canAccess('buyer.payments.access')
            ? [
                  {
                      title: 'Payment History',
                      href: '/buyer/payments',
                      icon: CreditCard,
                  } satisfies NavItem,
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
