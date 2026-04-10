import { Head, Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClientPagination } from '@/hooks/use-client-pagination';
import admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type DisputeRow = {
    id: number;
    order_id: number;
    order_gig_title: string | null;
    order_price: string;
    order_status: string;
    order_fund_status: string;
    buyer: { name: string; email: string } | null;
    seller: { name: string; email: string } | null;
    raised_by: string | null;
    reason: string;
    status: 'open' | 'resolved';
    decision: string | null;
    partial_amount: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string | null;
};

type Props = {
    disputes: DisputeRow[];
    stats: { label: string; value: number }[];
};

function shortDate(value: string | null) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString();
}

const decisionLabel: Record<string, string> = {
    full_refund: 'Full Refund',
    partial_refund: 'Partial Refund',
    release: 'Released',
};

function normalizeSearch(value?: string | null) {
    return value?.toLowerCase().trim() ?? '';
}

export default function AdminDisputesIndex({ disputes, stats }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [decisionFilter, setDecisionFilter] = useState('all');
    const filteredDisputes = useMemo(() => {
        const searchTerm = normalizeSearch(search);

        return disputes.filter((dispute) => {
            const matchesSearch =
                searchTerm.length === 0 ||
                [
                    dispute.id.toString(),
                    dispute.order_id.toString(),
                    dispute.order_gig_title,
                    dispute.reason,
                    dispute.buyer?.name,
                    dispute.buyer?.email,
                    dispute.seller?.name,
                    dispute.seller?.email,
                    dispute.raised_by,
                ].some((value) => normalizeSearch(value).includes(searchTerm));
            const matchesStatus =
                statusFilter === 'all' || dispute.status === statusFilter;
            const matchesDecision =
                decisionFilter === 'all' || dispute.decision === decisionFilter;

            return matchesSearch && matchesStatus && matchesDecision;
        });
    }, [decisionFilter, disputes, search, statusFilter]);
    const paginatedDisputes = useClientPagination(filteredDisputes);
    const decisionOptions = Array.from(
        new Set(disputes.map((dispute) => dispute.decision).filter(Boolean)),
    );

    return (
        <>
            <Head title="Disputes" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Disputes"
                    description="Review and resolve buyer/seller disputes. Decisions affect escrow and wallet balances."
                />

                <div className="grid gap-3 md:grid-cols-3">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-border/70 bg-card px-4 py-3"
                        >
                            <p className="text-sm text-muted-foreground">
                                {stat.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                <section className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.7fr)_minmax(200px,0.8fr)_auto]">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Search disputes
                            </label>
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by dispute, order, buyer, seller, or reason"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Status
                            </label>
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start" side="top">
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="resolved">
                                        Resolved
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Decision
                            </label>
                            <Select
                                value={decisionFilter}
                                onValueChange={setDecisionFilter}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start" side="top">
                                    <SelectItem value="all">
                                        All decisions
                                    </SelectItem>
                                    {decisionOptions.map((decision) => (
                                        <SelectItem
                                            key={decision}
                                            value={decision}
                                        >
                                            {decisionLabel[decision] ??
                                                decision}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full xl:w-auto"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter('all');
                                    setDecisionFilter('all');
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                        {filteredDisputes.length} matching dispute
                        {filteredDisputes.length === 1 ? '' : 's'} found.
                    </p>
                </section>

                {disputes.length === 0 ? (
                    <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                        <p className="text-muted-foreground">
                            No disputes yet.
                        </p>
                    </section>
                ) : filteredDisputes.length === 0 ? (
                    <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                        <p className="text-lg font-semibold">
                            No matching disputes
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Try changing the search term or clearing the current
                            filters.
                        </p>
                    </section>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border/70">
                        <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 text-left text-xs tracking-[0.16em] text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Dispute
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Order
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Buyer / Seller
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Decision
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Opened
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedDisputes.paginatedItems.map(
                                        (dispute) => (
                                            <tr
                                                key={dispute.id}
                                                className="bg-background align-top hover:bg-muted/20"
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        #{dispute.id}
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {dispute.reason}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {dispute.order_gig_title ??
                                                            'Order'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        #{dispute.order_id} ·
                                                        USD{' '}
                                                        {dispute.order_price}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {dispute.order_status} /{' '}
                                                        {
                                                            dispute.order_fund_status
                                                        }
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {dispute.buyer?.name ??
                                                            '—'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {dispute.seller?.name ??
                                                            '—'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            dispute.status ===
                                                            'open'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {dispute.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {dispute.decision ? (
                                                        <div className="space-y-1">
                                                            <Badge variant="outline">
                                                                {decisionLabel[
                                                                    dispute
                                                                        .decision
                                                                ] ??
                                                                    dispute.decision}
                                                            </Badge>
                                                            {dispute.decision ===
                                                                'partial_refund' &&
                                                                dispute.partial_amount && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {
                                                                            dispute.partial_amount
                                                                        }
                                                                        % to
                                                                        buyer
                                                                    </p>
                                                                )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {shortDate(
                                                        dispute.created_at,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Link
                                                            href={`/admin/disputes/${dispute.id}`}
                                                        >
                                                            <Eye className="mr-1 size-4" />
                                                            Review
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <TablePagination
                            page={paginatedDisputes.page}
                            pageSize={paginatedDisputes.pageSize}
                            totalItems={paginatedDisputes.totalItems}
                            totalPages={paginatedDisputes.totalPages}
                            startItem={paginatedDisputes.startItem}
                            endItem={paginatedDisputes.endItem}
                            hasPreviousPage={paginatedDisputes.hasPreviousPage}
                            hasNextPage={paginatedDisputes.hasNextPage}
                            onPageChange={paginatedDisputes.setPage}
                            onPageSizeChange={paginatedDisputes.setPageSize}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

AdminDisputesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Disputes', href: '/admin/disputes' },
    ] satisfies BreadcrumbItem[],
};
