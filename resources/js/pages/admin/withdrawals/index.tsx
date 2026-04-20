import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, CircleOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

type WithdrawalRow = {
    id: number;
    amount: string;
    status: WithdrawalStatus;
    method: string | null;
    details: Record<string, unknown> | null;
    note: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    seller: {
        name: string;
        email: string;
    } | null;
    reviewer: {
        name: string;
    } | null;
    wallet_currency: string;
};

type StatCard = {
    label: string;
    value: number | string;
    detail: string;
};

type Props = {
    stats: StatCard[];
    requests: WithdrawalRow[];
};

type ReviewForm = {
    status: 'approved' | 'rejected';
    note: string;
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

export default function AdminWithdrawalsIndex({ stats, requests }: Props) {
    const [reviewTarget, setReviewTarget] = useState<WithdrawalRow | null>(
        null,
    );

    const form = useForm<ReviewForm>({
        status: 'approved',
        note: '',
    });

    const summary = useMemo(
        () =>
            stats.map((item) => ({
                ...item,
                value:
                    typeof item.value === 'number'
                        ? item.value.toLocaleString()
                        : item.value,
            })),
        [stats],
    );
    const paginatedRequests = useClientPagination(requests);

    const openReview = (withdrawal: WithdrawalRow) => {
        setReviewTarget(withdrawal);
        form.clearErrors();
        form.setData({
            status: 'approved',
            note: withdrawal.note ?? '',
        });
    };

    const closeReview = () => {
        setReviewTarget(null);
        form.reset();
        form.clearErrors();
    };

    const submitReview = (event: React.FormEvent) => {
        event.preventDefault();

        if (!reviewTarget) {
            return;
        }

        form.put(`/admin/withdrawals/${reviewTarget.id}`, {
            preserveScroll: true,
            onSuccess: closeReview,
        });
    };

    return (
        <>
            <Head title="Withdrawal Requests" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Withdrawal Requests"
                    description="Review seller payout requests and either approve them or return the reserved funds back to the seller."
                />

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {summary.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border"
                        >
                            <p className="text-sm text-muted-foreground">
                                {item.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {item.label === 'Approved Payouts'
                                    ? `USD ${item.value}`
                                    : item.value}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="max-w-full overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-4 py-3 text-left font-medium">
                                        Seller
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Method
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Requested
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Reviewed
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedRequests.paginatedItems.map(
                                    (request) => (
                                        <tr
                                            key={request.id}
                                            className="bg-background transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {request.seller?.name ??
                                                        'Seller'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {request.seller?.email ??
                                                        'No email'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {request.wallet_currency}{' '}
                                                {request.amount}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    {request.method ??
                                                        'Method pending'}
                                                </div>
                                                {request.note && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {request.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={
                                                        request.status ===
                                                            'approved' ||
                                                        request.status ===
                                                            'paid'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {request.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {formatDate(request.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {request.reviewer?.name
                                                    ? `${request.reviewer.name} • ${formatDate(request.reviewed_at)}`
                                                    : 'Pending'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {request.status ===
                                                        'pending' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                openReview(
                                                                    request,
                                                                )
                                                            }
                                                        >
                                                            Review
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                    <TablePagination
                        page={paginatedRequests.page}
                        pageSize={paginatedRequests.pageSize}
                        totalItems={paginatedRequests.totalItems}
                        totalPages={paginatedRequests.totalPages}
                        startItem={paginatedRequests.startItem}
                        endItem={paginatedRequests.endItem}
                        hasPreviousPage={paginatedRequests.hasPreviousPage}
                        hasNextPage={paginatedRequests.hasNextPage}
                        onPageChange={paginatedRequests.setPage}
                        onPageSizeChange={paginatedRequests.setPageSize}
                    />
                </div>
            </div>

            <Dialog
                open={!!reviewTarget}
                onOpenChange={(open) => !open && closeReview()}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Review Withdrawal Request</DialogTitle>
                    </DialogHeader>

                    {reviewTarget && (
                        <form onSubmit={submitReview} className="space-y-4">
                            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
                                <p className="font-medium">
                                    {reviewTarget.seller?.name ?? 'Seller'}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    {reviewTarget.seller?.email ?? 'No email'}
                                </p>
                                <p className="mt-3 text-lg font-semibold">
                                    {reviewTarget.wallet_currency}{' '}
                                    {reviewTarget.amount}
                                </p>
                                <p className="text-muted-foreground">
                                    {reviewTarget.method ?? 'Method pending'}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label>Status <span className="text-destructive">*</span></Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'status',
                                            value as ReviewForm['status'],
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="approved">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="size-4" />
                                                Approve
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="rejected">
                                            <div className="flex items-center gap-2">
                                                <CircleOff className="size-4" />
                                                Reject
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.status} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="withdrawal-note">
                                    Admin note
                                </Label>
                                <textarea
                                    id="withdrawal-note"
                                    rows={4}
                                    value={form.data.note}
                                    onChange={(event) =>
                                        form.setData('note', event.target.value)
                                    }
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Add approval or rejection note."
                                />
                                <InputError message={form.errors.note} />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeReview}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {form.processing
                                        ? 'Saving…'
                                        : 'Save review'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminWithdrawalsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Withdrawal Requests', href: '/admin/withdrawals' },
    ] satisfies BreadcrumbItem[],
};
