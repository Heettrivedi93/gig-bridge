import { isValidElement } from 'react';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const inferredBreadcrumbs =
        breadcrumbs.length > 0 || !isValidElement(children)
            ? breadcrumbs
            : (((children.type as { layout?: { breadcrumbs?: BreadcrumbItem[] } }).layout?.breadcrumbs ?? []) as BreadcrumbItem[]);

    return <AppLayoutTemplate breadcrumbs={inferredBreadcrumbs}>{children}</AppLayoutTemplate>;
}
