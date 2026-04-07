import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Clock3, ShoppingBag, Wallet2 } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

type DashboardStat = {
    label: string;
    value: string | number;
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

type PageProps = {
    role: 'seller' | 'buyer' | 'general';
    stats: DashboardStat[];
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

export default function Dashboard() {
    const { role, stats, walletSummary, revenueSummary, recentOrders, recentTransactions } = usePage<PageProps>().props;
    const ordersHref = role === 'buyer' ? '/buyer/orders' : '/seller/orders';
    const headingDescription = role === 'seller'
        ? 'Track released funds, orders waiting on buyers, and recent wallet movement from one place.'
        : role === 'buyer'
            ? 'Review your active purchases, pending payments, and deliveries that still need your response.'
            : 'Welcome back. Here is your current account overview.';

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Dashboard"
                    description={headingDescription}
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border"
                        >
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
                                                    {item.direction === 'credit' ? '+' : '-'}{item.amount}
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
                                <p className="text-sm text-muted-foreground">
                                    Revenue generated from your own sold services.
                                </p>
                            </div>
                            <Badge variant="outline">Seller Revenue</Badge>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Gross sales</p>
                                <p className="mt-2 text-xl font-semibold">{revenueSummary.currency} {revenueSummary.gross_sales}</p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Platform fees</p>
                                <p className="mt-2 text-xl font-semibold">{revenueSummary.currency} {revenueSummary.platform_fees}</p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Net revenue</p>
                                <p className="mt-2 text-xl font-semibold">{revenueSummary.currency} {revenueSummary.net_revenue}</p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Pending release</p>
                                <p className="mt-2 text-xl font-semibold">{revenueSummary.currency} {revenueSummary.pending_release}</p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                                <p className="text-sm text-muted-foreground">Withdrawn</p>
                                <p className="mt-2 text-xl font-semibold">{revenueSummary.currency} {revenueSummary.withdrawn_total}</p>
                            </div>
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
                        <div className="px-5 py-10 text-sm text-muted-foreground">
                            No orders yet.
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
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
