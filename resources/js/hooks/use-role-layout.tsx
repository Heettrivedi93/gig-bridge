import { usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export function useRoleLayout() {
    const { auth } = usePage<{ auth: { user: { roles: string[] } | null } }>()
        .props;
    const isSuperAdmin = auth?.user?.roles?.includes('super_admin') ?? false;

    return { Layout: isSuperAdmin ? AdminLayout : AppLayout, isSuperAdmin };
}

export function settingsLayout(breadcrumbs: BreadcrumbItem[] = []) {
    return function SettingsPageLayout({
        children,
    }: {
        children: React.ReactNode;
    }) {
        const { Layout } = useRoleLayout();

        return <Layout breadcrumbs={breadcrumbs}>{children}</Layout>;
    };
}

export function roleLayout(
    resolveBreadcrumbs:
        | BreadcrumbItem[]
        | ((isSuperAdmin: boolean) => BreadcrumbItem[]) = [],
) {
    return function RolePageLayout({
        children,
    }: {
        children: React.ReactNode;
    }) {
        const { Layout, isSuperAdmin } = useRoleLayout();
        const breadcrumbs =
            typeof resolveBreadcrumbs === 'function'
                ? resolveBreadcrumbs(isSuperAdmin)
                : resolveBreadcrumbs;

        return <Layout breadcrumbs={breadcrumbs}>{children}</Layout>;
    };
}
