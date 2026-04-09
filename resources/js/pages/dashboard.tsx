import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    CircleDollarSign,
    Clock3,
    ShoppingBag,
    Sparkles,
    Wallet,
    Wallet2,
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
import { dashboard } from '@/routes';

type DashboardStat = {
    label: string;
    value: string | number;
};

type SellerStat = {
    key: string;
    label: string;
    value: string | number;
    delta: string;
    meta: string;
};

type WalletSummary = {
    currency: string;
    available_balance: string;
    pending_balance: string;
    escrow_balance: string;
    releasable_orders: number;
    active_orders: number;
    delivered_orders: number;
};

type RevenueSummary = {
    currency: string;
    gross_sales: string;
    platform_fees: string;
    net_revenue: string;
    pending_release: string;
    withdrawn_total: string;
};

type RangeOption = {
    value: string;
    label: string;
};

type OrderBreakdown = {
    key: string;
    label: string;
    count: number;
    share: number;
};

type WalletBreakdown = {
    label: string;
    value: number;
    detail: string;
    kind: 'currency';
};

type SellerHealth = {
    label: string;
    value: string;
    detail: string;
    tone: 'positive' | 'warning' | 'neutral';
};

type SellerAnalytics = {
    stats: SellerStat[];
    revenueTrend: {
        label: string;
        gross_sales: number;
        net_revenue: number;
        platform_fees: number;
    }[];
    orderBreakdown: OrderBreakdown[];
    walletBreakdown: WalletBreakdown[];
    topGigs: {
        title: string;
        orders_count: number;
        gross_sales: number;
        net_revenue: number;
    }[];
    sellerHealth: SellerHealth[];
    insights: string[];
};

type BuyerAnalytics = {
    stats: SellerStat[];
    spendTrend: {
        label: string;
        spend: number;
        discounts: number;
        orders: number;
    }[];
    orderBreakdown: OrderBreakdown[];
    favoriteSellers: {
        name: string;
        orders_count: number;
        spend: number;
    }[];
    topCategories: {
        name: string;
        orders_count: number;
        spend: number;
    }[];
    buyerHealth: SellerHealth[];
    insights: string[];
};

type PageProps = {
    role: 'seller' | 'buyer' | 'general';
    stats: DashboardStat[];
    filters: null | {
        range: string;
        options: RangeOption[];
        revenue_month: {
            value: string;
            options: RangeOption[];
        };
    };
    sellerAnalytics: SellerAnalytics | null;
    buyerAnalytics: BuyerAnalytics | null;
    walletSummary: WalletSummary | null;
    revenueSummary: RevenueSummary | null;
    recentOrders: {
        id: number;
        gig_title: string;
        counterparty_name: string;
        status: string;
        payment_status: string;
        fund_status: string;
        total: string;
        updated_at: string | null;
    }[];
    recentTransactions: {
        id: number;
        type: string;
        direction: string;
        balance_bucket: string;
        amount: string;
        description: string | null;
        created_at: string | null;
    }[];
};

const sellerChartConfig = {
    net_revenue: {
        label: 'Net revenue',
        color: '#0f766e',
    },
    gross_sales: {
        label: 'Gross sales',
        color: '#1d4ed8',
    },
    platform_fees: {
        label: 'Platform fees',
        color: '#d97706',
    },
} satisfies ChartConfig;

const buyerChartConfig = {
    spend: {
        label: 'Spend',
        color: '#1d4ed8',
    },
    discounts: {
        label: 'Discounts',
        color: '#d97706',
    },
} satisfies ChartConfig;

const sellerSeries = [
    { key: 'net_revenue' as const, color: '#0f766e' },
    { key: 'gross_sales' as const, color: '#1d4ed8' },
    { key: 'platform_fees' as const, color: '#d97706' },
];

const buyerSeries = [
    { key: 'spend' as const, color: '#1d4ed8' },
    { key: 'discounts' as const, color: '#d97706' },
];

const sellerStatIcons = {
    net_revenue: Wallet,
    gross_sales: CircleDollarSign,
    open_orders: ShoppingBag,
    available_withdraw: Wallet2,
} as const;

