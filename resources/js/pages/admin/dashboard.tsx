import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    BadgeDollarSign,
    Coins,
    FolderTree,
    Package,
    Users,
} from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import admin from '@/routes/admin';

type StatKey =
    | 'paid_plan_revenue'
    | 'commission_revenue'
    | 'total_platform_revenue'
    | 'gross_seller_sales';

type StatItem = {
    key: StatKey;
    label: string;
    value: string;
    delta: string;
};

type ActivityItem = {
    text: string;
    created_at: string | null;
};

type BusinessStat = {
    label: string;
    value: number;
    detail: string;
};

type Props = {
    stats: StatItem[];
    recentActivity: ActivityItem[];
    businessStats: BusinessStat[];
};

const statIcons: Record<
    StatKey,
    React.ComponentType<{ className?: string }>
> = {
    paid_plan_revenue: Package,
    commission_revenue: BadgeDollarSign,
    total_platform_revenue: Coins,
    gross_seller_sales: Activity,
};

export default function AdminDashboard({
    stats,
    recentActivity,
    businessStats,
}: Props) {
    const formatNumber = (value: number) =>
        new Intl.NumberFormat().format(value);

    const formatDateTime = (value: string | null) => {
        if (!value) {
            return '';
        }

        return new Date(value).toLocaleString();
    };

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Dashboard"
                    description="Overview of your platform."
                />

                <section className="rounded-xl border border-sidebar-border/70 bg-gradient-to-r from-sky-500/15 via-emerald-500/10 to-transparent p-5 dark:border-sidebar-border">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                Control Center
                            </p>
                            <h2 className="text-xl font-semibold tracking-tight">
                                Super Admin Workspace
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Manage categories, plans, and users from one
                                place.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link
                                    href={admin.categories.index.url()}
                                    prefetch
                                >
                                    <FolderTree className="mr-1.5 size-4" />
                                    Categories
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/admin/plans" prefetch>
                                    <Package className="mr-1.5 size-4" />
                                    Plans
                                </Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/admin/users" prefetch>
                                    <Users className="mr-1.5 size-4" />
                                    Users
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => {
                        const Icon = statIcons[item.key] ?? Activity;

                        return (
                            <div
                                key={item.label}
                                className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {item.label}
                                    </p>
                                    <Icon className="size-4 text-muted-foreground" />
                                </div>
                                <p className="mt-3 text-2xl font-semibold">
                                    USD {item.value}
                                </p>
                                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    {item.delta}
                                </p>
                            </div>
                        );
                    })}
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 lg:col-span-2 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Recent Activity</h3>
                            <Badge variant="outline">Live Feed</Badge>
                        </div>
                        <ul className="space-y-3 text-sm">
                            {recentActivity.length === 0 && (
                                <li className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground">
                                    No recent activity yet.
                                </li>
                            )}
                            {recentActivity.map((item) => (
                                <li
                                    key={`${item.text}-${item.created_at ?? ''}`}
                                    className="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                                >
                                    <p>{item.text}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {formatDateTime(item.created_at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 font-semibold">
                            Platform Overview
                        </h3>
                        <div className="space-y-3">
                            {businessStats.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-lg border border-border/70 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">
                                                {item.label}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.detail}
                                            </p>
                                        </div>
                                        <span className="text-lg font-semibold">
                                            {formatNumber(item.value)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: admin.dashboard.url() }],
};
