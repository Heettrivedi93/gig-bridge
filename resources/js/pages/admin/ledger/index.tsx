import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { useClientPagination } from '@/hooks/use-client-pagination';
import admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type StatCard = {
    label: string;
    value: number | string;
    detail: string;
};

type LedgerRow = {
    id: number;
    wallet: {
        owner_type: string | null;
        user_name: string | null;
        user_email: string | null;
    };
    order_id: number | null;
    type: string;
    direction: string;
    balance_bucket: string;
    amount: string;
    balance_before: string;
    balance_after: string;
    description: string | null;
    created_at: string | null;
};

type Props = {
    stats: StatCard[];
    revenueSummary: StatCard[];
    walletSummary: StatCard[];
    transactions: LedgerRow[];
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

export default function AdminLedgerIndex({
    stats,
    revenueSummary,
    walletSummary,
    transactions,
}: Props) {
    const paginatedTransactions = useClientPagination(transactions);

    return (
        <>
            <Head title="Funds Ledger" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Funds Ledger"
                    description="Audit escrow, seller releases, commissions, refunds, and payout movement across the platform."
                />

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border"
                        >
                            <p className="text-sm text-muted-foreground">
                                {item.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {item.label === 'Ledger Entries'
                                    ? item.value
                                    : `USD ${item.value}`}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <section className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                            <h3 className="font-semibold">Revenue Channels</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Track paid plan revenue and commission earned
                                from sellers selling services to buyers.
                            </p>

                            <div className="mt-4 space-y-3">
                                {revenueSummary.map((item) => (
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
                                            <span className="text-base font-semibold">
                                                USD {item.value}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                            <h3 className="font-semibold">
                                Operational Balances
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Snapshot of held funds, payout queues, and
                                released seller balances.
                            </p>

                            <div className="mt-4 space-y-3">
                                {walletSummary.map((item) => (
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
                                            <span className="text-base font-semibold">
                                                USD {item.value}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <section className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="border-b border-border bg-card px-4 py-4">
                            <h3 className="font-semibold">
                                Transaction Stream
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Every escrow hold, release, refund, fee, and
                                withdrawal movement is logged here.
                            </p>
                        </div>

                        <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                                        <th className="px-4 py-3 text-left font-medium">
                                            Wallet
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Type
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Bucket
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Balance Shift
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Reference
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedTransactions.paginatedItems.map(
                                        (transaction) => (
                                            <tr
                                                key={transaction.id}
                                                className="bg-background transition-colors hover:bg-muted/20"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium capitalize">
                                                        {transaction.wallet
                                                            .owner_type ??
                                                            'wallet'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {transaction.wallet
                                                            .user_name ??
                                                            'System wallet'}
                                                    </div>
                                                    {transaction.wallet
                                                        .user_email && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {
                                                                transaction
                                                                    .wallet
                                                                    .user_email
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline">
                                                        {transaction.type}
                                                    </Badge>
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {transaction.direction}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 capitalize">
                                                    {transaction.balance_bucket}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    USD {transaction.amount}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {transaction.balance_before}{' '}
                                                    →{' '}
                                                    {transaction.balance_after}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {transaction.order_id
                                                        ? `Order #${transaction.order_id}`
                                                        : 'General wallet action'}
                                                    {transaction.description && (
                                                        <div className="mt-1">
                                                            {
                                                                transaction.description
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {formatDate(
                                                        transaction.created_at,
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <TablePagination
                            page={paginatedTransactions.page}
                            pageSize={paginatedTransactions.pageSize}
                            totalItems={paginatedTransactions.totalItems}
                            totalPages={paginatedTransactions.totalPages}
                            startItem={paginatedTransactions.startItem}
                            endItem={paginatedTransactions.endItem}
                            hasPreviousPage={
                                paginatedTransactions.hasPreviousPage
                            }
                            hasNextPage={paginatedTransactions.hasNextPage}
                            onPageChange={paginatedTransactions.setPage}
                            onPageSizeChange={paginatedTransactions.setPageSize}
                        />
                    </section>
                </div>
            </div>
        </>
    );
}

AdminLedgerIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Funds Ledger', href: '/admin/ledger' },
    ] satisfies BreadcrumbItem[],
};
