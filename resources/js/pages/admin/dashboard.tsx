import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Coins,
    FolderTree,
    Package,
    ShieldAlert,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as RechartsPrimitive from 'recharts';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import admin from '@/routes/admin';

type StatKey =
    | 'platform_revenue'
    | 'gross_sales'
    | 'new_users'
    | 'completed_orders';

type StatItem = {
    key: StatKey;
    label: string;
    value: string;
    delta: string;
    meta: string;
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

type RangeOption = {
    value: string;
    label: string;
};

type TrendPoint = {
    label: string;
    gross_sales: number;
    commission_revenue: number;
    plan_revenue: number;
    platform_revenue: number;
};

type BreakdownItem = {
    key: string;
    label: string;
    count: number;
    share: number;
};

type SellerRow = {
    name: string;
    gross_sales: number;
    platform_revenue: number;
    orders_count: number;
    average_rating: number;
};

type CategoryRow = {
    name: string;
    orders_count: number;
    gross_sales: number;
};

type HealthItem = {
    label: string;
    value: string;
    detail: string;
    tone: 'positive' | 'warning' | 'neutral';
};

type Props = {
    filters: {
        range: string;
        options: RangeOption[];
        revenue_month: {
            value: string;
            options: RangeOption[];
        };
    };
    stats: StatItem[];
    revenueTrend: TrendPoint[];
    orderFunnel: BreakdownItem[];
    paymentBreakdown: BreakdownItem[];
    topSellers: SellerRow[];
    topCategories: CategoryRow[];
    platformHealth: HealthItem[];
    insights: string[];
    recentActivity: ActivityItem[];
    businessStats: BusinessStat[];
};

const statIcons: Record<StatKey, React.ComponentType<{ className?: string }>> = {
    platform_revenue: Coins,
    gross_sales: TrendingUp,
    new_users: Users,
    completed_orders: Activity,
};

const seriesConfig = [
    {
        key: 'platform_revenue' as const,
        label: 'Platform revenue',
        color: '#0f766e',
    },
    {
        key: 'commission_revenue' as const,
        label: 'Commission',
        color: '#1d4ed8',
    },
    {
        key: 'plan_revenue' as const,
        label: 'Plan revenue',
        color: '#d97706',
    },
];

const revenueChartConfig = {
    platform_revenue: {
        label: 'Platform revenue',
        color: '#0f766e',
    },
    commission_revenue: {
        label: 'Commission',
        color: '#1d4ed8',
    },
    plan_revenue: {
        label: 'Plan revenue',
        color: '#d97706',
    },
} satisfies ChartConfig;

const categoryChartConfig = {
    gross_sales: {
        label: 'Gross sales',
        color: '#0f766e',
    },
} satisfies ChartConfig;

function useInViewOnce<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || inView) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) {
                    return;
                }

                setInView(true);
                observer.disconnect();
            },
            {
                threshold: 0.35,
                rootMargin: '0px 0px -8% 0px',
            },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [inView]);

    return { ref, inView };
}

