import { Link, usePage } from '@inertiajs/react';
import { CreditCard, LayoutGrid, ReceiptText, Search, ShoppingBag, Store, Wallet2 } from 'lucide-react';
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
    const { auth } = usePage<{ auth: { user: { roles?: string[] } | null } }>().props;
    const isSeller = auth.user?.roles?.includes('seller') ?? false;
    const isBuyer = auth.user?.roles?.includes('buyer') ?? false;
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        ...(isSeller
            ? [
                  {
                      title: 'My Gigs',
                      href: '/seller/gigs',
                      icon: Store,
                  } satisfies NavItem,
                  {
                      title: 'Plans',
                      href: '/seller/plans',
                      icon: ReceiptText,
                  } satisfies NavItem,
                  {
                      title: 'Orders',
                      href: '/seller/orders',
                      icon: ShoppingBag,
                  } satisfies NavItem,
                  {
                      title: 'Wallet',
                      href: '/seller/wallet',
                      icon: Wallet2,
                  } satisfies NavItem,
                  {
                      title: 'Payment History',
                      href: '/seller/payments',
                      icon: CreditCard,
                  } satisfies NavItem,
              ]
            : []),
        ...(isBuyer
            ? [
                  {
                      title: 'Explore Gigs',
                      href: '/buyer/gigs',
                      icon: Search,
                  } satisfies NavItem,
                  {
                      title: 'Orders',
                      href: '/buyer/orders',
                      icon: ShoppingBag,
                  } satisfies NavItem,
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
