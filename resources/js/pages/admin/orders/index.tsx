import { Head, router, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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

type Status = 'pending' | 'active' | 'delivered' | 'completed' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'released' | 'refunded' | 'failed';

type OrderRow = {
    id: number;
    gig_title: string | null;
    package: {
        title: string;
        tier: string;
        delivery_days: number;
        revision_count: number;
    } | null;
    buyer: {
        name: string;
        email: string;
    } | null;
    seller: {
        name: string;
        email: string;
    } | null;
    quantity: number;
    requirements: string;
    reference_link: string | null;
    style_notes: string | null;
    coupon_code: string | null;
    subtotal_amount: string;
    discount_amount: string;
    brief_file_url: string | null;
    price: string;
    platform_fee: string;
    seller_net: string;
    status: Status;
    payment_status: PaymentStatus;
    fund_status: 'none' | 'escrow' | 'releasable' | 'released' | 'refunded';
    escrow_held: boolean;
    created_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    funds_released_at: string | null;
    deliveries: {
        id: number;
        file_url: string;
        note: string | null;
        delivered_at: string | null;
        delivered_by: string | null;
    }[];
    revisions: {
        id: number;
        note: string;
        requested_by: string | null;
        created_at: string | null;
    }[];
    cancellations: {
        id: number;
        cancelled_by: string;
        reason: string;
        created_at: string | null;
    }[];
};

type StatCard = {
    label: string;
    value: number | string;
    detail: string;
};

type Props = {
    stats: StatCard[];
    orders: OrderRow[];
    statusOptions: Status[];
    paymentStatusOptions: PaymentStatus[];
    platformFeePercentage: number;
};

type AdminOrderForm = {
    status: Status;
    payment_status: PaymentStatus;
    escrow_held: boolean;
    delivered_at: string;
    completed_at: string;
    cancelled_at: string;
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

function shortDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleDateString();
}

function toDatetimeLocal(value: string | null) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 16);
}

function summarizeText(value: string, limit = 90) {
    const trimmed = value.trim();

    if (trimmed.length <= limit) {
        return trimmed;
    }

    return `${trimmed.slice(0, limit).trimEnd()}...`;
}

function normalizeSearch(value: string | null | undefined) {
    return value?.toLowerCase().trim() ?? '';
}

