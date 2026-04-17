import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    Clock3,
    Download,
    Eye,
    FileText,
    MessageCircle,
    PackageCheck,
    ShieldAlert,
    ShoppingBag,
    SlidersHorizontal,
    Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import OrderChatModal from '@/components/order-chat-modal';
import OrderDueDate from '@/components/order-due-date';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClientPagination } from '@/hooks/use-client-pagination';
import EmptyState from '@/components/empty-state';
import type { BreadcrumbItem } from '@/types';

type SellerOrder = {
    id: number;
    gig_title: string | null;
    package: {
        title: string;
        tier: string;
        delivery_days: number;
        revision_count: number;
    } | null;
    buyer: {
        id: number;
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
    status: string;
    payment_status: string;
    delivered_at: string | null;
    due_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
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
    open_dispute_id: number | null;
};

type Props = {
    orders: SellerOrder[];
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

function summarizeText(value: string, limit = 140) {
    const trimmed = value.trim();

    if (trimmed.length <= limit) {
        return trimmed;
    }

    return `${trimmed.slice(0, limit).trimEnd()}...`;
}

function shortDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleDateString();
}

function normalizeSearch(value: string | null | undefined) {
    return value?.toLowerCase().trim() ?? '';
}

function ActionIconButton({
    label,
    children,
    className,
    ...props
}: { label: string } & React.ComponentProps<typeof Button>) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    size="sm"
                    className={`h-8 w-8 p-0 ${className ?? ''}`}
                    {...props}
                >
                    {children}
                    <span className="sr-only">{label}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

export default function SellerOrdersIndex({ orders }: Props) {
    const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(
        null,
    );
    const [messageOrder, setMessageOrder] = useState<SellerOrder | null>(() => {
        const messageOrderId = new URLSearchParams(window.location.search).get(
            'message_order',
        );

        if (!messageOrderId) {
            return null;
        }

        const parsedOrderId = Number(messageOrderId);

        return orders.find((item) => item.id === parsedOrderId) ?? null;
    });
    const [deliveryTarget, setDeliveryTarget] = useState<SellerOrder | null>(
        null,
    );
    const [cancelTarget, setCancelTarget] = useState<SellerOrder | null>(null);
    const [disputeTarget, setDisputeTarget] = useState<SellerOrder | null>(
        null,
    );

    const deliveryForm = useForm<{
        delivery_file: File | null;
        delivery_note: string;
    }>({
        delivery_file: null,
        delivery_note: '',
    });

    const cancelForm = useForm<{
        cancellation_reason: string;
    }>({
        cancellation_reason: '',
    });

    const disputeForm = useForm<{ reason: string }>({
        reason: '',
    });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');

    const activeOrders = useMemo(
        () => orders.filter((order) => order.status === 'active'),
        [orders],
    );
    const deliveredOrders = useMemo(
        () => orders.filter((order) => order.status === 'delivered'),
        [orders],
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
                ].some((value) => normalizeSearch(value).includes(searchTerm));
            const matchesStatus =
                statusFilter === 'all' || order.status === statusFilter;
            const matchesPayment =
                paymentFilter === 'all' ||
                order.payment_status === paymentFilter;

            return matchesSearch && matchesStatus && matchesPayment;
        });
    }, [orders, paymentFilter, search, statusFilter]);
    const paginatedOrders = useClientPagination(filteredOrders);
    const statusOptions = Array.from(
        new Set(orders.map((order) => order.status)),
    );
    const paymentOptions = Array.from(
        new Set(orders.map((order) => order.payment_status)),
    );

    const submitDelivery = (event: React.FormEvent) => {
        event.preventDefault();

        if (!deliveryTarget) {
            return;
        }

        deliveryForm.post(`/seller/orders/${deliveryTarget.id}/deliver`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setDeliveryTarget(null);
                deliveryForm.reset();
            },
        });
    };

    const submitCancellation = (event: React.FormEvent) => {
        event.preventDefault();

        if (!cancelTarget) {
            return;
        }

        cancelForm.post(`/seller/orders/${cancelTarget.id}/cancel`, {
            preserveScroll: true,
            onSuccess: () => {
                setCancelTarget(null);
                cancelForm.reset();
            },
        });
    };

    const submitDispute = (event: React.FormEvent) => {
        event.preventDefault();

        if (!disputeTarget) {
            return;
        }

        disputeForm.post(`/orders/${disputeTarget.id}/disputes`, {
            preserveScroll: true,
            onSuccess: () => {
                setDisputeTarget(null);
                disputeForm.reset();
            },
        });
    };

    return (
        <>
            <Head title="Orders" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Orders"
                        description="A clean view of active work, delivery status, and buyer briefs."
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a href="/seller/orders/export/excel">
                                <Download className="size-4" />
                                Export Excel
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a href="/seller/orders/export/pdf">
                                <FileText className="size-4" />
                                Export PDF
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShoppingBag className="size-4" />
                            Total orders
                        </div>
                        <p className="mt-2 text-2xl font-semibold">
                            {orders.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <PackageCheck className="size-4" />
                            Active work
                        </div>
                        <p className="mt-2 text-2xl font-semibold">
                            {activeOrders.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock3 className="size-4" />
                            Awaiting buyer
                        </div>
                        <p className="mt-2 text-2xl font-semibold">
                            {deliveredOrders.length}
                        </p>
                    </div>
                </div>

                <section className="rounded-2xl border border-border/70 bg-card p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)_auto]">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Search orders
                            </label>
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by order ID, buyer, or gig"
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
                                    {paymentOptions.map((status) => (
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
                                }}
                                className="w-full lg:w-auto"
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

                {orders.length === 0 ? (
                    <EmptyState
                        icon={ShoppingBag}
                        title="No seller orders yet"
                        description="Paid buyer orders will appear here once someone purchases one of your gigs."
                    />
                ) : filteredOrders.length === 0 ? (
                    <EmptyState
                        icon={SlidersHorizontal}
                        title="No matching orders"
                        description="Try changing your search term or clearing one of the filters."
                        action={{ label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); setPaymentFilter('all'); } }}
                    />
                ) : (
                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                        <div className="hidden max-w-full overflow-x-auto lg:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 text-left text-xs tracking-[0.16em] text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Order
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Buyer
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Brief
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Timeline
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.paginatedItems.map(
                                        (order) => (
                                            <tr
                                                key={order.id}
                                                className="border-t border-border/70 align-top"
                                            >
                                                <td className="px-4 py-4">
                                                    <p className="font-medium">
                                                        {order.gig_title ??
                                                            'Order'}
                                                    </p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        #{order.id} •{' '}
                                                        {order.package?.title ??
                                                            'Package'}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <Badge variant="outline">
                                                            {order.package
                                                                ?.tier ??
                                                                'package'}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="font-medium">
                                                        {order.buyer?.name ??
                                                            'Buyer'}
                                                    </p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        {order.buyer?.email ??
                                                            'No email'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-foreground">
                                                        {summarizeText(
                                                            order.requirements,
                                                            90,
                                                        )}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                        {order.reference_link && (
                                                            <a
                                                                href={
                                                                    order.reference_link
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary underline underline-offset-4"
                                                            >
                                                                Reference
                                                            </a>
                                                        )}
                                                        {order.brief_file_url && (
                                                            <>
                                                                <a
                                                                    href={order.brief_file_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                                                                >
                                                                    <Eye className="size-3.5" />
                                                                    View
                                                                </a>
                                                                <a
                                                                    href={order.brief_file_url}
                                                                    download
                                                                    className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                                                                >
                                                                    <Download className="size-3.5" />
                                                                    Download
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p>
                                                        {order.package
                                                            ?.delivery_days ??
                                                            0}{' '}
                                                        days
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                        {order.package
                                                            ?.revision_count ??
                                                            0}{' '}
                                                        revisions
                                                    </p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        Delivered:{' '}
                                                        {shortDate(
                                                            order.delivered_at,
                                                        )}
                                                    </p>
                                                    <div className="mt-1">
                                                        <OrderDueDate dueAt={order.due_at} status={order.status} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-2">
                                                        <Badge
                                                            variant={
                                                                order.status ===
                                                                'active'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {order.status}
                                                        </Badge>
                                                        <Badge
                                                            variant={
                                                                order.payment_status ===
                                                                'paid'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {
                                                                order.payment_status
                                                            }
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 font-medium">
                                                    USD {order.price}
                                                    {Number(
                                                        order.discount_amount,
                                                    ) > 0 && (
                                                        <p className="mt-1 text-xs font-normal text-emerald-600">
                                                            Buyer saved USD{' '}
                                                            {
                                                                order.discount_amount
                                                            }
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <ActionIconButton
                                                            label="View"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setSelectedOrder(
                                                                    order,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="size-4" />
                                                        </ActionIconButton>
                                                        {order.buyer && order.status !== 'cancelled' && (
                                                            <ActionIconButton
                                                                label="Message"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setMessageOrder(
                                                                        order,
                                                                    )
                                                                }
                                                            >
                                                                <MessageCircle className="size-4" />
                                                            </ActionIconButton>
                                                        )}
                                                        <ActionIconButton
                                                            label="Deliver"
                                                            onClick={() =>
                                                                setDeliveryTarget(
                                                                    order,
                                                                )
                                                            }
                                                            disabled={
                                                                order.status !==
                                                                    'active' ||
                                                                order.payment_status !==
                                                                    'paid'
                                                            }
                                                        >
                                                            <Truck className="size-4" />
                                                        </ActionIconButton>
                                                        <ActionIconButton
                                                            label="Cancel"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setCancelTarget(
                                                                    order,
                                                                )
                                                            }
                                                            disabled={
                                                                order.status !== 'active'
                                                            }
                                                        >
                                                            <Ban className="size-4" />
                                                        </ActionIconButton>
                                                        {[
                                                            'delivered',
                                                            'completed',
                                                        ].includes(
                                                            order.status,
                                                        ) &&
                                                            order.payment_status ===
                                                                'paid' &&
                                                            !order.open_dispute_id && (
                                                                <ActionIconButton
                                                                    label="Raise Dispute"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setDisputeTarget(
                                                                            order,
                                                                        )
                                                                    }
                                                                >
                                                                    <AlertTriangle className="size-4" />
                                                                </ActionIconButton>
                                                            )}
                                                        {order.open_dispute_id && (
                                                            <ActionIconButton
                                                                label="View Dispute"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    (window.location.href = `/disputes/${order.open_dispute_id}`)
                                                                }
                                                            >
                                                                <AlertTriangle className="size-4 text-amber-500" />
                                                            </ActionIconButton>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 p-4 lg:hidden">
                            {paginatedOrders.paginatedItems.map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-xl border border-border/70 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">
                                                {order.gig_title ?? 'Order'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                #{order.id} •{' '}
                                                {order.buyer?.name ?? 'Buyer'}
                                            </p>
                                        </div>
                                        <p className="font-semibold">
                                            USD {order.price}
                                        </p>
                                    </div>
                                    {Number(order.discount_amount) > 0 && (
                                        <p className="mt-2 text-xs text-emerald-600">
                                            Buyer saved USD{' '}
                                            {order.discount_amount}
                                        </p>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="outline">
                                            {order.package?.tier ?? 'package'}
                                        </Badge>
                                        <Badge
                                            variant={
                                                order.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {order.status}
                                        </Badge>
                                        <Badge
                                            variant={
                                                order.payment_status === 'paid'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {order.payment_status}
                                        </Badge>
                                        <OrderDueDate dueAt={order.due_at} status={order.status} />
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {summarizeText(order.requirements, 100)}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <ActionIconButton
                                            label="View"
                                            variant="outline"
                                            onClick={() =>
                                                setSelectedOrder(order)
                                            }
                                        >
                                            <Eye className="size-4" />
                                        </ActionIconButton>
                                        {order.buyer && order.status !== 'cancelled' && (
                                            <ActionIconButton
                                                label="Message"
                                                variant="outline"
                                                onClick={() =>
                                                    setMessageOrder(order)
                                                }
                                            >
                                                <MessageCircle className="size-4" />
                                            </ActionIconButton>
                                        )}
                                        <ActionIconButton
                                            label="Deliver"
                                            onClick={() =>
                                                setDeliveryTarget(order)
                                            }
                                            disabled={
                                                order.status !== 'active' ||
                                                order.payment_status !== 'paid'
                                            }
                                        >
                                            <Truck className="size-4" />
                                        </ActionIconButton>
                                        <ActionIconButton
                                            label="Cancel"
                                            variant="outline"
                                            onClick={() =>
                                                setCancelTarget(order)
                                            }
                                            disabled={
                                                order.status !== 'active'
                                            }
                                        >
                                            <Ban className="size-4" />
                                        </ActionIconButton>
                                        {['delivered', 'completed'].includes(
                                            order.status,
                                        ) &&
                                            order.payment_status === 'paid' &&
                                            !order.open_dispute_id && (
                                                <ActionIconButton
                                                    label="Raise Dispute"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setDisputeTarget(order)
                                                    }
                                                >
                                                    <AlertTriangle className="size-4" />
                                                </ActionIconButton>
                                            )}
                                        {order.open_dispute_id && (
                                            <ActionIconButton
                                                label="View Dispute"
                                                variant="outline"
                                                onClick={() =>
                                                    (window.location.href = `/disputes/${order.open_dispute_id}`)
                                                }
                                            >
                                                <AlertTriangle className="size-4 text-amber-500" />
                                            </ActionIconButton>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                    </section>
                )}
            </div>

            <Dialog
                open={Boolean(selectedOrder)}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Order #{selectedOrder?.id} — {selectedOrder?.gig_title}</DialogTitle>
                        <DialogDescription>
                            Full order details, buyer brief, delivery history, and revision trail.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-5">

                            {/* ── Top summary ── */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Order info */}
                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm space-y-2">
                                    <p className="font-semibold text-base mb-3">Order info</p>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Order ID</span>
                                        <span className="font-medium">#{selectedOrder.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Package</span>
                                        <span className="font-medium capitalize">{selectedOrder.package?.tier} — {selectedOrder.package?.title}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Quantity</span>
                                        <span className="font-medium">{selectedOrder.quantity}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Delivery days</span>
                                        <span className="font-medium">{selectedOrder.package?.delivery_days ?? 0} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Revisions</span>
                                        <span className="font-medium">{selectedOrder.package?.revision_count ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant={selectedOrder.status === 'active' ? 'default' : 'secondary'}>{selectedOrder.status}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payment</span>
                                        <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>{selectedOrder.payment_status}</Badge>
                                    </div>
                                </div>

                                {/* Pricing + buyer */}
                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm space-y-2">
                                    <p className="font-semibold text-base mb-3">Buyer & pricing</p>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Buyer</span>
                                        <span className="font-medium">{selectedOrder.buyer?.name ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Email</span>
                                        <span className="font-medium">{selectedOrder.buyer?.email ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium">USD {selectedOrder.subtotal_amount}</span>
                                    </div>
                                    {Number(selectedOrder.discount_amount) > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Discount{selectedOrder.coupon_code ? ` (${selectedOrder.coupon_code})` : ''}</span>
                                            <span className="font-medium text-emerald-600">−USD {selectedOrder.discount_amount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-border/70 pt-2">
                                        <span className="font-semibold">Total</span>
                                        <span className="font-bold">USD {selectedOrder.price}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-muted-foreground">Delivered</span>
                                        <span>{shortDate(selectedOrder.delivered_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Completed</span>
                                        <span>{shortDate(selectedOrder.completed_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Cancelled</span>
                                        <span>{shortDate(selectedOrder.cancelled_at)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Buyer brief ── */}
                            <div className="rounded-2xl border border-border/70 bg-card p-4 text-sm">
                                <p className="font-semibold mb-2">Buyer requirements</p>
                                <p className="whitespace-pre-wrap text-muted-foreground leading-6">{selectedOrder.requirements}</p>
                                <div className="mt-3 flex flex-wrap gap-4">
                                    {selectedOrder.reference_link && (
                                        <a href={selectedOrder.reference_link} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4">
                                            <FileText className="size-3.5" /> Reference link
                                        </a>
                                    )}
                                    {selectedOrder.brief_file_url && (
                                        <>
                                            <a href={selectedOrder.brief_file_url} target="_blank" rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4">
                                                <Eye className="size-3.5" /> View brief
                                            </a>
                                            <a href={selectedOrder.brief_file_url} download
                                                className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4">
                                                <Download className="size-3.5" /> Download brief
                                            </a>
                                        </>
                                    )}
                                </div>
                                {selectedOrder.style_notes && (
                                    <div className="mt-3">
                                        <p className="font-medium text-muted-foreground mb-1">Style notes</p>
                                        <p className="whitespace-pre-wrap text-muted-foreground">{selectedOrder.style_notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Actions ── */}
                            {selectedOrder.status === 'active' && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedOrder.status === 'active' && selectedOrder.payment_status === 'paid' && (
                                        <Button size="sm" onClick={() => { setSelectedOrder(null); setDeliveryTarget(selectedOrder); }}>
                                            <Truck className="mr-1.5 size-4" /> Submit delivery
                                        </Button>
                                    )}
                                    {selectedOrder.buyer && selectedOrder.status !== 'cancelled' && (
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setMessageOrder(selectedOrder); }}>
                                            <MessageCircle className="mr-1.5 size-4" /> Message buyer
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setCancelTarget(selectedOrder); }}
                                        disabled={selectedOrder.status !== 'active'}>
                                        <Ban className="mr-1.5 size-4" /> Cancel order
                                    </Button>
                                    {['delivered', 'completed'].includes(selectedOrder.status) && selectedOrder.payment_status === 'paid' && !selectedOrder.open_dispute_id && (
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setDisputeTarget(selectedOrder); }}>
                                            <AlertTriangle className="mr-1.5 size-4" /> Raise dispute
                                        </Button>
                                    )}
                                    {selectedOrder.open_dispute_id && (
                                        <Button size="sm" variant="outline" onClick={() => window.location.href = `/disputes/${selectedOrder.open_dispute_id}`}>
                                            <AlertTriangle className="mr-1.5 size-4 text-amber-500" /> View dispute
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* ── Deliveries ── */}
                            <div className="rounded-2xl border border-border/70 bg-card p-4">
                                <p className="font-semibold mb-3">Delivery history ({selectedOrder.deliveries.length})</p>
                                {selectedOrder.deliveries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No delivery submitted yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedOrder.deliveries.map((delivery) => (
                                            <div key={delivery.id} className="rounded-xl border border-border/70 p-3 text-sm">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">{formatDate(delivery.delivered_at)}</p>
                                                        <p className="text-muted-foreground">By {delivery.delivered_by ?? 'Seller'}</p>
                                                        {delivery.note && <p className="mt-1 text-muted-foreground">{delivery.note}</p>}
                                                    </div>
                                                    <div className="flex shrink-0 flex-col gap-1.5">
                                                        <a href={delivery.file_url} target="_blank" rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4">
                                                            <Eye className="size-3.5" /> View
                                                        </a>
                                                        <a href={delivery.file_url} download
                                                            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4">
                                                            <Download className="size-3.5" /> Download
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Revisions ── */}
                            {selectedOrder.revisions.length > 0 && (
                                <div className="rounded-2xl border border-border/70 bg-card p-4">
                                    <p className="font-semibold mb-3">Revision requests ({selectedOrder.revisions.length})</p>
                                    <div className="space-y-3">
                                        {selectedOrder.revisions.map((revision) => (
                                            <div key={revision.id} className="rounded-xl border border-border/70 p-3 text-sm">
                                                <p className="font-medium">{revision.requested_by ?? 'Buyer'}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(revision.created_at)}</p>
                                                <p className="mt-1 text-muted-foreground">{revision.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Cancellations ── */}
                            {selectedOrder.cancellations.length > 0 && (
                                <div className="rounded-2xl border border-border/70 bg-card p-4">
                                    <p className="font-semibold mb-3">Cancellation trail</p>
                                    <div className="space-y-3">
                                        {selectedOrder.cancellations.map((c) => (
                                            <div key={c.id} className="rounded-xl border border-border/70 p-3 text-sm">
                                                <p className="font-medium capitalize">{c.cancelled_by}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                                                <p className="mt-1 text-muted-foreground">{c.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <OrderChatModal
                open={Boolean(messageOrder)}
                onOpenChange={(open) => {
                    if (!open) {
                        setMessageOrder(null);
                    }
                }}
                orderId={messageOrder?.id ?? null}
                recipientName={messageOrder?.buyer?.name ?? null}
            />

            <Dialog
                open={Boolean(deliveryTarget)}
                onOpenChange={(open) => !open && setDeliveryTarget(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Submit delivery</DialogTitle>
                        <DialogDescription>
                            Upload the delivery file and an optional note for
                            the buyer.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitDelivery} className="space-y-4">
                        <div className="grid gap-2">
                            <label
                                htmlFor="delivery_file"
                                className="text-sm font-medium"
                            >
                                Delivery file
                            </label>
                            <input
                                id="delivery_file"
                                type="file"
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                onChange={(event) =>
                                    deliveryForm.setData(
                                        'delivery_file',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                required
                            />
                            <InputError
                                message={deliveryForm.errors.delivery_file}
                            />
                        </div>

                        <div className="grid gap-2">
                            <label
                                htmlFor="delivery_note"
                                className="text-sm font-medium"
                            >
                                Delivery note
                            </label>
                            <textarea
                                id="delivery_note"
                                rows={4}
                                value={deliveryForm.data.delivery_note}
                                onChange={(event) =>
                                    deliveryForm.setData(
                                        'delivery_note',
                                        event.target.value,
                                    )
                                }
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Explain what is included and any next steps for the buyer."
                            />
                            <InputError
                                message={deliveryForm.errors.delivery_note}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={deliveryForm.processing}
                        >
                            {deliveryForm.processing
                                ? 'Submitting...'
                                : 'Submit delivery'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(cancelTarget)}
                onOpenChange={(open) => !open && setCancelTarget(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Cancel order</DialogTitle>
                        <DialogDescription>
                            Add a clear reason so the cancellation is stored for
                            audit.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCancellation} className="space-y-4">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <div className="flex items-center gap-2 font-medium">
                                <ShieldAlert className="size-4" />
                                Cancellation note
                            </div>
                            <p className="mt-2">
                                Paid orders will be marked as refunded in the
                                current implementation.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <label
                                htmlFor="cancellation_reason"
                                className="text-sm font-medium"
                            >
                                Reason
                            </label>
                            <textarea
                                id="cancellation_reason"
                                rows={5}
                                value={cancelForm.data.cancellation_reason}
                                onChange={(event) =>
                                    cancelForm.setData(
                                        'cancellation_reason',
                                        event.target.value,
                                    )
                                }
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Explain why this order is being cancelled."
                                required
                            />
                            <InputError
                                message={cancelForm.errors.cancellation_reason}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={cancelForm.processing}
                        >
                            {cancelForm.processing
                                ? 'Cancelling...'
                                : 'Confirm cancellation'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(disputeTarget)}
                onOpenChange={(open) => !open && setDisputeTarget(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Raise a Dispute</DialogTitle>
                        <DialogDescription>
                            Describe the issue clearly. Admin will review and
                            make a decision.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitDispute} className="space-y-4">
                        <div className="grid gap-2">
                            <label
                                htmlFor="dispute_reason"
                                className="text-sm font-medium"
                            >
                                Reason
                            </label>
                            <textarea
                                id="dispute_reason"
                                rows={5}
                                value={disputeForm.data.reason}
                                onChange={(e) =>
                                    disputeForm.setData(
                                        'reason',
                                        e.target.value,
                                    )
                                }
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Explain the problem with this order..."
                                required
                            />
                            <InputError message={disputeForm.errors.reason} />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={disputeForm.processing}
                        >
                            {disputeForm.processing
                                ? 'Submitting...'
                                : 'Submit Dispute'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

SellerOrdersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Orders',
            href: '/seller/orders',
        },
    ] satisfies BreadcrumbItem[],
};
