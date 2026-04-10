import { Head, Link } from '@inertiajs/react';
import { Eye, MessageCircle } from 'lucide-react';
import Heading from '@/components/heading';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClientPagination } from '@/hooks/use-client-pagination';
import type { BreadcrumbItem } from '@/types';

type DisputeRow = {
    id: number;
    order_id: number;
    order_gig_title: string | null;
    raised_by: string | null;
    reason: string;
    status: 'open' | 'resolved';
    decision: string | null;
    partial_amount: string | null;
    admin_note: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string | null;
    messages_count: number;
};

type Props = { disputes: DisputeRow[] };

function shortDate(value: string | null) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString();
}

const decisionLabel: Record<string, string> = {
    full_refund: 'Full Refund',
    partial_refund: 'Partial Refund',
    release: 'Released to Seller',
};

export default function DisputesIndex({ disputes }: Props) {
    const open = disputes.filter((d) => d.status === 'open').length;
    const resolved = disputes.filter((d) => d.status === 'resolved').length;
    const paginatedDisputes = useClientPagination(disputes);

    return (
        <>
            <Head title="My Disputes" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="My Disputes"
                    description="Track disputes you raised or are involved in. Click Review to view the chat and resolution."
                />

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="mt-2 text-2xl font-semibold">
                            {disputes.length}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                        <p className="text-sm text-muted-foreground">Open</p>
                        <p className="mt-2 text-2xl font-semibold">{open}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                            Resolved
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {resolved}
                        </p>
                    </div>
                </div>

                {disputes.length === 0 ? (
                    <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                        <p className="text-lg font-semibold">No disputes yet</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Disputes you raise from your orders will appear
                            here.
                        </p>
                    </section>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border/70">
                        {/* Desktop */}
                        <div className="hidden max-w-full overflow-x-auto lg:block">
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
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Decision
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Messages
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
                                                    <p className="mt-1 line-clamp-2 max-w-xs text-xs text-muted-foreground">
                                                        {dispute.reason}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {dispute.order_gig_title ??
                                                            '—'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Order #
                                                        {dispute.order_id}
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
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <MessageCircle className="size-3.5" />
                                                        {dispute.messages_count}
                                                    </div>
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
                                                            href={`/disputes/${dispute.id}`}
                                                        >
                                                            <Eye className="mr-1 size-4" />
                                                            View
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile */}
                        <div className="space-y-3 p-4 lg:hidden">
                            {paginatedDisputes.paginatedItems.map((dispute) => (
                                <div
                                    key={dispute.id}
                                    className="rounded-xl border border-border/70 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">
                                                Dispute #{dispute.id}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {dispute.order_gig_title ??
                                                    `Order #${dispute.order_id}`}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={
                                                dispute.status === 'open'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {dispute.status}
                                        </Badge>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                        {dispute.reason}
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {dispute.decision && (
                                            <Badge variant="outline">
                                                {decisionLabel[
                                                    dispute.decision
                                                ] ?? dispute.decision}
                                            </Badge>
                                        )}
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MessageCircle className="size-3.5" />
                                            {dispute.messages_count} messages
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {shortDate(dispute.created_at)}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link
                                                href={`/disputes/${dispute.id}`}
                                            >
                                                <Eye className="mr-1 size-4" />
                                                View dispute
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
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

DisputesIndex.layout = {
    breadcrumbs: [
        { title: 'My Disputes', href: '/disputes' },
    ] satisfies BreadcrumbItem[],
};
