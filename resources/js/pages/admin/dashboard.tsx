import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    FolderTree,
    Package,
    UserCheck,
    Users,
} from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import admin from '@/routes/admin';

type StatKey = 'users' | 'active_users' | 'categories' | 'plans';

type StatItem = {
    key: StatKey;
    label: string;
    value: number;
    delta: string;
};

type ActivityItem = {
    text: string;
    created_at: string | null;
};

type Props = {
    stats: StatItem[];
    recentActivity: ActivityItem[];
};

const statIcons: Record<StatKey, React.ComponentType<{ className?: string }>> = {
    users: Users,
    active_users: UserCheck,
    categories: FolderTree,
    plans: Package,
};

export default function AdminDashboard({ stats, recentActivity }: Props) {
    const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

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
                            <p className="text-sm font-medium text-muted-foreground">Control Center</p>
                            <h2 className="text-xl font-semibold tracking-tight">Super Admin Workspace</h2>
                            <p className="text-sm text-muted-foreground">
                                Manage categories, plans, and users from one place.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link href={admin.categories.index.url()} prefetch>
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
                                    <p className="text-sm text-muted-foreground">{item.label}</p>
                                    <Icon className="size-4 text-muted-foreground" />
                                </div>
                                <p className="mt-3 text-2xl font-semibold">{formatNumber(item.value)}</p>
                                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{item.delta}</p>
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
                                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 font-semibold">System Health</h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Queue Workers</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">Healthy</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-[88%] rounded-full bg-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Payment Gateway</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">Stable</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-[93%] rounded-full bg-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Notification Jobs</span>
                                    <span className="text-amber-600 dark:text-amber-400">Minor Delay</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-[67%] rounded-full bg-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
    ],
};
