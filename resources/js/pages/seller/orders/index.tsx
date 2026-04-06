import { Head, useForm } from '@inertiajs/react';
import { Clock3, FileText, PackageCheck, ShieldAlert, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
        name: string;
        email: string;
    } | null;
    quantity: number;
    requirements: string;
    reference_link: string | null;
    style_notes: string | null;
    coupon_code: string | null;
    brief_file_url: string | null;
    price: string;
    status: string;
    payment_status: string;
    delivered_at: string | null;
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

export default function SellerOrdersIndex({ orders }: Props) {
    const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
    const [deliveryTarget, setDeliveryTarget] = useState<SellerOrder | null>(null);
    const [cancelTarget, setCancelTarget] = useState<SellerOrder | null>(null);

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

    const activeOrders = useMemo(
        () => orders.filter((order) => order.status === 'active'),
        [orders],
    );
    const deliveredOrders = useMemo(
        () => orders.filter((order) => order.status === 'delivered'),
        [orders],
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

    return (
        <>
            <Head title="Seller Orders" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Seller Orders"
                    description="Manage paid work, review buyer briefs, deliver files, and keep a clear audit trail for cancellations and revision requests."
                />

                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShoppingBag className="size-4" />
                            Total orders
                        </div>
                        <p className="mt-3 text-2xl font-semibold">{orders.length}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            All orders assigned to your seller account.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <PackageCheck className="size-4" />
                            Active work
                        </div>
                        <p className="mt-3 text-2xl font-semibold">{activeOrders.length}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Orders you can deliver right now.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="size-4" />
                            Awaiting buyer
                        </div>
                        <p className="mt-3 text-2xl font-semibold">{deliveredOrders.length}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Delivered work waiting for buyer action.
                        </p>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                        <h2 className="text-lg font-semibold">No seller orders yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Paid buyer orders will appear here once someone purchases one of your gigs.
                        </p>
                    </section>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <section key={order.id} className="rounded-3xl border border-border/70 bg-card p-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-lg font-semibold">
                                                {order.gig_title ?? 'Order'}
                                            </h2>
                                            <Badge variant="outline">
                                                {order.package?.tier ?? 'package'}
                                            </Badge>
                                            <Badge variant={order.status === 'active' ? 'default' : 'secondary'}>
                                                {order.status}
                                            </Badge>
                                            <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                                                {order.payment_status}
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            Buyer: {order.buyer?.name ?? 'Buyer'} • Package: {order.package?.title ?? 'Package'}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Order total</p>
                                        <p className="text-2xl font-semibold">USD {order.price}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Buyer
                                        </p>
                                        <p className="mt-2 font-medium">{order.buyer?.name}</p>
                                        <p className="text-sm text-muted-foreground">{order.buyer?.email}</p>
                                    </div>

                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Delivery timeline
                                        </p>
                                        <p className="mt-2 font-medium">
                                            {order.package?.delivery_days ?? 0} days
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {order.package?.revision_count ?? 0} revisions
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Delivered at
                                        </p>
                                        <p className="mt-2 font-medium">{formatDate(order.delivered_at)}</p>
                                    </div>

                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Completed at
                                        </p>
                                        <p className="mt-2 font-medium">{formatDate(order.completed_at)}</p>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-border/70 p-4">
                                    <p className="text-sm font-medium">Buyer requirements</p>
                                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                                        {order.requirements}
                                    </p>

                                    {(order.reference_link || order.style_notes || order.brief_file_url) && (
                                        <div className="mt-4 space-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
                                            {order.reference_link && (
                                                <p>
                                                    Reference:{' '}
                                                    <a
                                                        href={order.reference_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary underline underline-offset-4"
                                                    >
                                                        {order.reference_link}
                                                    </a>
                                                </p>
                                            )}
                                            {order.style_notes && <p>Style notes: {order.style_notes}</p>}
                                            {order.brief_file_url && (
                                                <a
                                                    href={order.brief_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 text-primary underline underline-offset-4"
                                                >
                                                    <FileText className="size-4" />
                                                    Download brief file
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Button variant="outline" onClick={() => setSelectedOrder(order)}>
                                        View detail
                                    </Button>
                                    <Button
                                        onClick={() => setDeliveryTarget(order)}
                                        disabled={order.status !== 'active' || order.payment_status !== 'paid'}
                                    >
                                        Submit delivery
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setCancelTarget(order)}
                                        disabled={!['active', 'delivered'].includes(order.status)}
                                    >
                                        Cancel order
                                    </Button>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Seller order detail</DialogTitle>
                        <DialogDescription>
                            Review delivery history, revision notes, and cancellation trail for this order.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-border/70 bg-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Order #{selectedOrder.id}</p>
                                        <p className="mt-1 text-xl font-semibold">{selectedOrder.gig_title}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline">{selectedOrder.package?.tier}</Badge>
                                        <Badge>{selectedOrder.status}</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="rounded-3xl border border-border/70 bg-card p-6">
                                    <h3 className="text-base font-semibold">Deliveries</h3>
                                    {selectedOrder.deliveries.length === 0 ? (
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            No delivery submitted yet.
                                        </p>
                                    ) : (
                                        <div className="mt-4 space-y-4">
                                            {selectedOrder.deliveries.map((delivery) => (
                                                <div key={delivery.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                                                    <p className="font-medium">{formatDate(delivery.delivered_at)}</p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        By {delivery.delivered_by ?? 'Seller'}
                                                    </p>
                                                    {delivery.note && (
                                                        <p className="mt-2 text-muted-foreground">{delivery.note}</p>
                                                    )}
                                                    <a
                                                        href={delivery.file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-3 inline-flex items-center gap-2 text-primary underline underline-offset-4"
                                                    >
                                                        <FileText className="size-4" />
                                                        Download delivery
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="rounded-3xl border border-border/70 bg-card p-6">
                                        <h3 className="text-base font-semibold">Revision requests</h3>
                                        {selectedOrder.revisions.length === 0 ? (
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                No revision requests yet.
                                            </p>
                                        ) : (
                                            <div className="mt-4 space-y-4">
                                                {selectedOrder.revisions.map((revision) => (
                                                    <div key={revision.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                                                        <p className="font-medium">{revision.requested_by ?? 'Buyer'}</p>
                                                        <p className="mt-1 text-muted-foreground">{formatDate(revision.created_at)}</p>
                                                        <p className="mt-2 text-muted-foreground">{revision.note}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-3xl border border-border/70 bg-card p-6">
                                        <h3 className="text-base font-semibold">Cancellation trail</h3>
                                        {selectedOrder.cancellations.length === 0 ? (
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                No cancellation recorded.
                                            </p>
                                        ) : (
                                            <div className="mt-4 space-y-4">
                                                {selectedOrder.cancellations.map((cancellation) => (
                                                    <div key={cancellation.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                                                        <p className="font-medium capitalize">{cancellation.cancelled_by}</p>
                                                        <p className="mt-1 text-muted-foreground">{formatDate(cancellation.created_at)}</p>
                                                        <p className="mt-2 text-muted-foreground">{cancellation.reason}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deliveryTarget)} onOpenChange={(open) => !open && setDeliveryTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Submit delivery</DialogTitle>
                        <DialogDescription>
                            Upload the delivery file and an optional note for the buyer.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitDelivery} className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="delivery_file" className="text-sm font-medium">Delivery file</label>
                            <input
                                id="delivery_file"
                                type="file"
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                onChange={(event) => deliveryForm.setData('delivery_file', event.target.files?.[0] ?? null)}
                                required
                            />
                            <InputError message={deliveryForm.errors.delivery_file} />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="delivery_note" className="text-sm font-medium">Delivery note</label>
                            <textarea
                                id="delivery_note"
                                rows={4}
                                value={deliveryForm.data.delivery_note}
                                onChange={(event) => deliveryForm.setData('delivery_note', event.target.value)}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Explain what is included and any next steps for the buyer."
                            />
                            <InputError message={deliveryForm.errors.delivery_note} />
                        </div>

                        <Button type="submit" className="w-full" disabled={deliveryForm.processing}>
                            {deliveryForm.processing ? 'Submitting...' : 'Submit delivery'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Cancel order</DialogTitle>
                        <DialogDescription>
                            Add a clear reason so the cancellation is stored for audit.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCancellation} className="space-y-4">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <div className="flex items-center gap-2 font-medium">
                                <ShieldAlert className="size-4" />
                                Cancellation note
                            </div>
                            <p className="mt-2">
                                Paid orders will be marked as refunded in the current implementation.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="cancellation_reason" className="text-sm font-medium">Reason</label>
                            <textarea
                                id="cancellation_reason"
                                rows={5}
                                value={cancelForm.data.cancellation_reason}
                                onChange={(event) => cancelForm.setData('cancellation_reason', event.target.value)}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Explain why this order is being cancelled."
                                required
                            />
                            <InputError message={cancelForm.errors.cancellation_reason} />
                        </div>

                        <Button type="submit" className="w-full" disabled={cancelForm.processing}>
                            {cancelForm.processing ? 'Cancelling...' : 'Confirm cancellation'}
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