export default function AdminOrdersIndex({
    stats,
    orders,
    statusOptions,
    paymentStatusOptions,
    platformFeePercentage,
}: Props) {
    const [editTarget, setEditTarget] = useState<OrderRow | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [fundFilter, setFundFilter] = useState('all');

    const form = useForm<AdminOrderForm>({
        status: 'pending',
        payment_status: 'pending',
        escrow_held: false,
        delivered_at: '',
        completed_at: '',
        cancelled_at: '',
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
    const filteredOrders = useMemo(() => {
        const searchTerm = normalizeSearch(search);

        return orders.filter((order) => {
            const matchesSearch =
                searchTerm.length === 0 ||
                [
                    order.id.toString(),
                    order.gig_title,
                    order.package?.title,
                    order.package?.tier,
                    order.buyer?.name,
                    order.buyer?.email,
                    order.seller?.name,
                    order.seller?.email,
                ].some((value) => normalizeSearch(value).includes(searchTerm));
            const matchesStatus =
                statusFilter === 'all' || order.status === statusFilter;
            const matchesPayment =
                paymentFilter === 'all' ||
                order.payment_status === paymentFilter;
            const matchesFund =
                fundFilter === 'all' || order.fund_status === fundFilter;

            return (
                matchesSearch && matchesStatus && matchesPayment && matchesFund
            );
        });
    }, [fundFilter, orders, paymentFilter, search, statusFilter]);
    const paginatedOrders = useClientPagination(filteredOrders);
    const fundStatusOptions = Array.from(
        new Set(orders.map((order) => order.fund_status)),
    );

    const openEdit = (order: OrderRow) => {
        setEditTarget(order);
        form.clearErrors();
        form.setData({
            status: order.status,
            payment_status: order.payment_status,
            escrow_held: order.escrow_held,
            delivered_at: toDatetimeLocal(order.delivered_at),
            completed_at: toDatetimeLocal(order.completed_at),
            cancelled_at: toDatetimeLocal(order.cancelled_at),
        });
    };

    const closeEdit = () => {
        setEditTarget(null);
        form.reset();
        form.clearErrors();
    };

    const handleUpdate = (event: React.FormEvent) => {
        event.preventDefault();

        if (!editTarget) {
            return;
        }

        form.put(`/admin/orders/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: closeEdit,
        });
    };

    return (
        <>
            <Head title="Orders" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Orders"
                    description="Override order lifecycle, payment state, escrow handling, and timestamps from a single admin workspace."
                />

                <section className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(170px,0.7fr)_minmax(170px,0.7fr)_minmax(170px,0.7fr)_auto]">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Search orders
                            </label>
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by order ID, buyer, seller, or gig"
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
                                <SelectContent align="start">
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    {statusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Payment
                            </label>
                            <Select
                                value={paymentFilter}
                                onValueChange={setPaymentFilter}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="all">
                                        All payments
                                    </SelectItem>
                                    {paymentStatusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Funds</label>
                            <Select
                                value={fundFilter}
                                onValueChange={setFundFilter}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="all">
                                        All fund states
                                    </SelectItem>
                                    {fundStatusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter('all');
                                    setPaymentFilter('all');
                                    setFundFilter('all');
                                }}
                                className="w-full xl:w-auto"
                            >
                                Clear
                            </Button>
                        </div>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                        {filteredOrders.length} matching order
                        {filteredOrders.length === 1 ? '' : 's'} found.
                    </p>
                </section>

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
                                {item.label.includes('Revenue') ||
                                item.label.includes('Volume')
                                    ? `USD ${item.value}`
                                    : item.value}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>

                {filteredOrders.length === 0 ? (
                    <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                        <p className="text-lg font-semibold">
                            No matching orders
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Try changing the search term or clearing one of the
                            filters.
                        </p>
                    </section>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                                        <th className="px-4 py-3 text-left font-medium">
                                            Order
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Buyer
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Seller
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Payment
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Funds
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Revenue
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Updated Timestamps
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedOrders.paginatedItems.map(
                                        (order) => (
                                            <tr
                                                key={order.id}
                                                className="bg-background align-top transition-colors hover:bg-muted/20"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-foreground">
                                                        {order.gig_title ??
                                                            'Order'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        #{order.id} •{' '}
                                                        {order.package?.title ??
                                                            'Package'}{' '}
                                                        •{' '}
                                                        {order.package?.tier ??
                                                            'Tier'}
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {summarizeText(
                                                            order.requirements,
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {order.buyer?.name ??
                                                            'Buyer'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {order.buyer?.email ??
                                                            'No email'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {order.seller?.name ??
                                                            'Seller'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {order.seller?.email ??
                                                            'No email'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-2">
                                                        <Badge
                                                            variant={
                                                                order.status ===
                                                                'completed'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {order.status}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            Escrow{' '}
                                                            {order.escrow_held
                                                                ? 'held'
                                                                : 'released'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            order.payment_status ===
                                                                'paid' ||
                                                            order.payment_status ===
                                                                'released'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {order.payment_status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-2">
                                                        <Badge
                                                            variant={
                                                                order.fund_status ===
                                                                'released'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {order.fund_status}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            Released:{' '}
                                                            {shortDate(
                                                                order.funds_released_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        USD {order.price}
                                                    </div>
                                                    {Number(
                                                        order.discount_amount,
                                                    ) > 0 && (
                                                        <div className="text-xs text-emerald-600">
                                                            Discount: USD{' '}
                                                            {
                                                                order.discount_amount
                                                            }
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground">
                                                        Fee{' '}
                                                        {platformFeePercentage}
                                                        %: USD{' '}
                                                        {order.platform_fee}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Seller net: USD{' '}
                                                        {order.seller_net}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    <div>
                                                        Created:{' '}
                                                        {shortDate(
                                                            order.created_at,
                                                        )}
                                                    </div>
                                                    <div>
                                                        Delivered:{' '}
                                                        {shortDate(
                                                            order.delivered_at,
                                                        )}
                                                    </div>
                                                    <div>
                                                        Completed:{' '}
                                                        {shortDate(
                                                            order.completed_at,
                                                        )}
                                                    </div>
                                                    <div>
                                                        Cancelled:{' '}
                                                        {shortDate(
                                                            order.cancelled_at,
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {order.status ===
                                                            'completed' &&
                                                            order.payment_status ===
                                                                'paid' &&
                                                            order.fund_status ===
                                                                'releasable' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.post(
                                                                            `/admin/orders/${order.id}/release-funds`,
                                                                            {},
                                                                            {
                                                                                preserveScroll: true,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    Release
                                                                </Button>
                                                            )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openEdit(order)
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <TablePagination
                            page={paginatedOrders.page}
                            pageSize={paginatedOrders.pageSize}
                            totalItems={paginatedOrders.totalItems}
                            totalPages={paginatedOrders.totalPages}
                            startItem={paginatedOrders.startItem}
                            endItem={paginatedOrders.endItem}
                            hasPreviousPage={paginatedOrders.hasPreviousPage}
                            hasNextPage={paginatedOrders.hasNextPage}
                            onPageChange={paginatedOrders.setPage}
                            onPageSizeChange={paginatedOrders.setPageSize}
                        />
                    </div>
                )}
            </div>

            <Dialog
                open={!!editTarget}
                onOpenChange={(open) => !open && closeEdit()}
            >
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle>Edit Order Override</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Adjust lifecycle state, payment state, escrow
                            handling, and timestamps. Related files and audit
                            history are shown below.
                        </p>
                    </DialogHeader>

                    {editTarget && (
                        <form
                            onSubmit={handleUpdate}
                            className="space-y-5 pt-1"
                        >
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-md border border-border p-3">
                                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                        Order
                                    </p>
                                    <p className="mt-2 font-medium">
                                        {editTarget.gig_title ?? 'Order'} #
                                        {editTarget.id}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {editTarget.package?.title ?? 'Package'}{' '}
                                        • {editTarget.package?.tier ?? 'Tier'}
                                    </p>
                                </div>
                                <div className="rounded-md border border-border p-3">
                                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                        Buyer / Seller
                                    </p>
                                    <p className="mt-2 font-medium">
                                        {editTarget.buyer?.name ?? 'Buyer'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {editTarget.seller?.name ?? 'Seller'}
                                    </p>
                                </div>
                                <div className="rounded-md border border-border p-3">
                                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                                        Revenue
                                    </p>
                                    <p className="mt-2 font-medium">
                                        USD {editTarget.price}
                                    </p>
                                    {Number(editTarget.discount_amount) > 0 && (
                                        <p className="text-sm text-emerald-600">
                                            Subtotal USD{' '}
                                            {editTarget.subtotal_amount} •
                                            Discount USD{' '}
                                            {editTarget.discount_amount}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Fee: USD {editTarget.platform_fee}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Net: USD {editTarget.seller_net}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'status',
                                                value as Status,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((status) => (
                                                <SelectItem
                                                    key={status}
                                                    value={status}
                                                >
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.status} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Payment Status</Label>
                                    <Select
                                        value={form.data.payment_status}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'payment_status',
                                                value as PaymentStatus,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentStatusOptions.map(
                                                (status) => (
                                                    <SelectItem
                                                        key={status}
                                                        value={status}
                                                    >
                                                        {status}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={form.errors.payment_status}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Escrow</Label>
                                    <Select
                                        value={
                                            form.data.escrow_held
                                                ? 'held'
                                                : 'released'
                                        }
                                        onValueChange={(value) =>
                                            form.setData(
                                                'escrow_held',
                                                value === 'held',
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="held">
                                                Held
                                            </SelectItem>
                                            <SelectItem value="released">
                                                Released
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={form.errors.escrow_held}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="delivered_at">
                                        Delivered At
                                    </Label>
                                    <input
                                        id="delivered_at"
                                        type="datetime-local"
                                        value={form.data.delivered_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'delivered_at',
                                                e.target.value,
                                            )
                                        }
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <InputError
                                        message={form.errors.delivered_at}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="completed_at">
                                        Completed At
                                    </Label>
                                    <input
                                        id="completed_at"
                                        type="datetime-local"
                                        value={form.data.completed_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'completed_at',
                                                e.target.value,
                                            )
                                        }
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <InputError
                                        message={form.errors.completed_at}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cancelled_at">
                                        Cancelled At
                                    </Label>
                                    <input
                                        id="cancelled_at"
                                        type="datetime-local"
                                        value={form.data.cancelled_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'cancelled_at',
                                                e.target.value,
                                            )
                                        }
                                        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <InputError
                                        message={form.errors.cancelled_at}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-md border border-border p-4">
                                    <h3 className="font-medium">
                                        Files and brief
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {editTarget.requirements}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        {editTarget.reference_link && (
                                            <a
                                                href={editTarget.reference_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary underline underline-offset-4"
                                            >
                                                Reference link
                                            </a>
                                        )}
                                        {editTarget.brief_file_url && (
                                            <a
                                                href={editTarget.brief_file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary underline underline-offset-4"
                                            >
                                                Brief file
                                            </a>
                                        )}
                                        {editTarget.style_notes && (
                                            <span>
                                                Style: {editTarget.style_notes}
                                            </span>
                                        )}
                                        {editTarget.coupon_code && (
                                            <span>
                                                Coupon: {editTarget.coupon_code}
                                            </span>
                                        )}
                                        {Number(editTarget.discount_amount) >
                                            0 && (
                                            <span>
                                                Discount: USD{' '}
                                                {editTarget.discount_amount}
                                            </span>
                                        )}
                                    </div>
                                    {editTarget.deliveries.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-sm font-medium">
                                                Delivery files
                                            </p>
                                            {editTarget.deliveries.map(
                                                (delivery) => (
                                                    <div
                                                        key={delivery.id}
                                                        className="rounded-md border border-border p-3 text-sm"
                                                    >
                                                        <p>
                                                            {formatDate(
                                                                delivery.delivered_at,
                                                            )}{' '}
                                                            by{' '}
                                                            {delivery.delivered_by ??
                                                                'Seller'}
                                                        </p>
                                                        {delivery.note && (
                                                            <p className="mt-1 text-muted-foreground">
                                                                {delivery.note}
                                                            </p>
                                                        )}
                                                        <a
                                                            href={
                                                                delivery.file_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-2 inline-block text-primary underline underline-offset-4"
                                                        >
                                                            Download file
                                                        </a>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-md border border-border p-4">
                                        <h3 className="font-medium">
                                            Revision history
                                        </h3>
                                        {editTarget.revisions.length === 0 ? (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                No revisions recorded.
                                            </p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {editTarget.revisions.map(
                                                    (revision) => (
                                                        <div
                                                            key={revision.id}
                                                            className="rounded-md border border-border p-3 text-sm"
                                                        >
                                                            <p>
                                                                {revision.requested_by ??
                                                                    'User'}{' '}
                                                                •{' '}
                                                                {formatDate(
                                                                    revision.created_at,
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-muted-foreground">
                                                                {revision.note}
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-md border border-border p-4">
                                        <h3 className="font-medium">
                                            Cancellation trail
                                        </h3>
                                        {editTarget.cancellations.length ===
                                        0 ? (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                No cancellations recorded.
                                            </p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {editTarget.cancellations.map(
                                                    (cancellation) => (
                                                        <div
                                                            key={
                                                                cancellation.id
                                                            }
                                                            className="rounded-md border border-border p-3 text-sm"
                                                        >
                                                            <p className="capitalize">
                                                                {
                                                                    cancellation.cancelled_by
                                                                }{' '}
                                                                •{' '}
                                                                {formatDate(
                                                                    cancellation.created_at,
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-muted-foreground">
                                                                {
                                                                    cancellation.reason
                                                                }
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="border-t border-border pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeEdit}
                                >
                                    Close
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {form.processing
                                        ? 'Saving…'
                                        : 'Save override'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminOrdersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Orders', href: '/admin/orders' },
    ] satisfies BreadcrumbItem[],
};