const buyerStatIcons = {
    total_spend: Wallet,
    pending_actions: Clock3,
    completed_orders: BadgeCheck,
    active_orders: ShoppingBag,
} as const;

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

function badgeVariant(value: string) {
    if (['completed', 'released', 'paid'].includes(value)) {
        return 'default';
    }

    if (['cancelled', 'failed', 'refunded'].includes(value)) {
        return 'destructive';
    }

    return 'secondary';
}

function formatCurrency(value: number | string) {
    const amount = typeof value === 'number' ? value : Number(value);

    return `USD ${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)}`;
}

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
    value: string | number;
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

function toneClasses(tone: SellerHealth['tone']) {
    if (tone === 'positive') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200';
    }

    if (tone === 'warning') {
        return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200';
    }

    return 'border-border/70 bg-muted/20 text-foreground';
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
        <div ref={ref} className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/8">
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

function SellerTrendChart({
    data,
}: {
    data: SellerAnalytics['revenueTrend'];
}) {
    return (
        <ChartContainer
            config={sellerChartConfig}
            className="h-[340px] w-full rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08))] p-4 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
        >
            <RechartsPrimitive.AreaChart data={data} margin={{ top: 18, right: 14, left: 4, bottom: 8 }}>
                <defs>
                    {sellerSeries.map((series) => (
                        <linearGradient key={series.key} id={`seller-fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="5%"
                                stopColor={series.color}
                                stopOpacity={series.key === 'net_revenue' ? 0.24 : 0.14}
                            />
                            <stop offset="95%" stopColor={series.color} stopOpacity={0.015} />
                        </linearGradient>
                    ))}
                </defs>
                <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 6" />
                <RechartsPrimitive.XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={10} />
                <RechartsPrimitive.YAxis tickLine={false} axisLine={false} width={72} tickMargin={10} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" formatter={(value) => formatCurrency(Number(value))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                {sellerSeries.map((series) => (
                    <RechartsPrimitive.Area
                        key={series.key}
                        type="monotoneX"
                        dataKey={series.key}
                        stroke={series.color}
                        fill={`url(#seller-fill-${series.key})`}
                        strokeWidth={series.key === 'net_revenue' ? 3 : 2.25}
                        fillOpacity={1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animationBegin={series.key === 'net_revenue' ? 0 : series.key === 'gross_sales' ? 180 : 320}
                        animationDuration={1100}
                        animationEasing="ease-in-out"
                        activeDot={{
                            r: series.key === 'net_revenue' ? 5 : 4,
                            stroke: series.color,
                            strokeWidth: 2,
                            fill: '#ffffff',
                        }}
                        dot={false}
                    />
                ))}
            </RechartsPrimitive.AreaChart>
        </ChartContainer>
    );
}

function BuyerTrendChart({
    data,
}: {
    data: BuyerAnalytics['spendTrend'];
}) {
    return (
        <ChartContainer
            config={buyerChartConfig}
            className="h-[340px] w-full rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08))] p-4 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
        >
            <RechartsPrimitive.AreaChart data={data} margin={{ top: 18, right: 14, left: 4, bottom: 8 }}>
                <defs>
                    {buyerSeries.map((series) => (
                        <linearGradient key={series.key} id={`buyer-fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={series.color} stopOpacity={series.key === 'spend' ? 0.22 : 0.12} />
                            <stop offset="95%" stopColor={series.color} stopOpacity={0.015} />
                        </linearGradient>
                    ))}
                </defs>
                <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 6" />
                <RechartsPrimitive.XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={10} />
                <RechartsPrimitive.YAxis tickLine={false} axisLine={false} width={72} tickMargin={10} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" formatter={(value) => formatCurrency(Number(value))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                {buyerSeries.map((series) => (
                    <RechartsPrimitive.Area
                        key={series.key}
                        type="monotoneX"
                        dataKey={series.key}
                        stroke={series.color}
                        fill={`url(#buyer-fill-${series.key})`}
                        strokeWidth={series.key === 'spend' ? 3 : 2.25}
                        fillOpacity={1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animationBegin={series.key === 'spend' ? 0 : 220}
                        animationDuration={1100}
                        animationEasing="ease-in-out"
                        activeDot={{
                            r: series.key === 'spend' ? 5 : 4,
                            stroke: series.color,
                            strokeWidth: 2,
                            fill: '#ffffff',
                        }}
                        dot={false}
                    />
                ))}
            </RechartsPrimitive.AreaChart>
        </ChartContainer>
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
    items: OrderBreakdown[];
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
                                <p className="mt-1 text-xs text-muted-foreground">{item.share}% of orders</p>
                            </div>
                            <AnimatedMetricValue value={item.count} kind="number" className="text-base font-semibold" />
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

function LegacyDashboard({
    role,
    stats,
    walletSummary,
    revenueSummary,
    recentOrders,
    recentTransactions,
}: Omit<PageProps, 'filters' | 'sellerAnalytics'>) {
    const ordersHref = role === 'buyer' ? '/buyer/orders' : '/seller/orders';
    const headingDescription =
        role === 'seller'
            ? 'Track released funds, orders waiting on buyers, and recent wallet movement from one place.'
            : role === 'buyer'
              ? 'Review your active purchases, pending payments, and deliveries that still need your response.'
              : 'Welcome back. Here is your current account overview.';

    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-6">
            <Heading title="Dashboard" description={headingDescription} />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                    <div key={item.label} className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    </div>
                ))}
            </div>

            {walletSummary && (
                <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Wallet2 className="size-4" />
                                    Seller wallet
                                </div>
                                <p className="mt-2 text-3xl font-semibold">
                                    {walletSummary.currency} {walletSummary.available_balance}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Released funds currently available for withdrawal requests.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={ordersHref} prefetch>
                                        View Orders
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href="/seller/wallet" prefetch>
                                        Open Wallet
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Pending withdrawals</p>
                                <p className="mt-2 text-xl font-semibold">
                                    {walletSummary.currency} {walletSummary.pending_balance}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Releasable orders</p>
                                <p className="mt-2 text-xl font-semibold">{walletSummary.releasable_orders}</p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Delivered awaiting buyer</p>
                                <p className="mt-2 text-xl font-semibold">{walletSummary.delivered_orders}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Recent Wallet Activity</h3>
                            <Badge variant="outline">Live</Badge>
                        </div>

                        {recentTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Wallet activity will appear here once funds are released, refunded, or moved into payout review.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {recentTransactions.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-border/70 px-3 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{item.description ?? item.type}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {item.balance_bucket} · {formatDate(item.created_at)}
                                                </p>
                                            </div>
                                            <Badge variant={item.direction === 'credit' ? 'default' : 'outline'}>
                                                {item.direction === 'credit' ? '+' : '-'}
                                                {item.amount}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {revenueSummary && (
                <section className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold">Revenue Snapshot</h3>
                            <p className="text-sm text-muted-foreground">Revenue generated from your own sold services.</p>
                        </div>
                        <Badge variant="outline">Seller Revenue</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {[
                            ['Gross sales', revenueSummary.gross_sales],
                            ['Platform fees', revenueSummary.platform_fees],
                            ['Net revenue', revenueSummary.net_revenue],
                            ['Pending release', revenueSummary.pending_release],
                            ['Withdrawn', revenueSummary.withdrawn_total],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="mt-2 text-xl font-semibold">
                                    {revenueSummary.currency} {value}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-semibold">{role === 'buyer' ? 'Recent Orders' : 'Order Pipeline'}</h3>
                        <p className="text-sm text-muted-foreground">
                            {role === 'buyer'
                                ? 'Keep an eye on what still needs payment, review, or completion.'
                                : 'See which orders need delivery, buyer review, or fund release next.'}
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={ordersHref} prefetch>
                            Open Orders
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="px-5 py-10 text-sm text-muted-foreground">No orders yet.</div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                        <th className="px-5 py-3 font-medium">Order</th>
                                        <th className="px-5 py-3 font-medium">{role === 'buyer' ? 'Seller' : 'Buyer'}</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium">Payment</th>
                                        <th className="px-5 py-3 font-medium">Funds</th>
                                        <th className="px-5 py-3 font-medium">Total</th>
                                        <th className="px-5 py-3 font-medium">Updated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recentOrders.map((order) => (
                                        <tr key={order.id} className="bg-background">
                                            <td className="px-5 py-4">
                                                <p className="font-medium">{order.gig_title}</p>
                                                <p className="text-xs text-muted-foreground">Order #{order.id}</p>
                                            </td>
                                            <td className="px-5 py-4">{order.counterparty_name}</td>
                                            <td className="px-5 py-4">
                                                <Badge variant={badgeVariant(order.status)}>{order.status}</Badge>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge variant={badgeVariant(order.payment_status)}>{order.payment_status}</Badge>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge variant="outline">{order.fund_status}</Badge>
                                            </td>
                                            <td className="px-5 py-4 font-medium">USD {order.total}</td>
                                            <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(order.updated_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-3 p-4 lg:hidden">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="rounded-lg border border-border/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{order.gig_title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Order #{order.id} · {order.counterparty_name}
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium">USD {order.total}</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant={badgeVariant(order.status)}>{order.status}</Badge>
                                        <Badge variant={badgeVariant(order.payment_status)}>{order.payment_status}</Badge>
                                        <Badge variant="outline">{order.fund_status}</Badge>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock3 className="size-3.5" />
                                        {formatDate(order.updated_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            {!walletSummary && role === 'general' && (
                <section className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <ShoppingBag className="size-4" />
                        No role-specific data yet
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Assign a buyer, seller, or super admin role to unlock the full operational dashboard for this account.
                    </p>
                </section>
            )}
        </div>
    );
}

function SellerDashboard({
    filters,
    sellerAnalytics,
    recentOrders,
    recentTransactions,
}: Pick<PageProps, 'filters' | 'sellerAnalytics' | 'recentOrders' | 'recentTransactions'>) {
    if (!filters || !sellerAnalytics) {
        return null;
    }

    const handleRevenueMonthChange = (value: string) => {
        router.get(
            '/dashboard',
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

    const handleRangeChange = (value: string) => {
        router.get(
            '/dashboard',
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

    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-6">
            <Heading
                title="Seller Analytics"
                description="Track your revenue momentum, order flow, payout readiness, and top-performing gigs from one view."
            />

            <section className="rounded-3xl border border-sidebar-border/70 bg-[linear-gradient(135deg,rgba(244,63,94,0.16),rgba(251,113,133,0.08),rgba(251,191,36,0.16))] p-5 dark:border-sidebar-border">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-2">
                        <Badge variant="outline" className="bg-background/70">
                            Seller Analytics
                        </Badge>
                        <h2 className="text-2xl font-semibold tracking-tight">Revenue and delivery cockpit</h2>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Stay on top of sales, buyer response bottlenecks, payout readiness, and the gigs driving your store.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {filters.options.map((option) => (
                                <Button
                                    key={option.value}
                                    size="sm"
                                    variant={filters.range === option.value ? 'default' : 'outline'}
                                    onClick={() => handleRangeChange(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link href="/seller/orders" prefetch>
                                    <ShoppingBag className="mr-1.5 size-4" />
                                    Orders
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/seller/wallet" prefetch>
                                    <Wallet2 className="mr-1.5 size-4" />
                                    Wallet
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {sellerAnalytics.stats.map((item) => {
                    const Icon = sellerStatIcons[item.key as keyof typeof sellerStatIcons] ?? Sparkles;

                    return (
                        <div key={item.key} className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">{item.label}</p>
                                    <AnimatedMetricValue
                                        value={item.value}
                                        kind={item.key === 'open_orders' ? 'number' : 'currency'}
                                        className="mt-3 block text-2xl font-semibold"
                                    />
                                </div>
                                <div className="rounded-2xl bg-muted/60 p-2.5">
                                    <Icon className="size-4 text-muted-foreground" />
                                </div>
                            </div>
                            <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">{item.delta}</p>
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
                            <p className="mt-1 text-sm text-muted-foreground">See how gross sales, net revenue, and fees move over time.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={filters.revenue_month.value} onValueChange={handleRevenueMonthChange}>
                                <SelectTrigger size="sm" className="min-w-36 bg-background/80">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {filters.revenue_month.options.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Badge variant="outline">Seller revenue</Badge>
                        </div>
                    </div>

                    <SellerTrendChart data={sellerAnalytics.revenueTrend} />

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">Net revenue total</p>
                            <AnimatedMetricValue
                                value={sellerAnalytics.revenueTrend.reduce((sum, item) => sum + item.net_revenue, 0)}
                                kind="currency"
                                className="mt-2 block text-xl font-semibold"
                            />
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">Gross sales total</p>
                            <AnimatedMetricValue
                                value={sellerAnalytics.revenueTrend.reduce((sum, item) => sum + item.gross_sales, 0)}
                                kind="currency"
                                className="mt-2 block text-xl font-semibold"
                            />
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">Platform fees total</p>
                            <AnimatedMetricValue
                                value={sellerAnalytics.revenueTrend.reduce((sum, item) => sum + item.platform_fees, 0)}
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
                            <p className="mt-1 text-sm text-muted-foreground">A few quick signals to help you focus where it matters.</p>
                        </div>
                        <Sparkles className="size-4 text-muted-foreground" />
                    </div>

                    <div className="space-y-3">
                        {sellerAnalytics.insights.map((insight, index) => (
                            <div key={`${insight}-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                                {insight}
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <BreakdownCard
                    title="Order Pipeline"
                    description="Track how your orders are moving from active work to buyer acceptance."
                    items={sellerAnalytics.orderBreakdown}
                    colors={['bg-sky-600', 'bg-amber-500', 'bg-emerald-600', 'bg-rose-600']}
                />

                <section className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4">
                        <h3 className="font-semibold">Payout Readiness</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Your wallet position and payout movement at a glance.</p>
                    </div>
                    <div className="space-y-3">
                        {sellerAnalytics.walletBreakdown.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-medium">{item.label}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                                    </div>
                                    <AnimatedMetricValue value={item.value} kind="currency" className="text-base font-semibold" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Top Gigs</h3>
                            <p className="mt-1 text-sm text-muted-foreground">See which services are actually driving revenue.</p>
                        </div>
                        <Badge variant="outline">Performance</Badge>
                    </div>

                    <div className="space-y-3">
                        {sellerAnalytics.topGigs.length === 0 && (
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                Gig performance will appear here after paid orders start landing.
                            </div>
                        )}

                        {sellerAnalytics.topGigs.map((gig, index) => (
                            <div key={`${gig.title}-${index}`} className="rounded-2xl border border-border/70 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                            <p className="font-medium">{gig.title}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            <AnimatedMetricValue value={gig.orders_count} kind="number" /> paid orders
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <AnimatedMetricValue value={gig.gross_sales} kind="currency" className="block font-semibold" />
                                        <p className="text-xs text-muted-foreground">
                                            Net revenue <AnimatedMetricValue value={gig.net_revenue} kind="currency" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Recent Wallet Activity</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Latest credits, releases, and payout movement.</p>
                        </div>
                        <Badge variant="outline">Live</Badge>
                    </div>

                    {recentTransactions.length === 0 ? (
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                            Wallet activity will appear here once funds are released or moved into payout review.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentTransactions.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-border/70 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{item.description ?? item.type}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.balance_bucket} · {formatDate(item.created_at)}
                                            </p>
                                        </div>
                                        <Badge variant={item.direction === 'credit' ? 'default' : 'outline'}>
                                            {item.direction === 'credit' ? '+' : '-'}
                                            {item.amount}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4">
                        <h3 className="font-semibold">Seller Health</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Quality and operating signals for your current selling window.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {sellerAnalytics.sellerHealth.map((item) => (
                            <div key={item.label} className={`rounded-2xl border p-4 ${toneClasses(item.tone)}`}>
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

                <section className="rounded-3xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                    <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="font-semibold">Recent Orders</h3>
                            <p className="text-sm text-muted-foreground">The latest work that may need delivery, follow-up, or buyer action.</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/seller/orders" prefetch>
                                Open Orders
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="px-5 py-10 text-sm text-muted-foreground">No seller orders yet.</div>
                    ) : (
                        <div className="grid gap-3 p-4">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="rounded-2xl border border-border/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{order.gig_title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Order #{order.id} · {order.counterparty_name}
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium">USD {order.total}</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant={badgeVariant(order.status)}>{order.status}</Badge>
                                        <Badge variant={badgeVariant(order.payment_status)}>{order.payment_status}</Badge>
                                        <Badge variant="outline">{order.fund_status}</Badge>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock3 className="size-3.5" />
                                        {formatDate(order.updated_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </div>
    );
}

function BuyerDashboard({
    filters,
    buyerAnalytics,
    recentOrders,
}: Pick<PageProps, 'filters' | 'buyerAnalytics' | 'recentOrders'>) {
    if (!filters || !buyerAnalytics) {
        return null;
    }

    const handleMonthChange = (value: string) => {
        router.get(
            '/dashboard',
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

    const handleRangeChange = (value: string) => {
        router.get(
            '/dashboard',
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

    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-6">
            <Heading
                title="Buyer Analytics"
                description="Track your spending, purchase activity, favorite sellers, and the orders that still need your attention."
            />

            <section className="rounded-3xl border border-sidebar-border/70 bg-[linear-gradient(135deg,rgba(29,78,216,0.16),rgba(14,165,233,0.07),rgba(245,158,11,0.14))] p-5 dark:border-sidebar-border">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-2">
                        <Badge variant="outline" className="bg-background/70">
                            Buyer Analytics
                        </Badge>
                        <h2 className="text-2xl font-semibold tracking-tight">Purchase control center</h2>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Understand where your money is going, which sellers you rely on most, and what needs action next.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {filters.options.map((option) => (
                                <Button
                                    key={option.value}
                                    size="sm"
                                    variant={filters.range === option.value ? 'default' : 'outline'}
                                    onClick={() => handleRangeChange(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link href="/buyer/orders" prefetch>
                                    <ShoppingBag className="mr-1.5 size-4" />
                                    Orders
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/buyer/payments" prefetch>
                                    <Wallet2 className="mr-1.5 size-4" />
                                    Payments
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {buyerAnalytics.stats.map((item) => {
                    const Icon = buyerStatIcons[item.key as keyof typeof buyerStatIcons] ?? Sparkles;

                    return (
                        <div key={item.key} className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">{item.label}</p>
                                    <AnimatedMetricValue
                                        value={item.value}
                                        kind={item.key === 'total_spend' ? 'currency' : 'number'}
                                        className="mt-3 block text-2xl font-semibold"
                                    />
                                </div>
                                <div className="rounded-2xl bg-muted/60 p-2.5">
                                    <Icon className="size-4 text-muted-foreground" />
                                </div>
                            </div>
                            <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">{item.delta}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
                <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold">Spend Trend</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Track paid order spending and discounts over time.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={filters.revenue_month.value} onValueChange={handleMonthChange}>
                                <SelectTrigger size="sm" className="min-w-36 bg-background/80">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {filters.revenue_month.options.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Badge variant="outline">Buyer spend</Badge>
                        </div>
                    </div>

                    <BuyerTrendChart data={buyerAnalytics.spendTrend} />

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">Spend total</p>
                            <AnimatedMetricValue
                                value={buyerAnalytics.spendTrend.reduce((sum, item) => sum + item.spend, 0)}
                                kind="currency"
                                className="mt-2 block text-xl font-semibold"
                            />
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">Discounts total</p>
                            <AnimatedMetricValue
                                value={buyerAnalytics.spendTrend.reduce((sum, item) => sum + item.discounts, 0)}
                                kind="currency"
                                className="mt-2 block text-xl font-semibold"
                            />
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">Paid orders total</p>
                            <AnimatedMetricValue
                                value={buyerAnalytics.spendTrend.reduce((sum, item) => sum + item.orders, 0)}
                                kind="number"
                                className="mt-2 block text-xl font-semibold"
                            />
                        </div>
                    </div>
                </div>

                <section className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold">Key Insights</h3>
                            <p className="mt-1 text-sm text-muted-foreground">A few quick cues to keep your buyer workflow moving.</p>
                        </div>
                        <Sparkles className="size-4 text-muted-foreground" />
                    </div>

                    <div className="space-y-3">
                        {buyerAnalytics.insights.map((insight, index) => (
                            <div key={`${insight}-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                                {insight}
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <BreakdownCard
                    title="Order Status Mix"
                    description="See where your orders currently sit across payment, progress, and completion states."
                    items={buyerAnalytics.orderBreakdown}
                    colors={['bg-slate-500', 'bg-sky-600', 'bg-amber-500', 'bg-emerald-600', 'bg-rose-600']}
                />

                <section className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4">
                        <h3 className="font-semibold">Buyer Health</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Signals that reflect your current purchasing and review activity.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {buyerAnalytics.buyerHealth.map((item) => (
                            <div key={item.label} className={`rounded-2xl border p-4 ${toneClasses(item.tone)}`}>
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
                </section>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Favorite Sellers</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Your most-purchased sellers during the selected period.</p>
                        </div>
                        <Badge variant="outline">Relationships</Badge>
                    </div>

                    <div className="space-y-3">
                        {buyerAnalytics.favoriteSellers.length === 0 && (
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                Seller preference data will appear here after paid orders accumulate.
                            </div>
                        )}

                        {buyerAnalytics.favoriteSellers.map((seller, index) => (
                            <div key={`${seller.name}-${index}`} className="rounded-2xl border border-border/70 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                            <p className="font-medium">{seller.name}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            <AnimatedMetricValue value={seller.orders_count} kind="number" /> paid orders
                                        </p>
                                    </div>
                                    <AnimatedMetricValue value={seller.spend} kind="currency" className="text-right font-semibold" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <div className="mb-4">
                        <h3 className="font-semibold">Top Categories</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Where most of your paid buying activity is concentrated.</p>
                    </div>

                    <div className="space-y-3">
                        {buyerAnalytics.topCategories.length === 0 && (
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                Category spending will appear here after paid orders start landing.
                            </div>
                        )}

                        {buyerAnalytics.topCategories.map((category) => (
                            <div key={category.name} className="rounded-2xl border border-border/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{category.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            <AnimatedMetricValue value={category.orders_count} kind="number" /> paid orders
                                        </p>
                                    </div>
                                    <AnimatedMetricValue value={category.spend} kind="currency" className="text-sm font-semibold" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-semibold">Recent Orders</h3>
                        <p className="text-sm text-muted-foreground">The latest purchases that may need payment, review, or completion from you.</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/buyer/orders" prefetch>
                            Open Orders
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="px-5 py-10 text-sm text-muted-foreground">No buyer orders yet.</div>
                ) : (
                    <div className="grid gap-3 p-4">
                        {recentOrders.map((order) => (
                            <div key={order.id} className="rounded-2xl border border-border/70 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{order.gig_title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Order #{order.id} · {order.counterparty_name}
                                        </p>
                                    </div>
                                    <span className="text-sm font-medium">USD {order.total}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant={badgeVariant(order.status)}>{order.status}</Badge>
                                    <Badge variant={badgeVariant(order.payment_status)}>{order.payment_status}</Badge>
                                    <Badge variant="outline">{order.fund_status}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock3 className="size-3.5" />
                                    {formatDate(order.updated_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default function Dashboard() {
    const props = usePage<PageProps>().props;

    return (
        <>
            <Head title="Dashboard" />
            {props.role === 'seller' && props.sellerAnalytics ? (
                <SellerDashboard
                    filters={props.filters}
                    sellerAnalytics={props.sellerAnalytics}
                    recentOrders={props.recentOrders}
                    recentTransactions={props.recentTransactions}
                />
            ) : props.role === 'buyer' && props.buyerAnalytics ? (
                <BuyerDashboard
                    filters={props.filters}
                    buyerAnalytics={props.buyerAnalytics}
                    recentOrders={props.recentOrders}
                />
            ) : (
                <LegacyDashboard {...props} />
            )}
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