function formatCurrency(value: number | string) {
    const amount = typeof value === 'number' ? value : Number(value);

    return `USD ${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function formatDateTime(value: string | null) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString();
}

function AnimatedNumber({
    value,
    formatter,
    className,
}: {
    value: number;
    formatter?: (value: number) => string;
    className?: string;
}) {
    const { ref, inView } = useInViewOnce<HTMLSpanElement>();
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (!inView) {
            return;
        }

        let frame = 0;
        let start: number | null = null;
        const duration = 1200;

        const animate = (timestamp: number) => {
            if (start === null) {
                start = timestamp;
            }

            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(value * eased);

            if (progress < 1) {
                frame = window.requestAnimationFrame(animate);
            }
        };

        frame = window.requestAnimationFrame(animate);

        return () => window.cancelAnimationFrame(frame);
    }, [inView, value]);

    return (
        <span ref={ref} className={className}>
            {formatter ? formatter(displayValue) : Math.round(displayValue).toString()}
        </span>
    );
}

function AnimatedMetricValue({
    value,
    kind = 'number',
    className,
}: {
    value: number | string;
    kind?: 'number' | 'currency' | 'decimal' | 'percent';
    className?: string;
}) {
    const numericValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numericValue)) {
        return <span className={className}>{String(value)}</span>;
    }

    if (kind === 'currency') {
        return (
            <AnimatedNumber
                value={numericValue}
                className={className}
                formatter={(next) => formatCurrency(next)}
            />
        );
    }

    if (kind === 'decimal') {
        return (
            <AnimatedNumber
                value={numericValue}
                className={className}
                formatter={(next) => next.toFixed(1)}
            />
        );
    }

    if (kind === 'percent') {
        return (
            <AnimatedNumber
                value={numericValue}
                className={className}
                formatter={(next) => `${next.toFixed(1)}%`}
            />
        );
    }

    return <AnimatedNumber value={numericValue} className={className} />;
}

function toneClasses(tone: HealthItem['tone']) {
    if (tone === 'positive') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200';
    }

    if (tone === 'warning') {
        return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200';
    }

    return 'border-border/70 bg-muted/20 text-foreground';
}

function TrendChart({ data }: { data: TrendPoint[] }) {
    return (
        <ChartContainer
            config={revenueChartConfig}
            className="h-[320px] w-full rounded-2xl border border-border/70 bg-background/80 p-4"
        >
            <RechartsPrimitive.AreaChart
                data={data}
                margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
            >
                <defs>
                    {seriesConfig.map((series) => (
                        <linearGradient
                            key={series.key}
                            id={`fill-${series.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor={series.color}
                                stopOpacity={0.28}
                            />
                            <stop
                                offset="95%"
                                stopColor={series.color}
                                stopOpacity={0.03}
                            />
                        </linearGradient>
                    ))}
                </defs>
                <RechartsPrimitive.CartesianGrid vertical={false} />
                <RechartsPrimitive.XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                />
                <RechartsPrimitive.YAxis
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            indicator="line"
                            formatter={(value) => formatCurrency(Number(value))}
                        />
                    }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {seriesConfig.map((series) => (
                    <RechartsPrimitive.Area
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        stroke={series.color}
                        fill={`url(#fill-${series.key})`}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        animationDuration={900}
                        animationEasing="ease-out"
                    />
                ))}
            </RechartsPrimitive.AreaChart>
        </ChartContainer>
    );
}

function AnimatedMeter({
    value,
    className,
}: {
    value: number;
    className: string;
}) {
    const { ref, inView } = useInViewOnce<HTMLDivElement>();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!inView) {
            return;
        }

        const timeout = window.setTimeout(() => setMounted(true), 60);

        return () => window.clearTimeout(timeout);
    }, [inView]);

    return (
        <div
            ref={ref}
            className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/8"
        >
            <div
                className={className}
                style={{
                    transition:
                        'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease',
                    transformOrigin: 'left center',
                    transform: `scaleX(${mounted ? Math.max(value, value > 0 ? 8 : 0) / 100 : 0})`,
                    opacity: mounted ? 1 : 0.5,
                }}
            />
        </div>
    );
}

function BreakdownCard({
    title,
    description,
    items,
    colors,
}: {
    title: string;
    description: string;
    items: BreakdownItem[];
    colors: string[];
}) {
    return (
        <section className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
            <div className="mb-4">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        key={item.key}
                        className="rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.06))] p-4 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium">{item.label}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.share}% of orders
                                </p>
                            </div>
                            <AnimatedMetricValue
                                value={item.count}
                                kind="number"
                                className="text-base font-semibold"
                            />
                        </div>
                        <div className="mt-3">
                            <AnimatedMeter
                                value={item.share}
                                className={`h-2 rounded-full ${colors[index % colors.length]} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AnimatedCategoryChart({
    data,
}: {
    data: CategoryRow[];
}) {
    const { ref, inView } = useInViewOnce<HTMLDivElement>();

    return (
        <div ref={ref}>
            {inView ? (
                <ChartContainer
                    key="animated-category-chart"
                    config={categoryChartConfig}
                    className="h-[280px] w-full rounded-2xl border border-border/70 bg-background/80 p-4"
                >
                    <RechartsPrimitive.BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
                    >
                        <RechartsPrimitive.CartesianGrid horizontal={false} />
                        <RechartsPrimitive.XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                        />
                        <RechartsPrimitive.YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            width={96}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    hideLabel
                                    formatter={(value) => formatCurrency(Number(value))}
                                />
                            }
                        />
                        <RechartsPrimitive.Bar
                            dataKey="gross_sales"
                            radius={[0, 10, 10, 0]}
                            fill="var(--color-gross_sales)"
                            animationDuration={900}
                            animationEasing="ease-out"
                        />
                    </RechartsPrimitive.BarChart>
                </ChartContainer>
            ) : (
                <div className="h-[280px] w-full rounded-2xl border border-border/70 bg-background/80 p-4" />
            )}
        </div>
    );
}

export default function AdminDashboard({
    filters,
    stats,
    revenueTrend,
    orderFunnel,
    paymentBreakdown,
    topSellers,
    topCategories,
    platformHealth,
    insights,
    recentActivity,
    businessStats,
}: Props) {
    const handleRangeChange = (value: string) => {
        router.get(
            '/admin/dashboard',
            {
                range: value,
                month: filters.revenue_month.value,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                preserveUrl: true,
            },
        );
    };

    const handleRevenueMonthChange = (value: string) => {
        router.get(
            '/admin/dashboard',
            {
                range: filters.range,
                month: value,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                preserveUrl: true,
            },
        );
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Dashboard"
                    description="Track marketplace growth, revenue movement, order flow, and operational risk from one admin view."
                />

                <section className="rounded-3xl border border-sidebar-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.16),rgba(13,148,136,0.07),rgba(245,158,11,0.14))] p-5 dark:border-sidebar-border">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="space-y-2">
                            <Badge variant="outline" className="bg-background/70">
                                Dashboard
                            </Badge>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Marketplace control tower
                            </h2>
                            <p className="max-w-3xl text-sm text-muted-foreground">
                                This dashboard now surfaces trendlines, funnel breakdowns, top performers,
                                and risk signals instead of only static totals.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            <div className="flex flex-wrap justify-end gap-2">
                                {filters.options.map((option) => (
                                    <Button
                                        key={option.value}
                                        size="sm"
                                        variant={
                                            filters.range === option.value ? 'default' : 'outline'
                                        }
                                        onClick={() => handleRangeChange(option.value)}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
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
                                <Button asChild size="sm" variant="outline">
                                    <Link href="/admin/users" prefetch>
                                        <Users className="mr-1.5 size-4" />
                                        Users
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => {
                        const Icon = statIcons[item.key] ?? Activity;

                        return (
                            <div
                                key={item.label}
                                className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{item.label}</p>
                                        <AnimatedMetricValue
                                            value={item.value}
                                            kind={
                                                item.key === 'new_users' ||
                                                item.key === 'completed_orders'
                                                    ? 'number'
                                                    : 'currency'
                                            }
                                            className="mt-3 block text-2xl font-semibold"
                                        />
                                    </div>
                                    <div className="rounded-2xl bg-muted/60 p-2.5">
                                        <Icon className="size-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    {item.delta}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                            </div>
                        );
                    })}
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
                    <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold">Revenue Trend</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Compare total platform revenue against its two revenue channels.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={filters.revenue_month.value}
                                    onValueChange={handleRevenueMonthChange}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        className="min-w-36 bg-background/80"
                                    >
                                        <SelectValue placeholder="Select month" />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        {filters.revenue_month.options.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Badge variant="outline">Time series</Badge>
                            </div>
                        </div>

                        <TrendChart data={revenueTrend} />

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Platform revenue total</p>
                                <AnimatedMetricValue
                                    value={revenueTrend.reduce(
                                        (sum, item) => sum + item.platform_revenue,
                                        0,
                                    )}
                                    kind="currency"
                                    className="mt-2 block text-xl font-semibold"
                                />
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Commission total</p>
                                <AnimatedMetricValue
                                    value={revenueTrend.reduce(
                                        (sum, item) => sum + item.commission_revenue,
                                        0,
                                    )}
                                    kind="currency"
                                    className="mt-2 block text-xl font-semibold"
                                />
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Plan revenue total</p>
                                <AnimatedMetricValue
                                    value={revenueTrend.reduce((sum, item) => sum + item.plan_revenue, 0)}
                                    kind="currency"
                                    className="mt-2 block text-xl font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    <section className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold">Key Insights</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Plain-language observations to help admins focus quickly.
                                </p>
                            </div>
                            <ShieldAlert className="size-4 text-muted-foreground" />
                        </div>

                        <div className="space-y-3">
                            {insights.map((insight, index) => (
                                <div
                                    key={`${insight}-${index}`}
                                    className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm"
                                >
                                    {insight}
                                </div>
                            ))}
                        </div>
                    </section>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    <BreakdownCard
                        title="Order Funnel"
                        description="Operational spread of marketplace orders in the selected period."
                        items={orderFunnel}
                        colors={['bg-slate-500', 'bg-sky-600', 'bg-amber-500', 'bg-emerald-600', 'bg-rose-600']}
                    />
                    <BreakdownCard
                        title="Payment Status Mix"
                        description="See where payments are still waiting, held, released, or refunded."
                        items={paymentBreakdown}
                        colors={['bg-slate-500', 'bg-blue-700', 'bg-teal-600', 'bg-rose-600']}
                    />
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">Top Sellers</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Highest-performing sellers by paid GMV in the selected range.
                                </p>
                            </div>
                            <Badge variant="outline">Leaderboard</Badge>
                        </div>

                        <div className="space-y-3">
                            {topSellers.length === 0 && (
                                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                    No paid seller activity in the selected period yet.
                                </div>
                            )}

                            {topSellers.map((seller, index) => (
                                <div
                                    key={`${seller.name}-${index}`}
                                    className="rounded-2xl border border-border/70 p-4"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    #{index + 1}
                                                </span>
                                                <p className="font-medium">{seller.name}</p>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                <AnimatedMetricValue
                                                    value={seller.orders_count}
                                                    kind="number"
                                                />{' '}
                                                paid orders · rating{' '}
                                                <AnimatedMetricValue
                                                    value={seller.average_rating}
                                                    kind="decimal"
                                                />
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <AnimatedMetricValue
                                                value={seller.gross_sales}
                                                kind="currency"
                                                className="block font-semibold"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Revenue to platform{' '}
                                                <AnimatedMetricValue
                                                    value={seller.platform_revenue}
                                                    kind="currency"
                                                />
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4">
                            <h3 className="font-semibold">Top Categories</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Revenue distribution across your marketplace catalog.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {topCategories.length === 0 && (
                                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                    Category performance will appear here after paid orders start landing.
                                </div>
                            )}

                            {topCategories.length > 0 ? (
                                <AnimatedCategoryChart data={topCategories} />
                            ) : null}

                            {topCategories.map((category) => (
                                <div
                                    key={`${category.name}-summary`}
                                    className="rounded-2xl border border-border/70 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{category.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                <AnimatedMetricValue
                                                    value={category.orders_count}
                                                    kind="number"
                                                />{' '}
                                                paid orders
                                            </p>
                                        </div>
                                        <AnimatedMetricValue
                                            value={category.gross_sales}
                                            kind="currency"
                                            className="text-sm font-semibold"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4">
                            <h3 className="font-semibold">Platform Health</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Quality, risk, and efficiency signals for the selected window.
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {platformHealth.map((item) => (
                                <div
                                    key={item.label}
                                    className={`rounded-2xl border p-4 ${toneClasses(item.tone)}`}
                                >
                                    <p className="text-sm opacity-80">{item.label}</p>
                                    <AnimatedMetricValue
                                        value={item.value.replace('USD ', '').replace('%', '')}
                                        kind={
                                            item.value.startsWith('USD ')
                                                ? 'currency'
                                                : item.value.endsWith('%')
                                                  ? 'percent'
                                                  : Number(item.value) % 1 !== 0
                                                    ? 'decimal'
                                                    : 'number'
                                        }
                                        className="mt-2 block text-2xl font-semibold"
                                    />
                                    <p className="mt-1 text-xs opacity-80">{item.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4">
                            <h3 className="font-semibold">Platform Overview</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Structural business numbers that support the analytics view.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {businessStats.map((item) => (
                                <div key={item.label} className="rounded-2xl border border-border/70 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                                        </div>
                                        <AnimatedNumber
                                            value={item.value}
                                            className="text-lg font-semibold"
                                            formatter={(next) =>
                                                new Intl.NumberFormat().format(Math.round(next))
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Recent Activity</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Latest user, plan, and category events to support analytics context.
                            </p>
                        </div>
                        <Badge variant="outline">Live feed</Badge>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        {recentActivity.length === 0 && (
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                No recent activity yet.
                            </div>
                        )}

                        {recentActivity.map((item) => (
                            <div
                                key={`${item.text}-${item.created_at ?? ''}`}
                                className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                            >
                                <p className="text-sm">{item.text}</p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {formatDateTime(item.created_at)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: admin.dashboard.url() }],
};
