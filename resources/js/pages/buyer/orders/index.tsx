import { Head, Link, router, useForm } from '@inertiajs/react';
import { FileText, Star } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

type OrderItem = {
    id: number;
    gig_title: string | null;
    package: {
        title: string;
        tier: string;
        delivery_days: number;
        revision_count: number;
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
    brief_file_url: string | null;
    price: string;
    unit_price: string;
    status: string;
    payment_status: string;
    paypal_order_id: string | null;
    created_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    used_revisions: number;
    remaining_revisions: number;
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
    review: {
        id: number;
        rating: number;
        comment: string;
        created_at: string | null;
    } | null;
};

type PaypalConfig = {
    mode: 'sandbox' | 'live';
    client_id: string;
    currency: string;
    enabled: boolean;
    message: string | null;
};

type Props = {
    orders: OrderItem[];
    paypal: PaypalConfig;
};

type PaypalButtonsProps = {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID?: string }) => Promise<void>;
    onError: (error: Error) => void;
};

declare global {
    interface Window {
        paypal?: {
            Buttons: (props: PaypalButtonsProps) => {
                render: (selector: string | HTMLElement) => Promise<void>;
            };
        };
    }
}

const PAYPAL_SCRIPT_ID = 'paypal-js-sdk';

function formatDate(value: string | null) {
    if (!value) {
        return 'Just now';
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

function getCsrfToken() {
    return document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.content;
}

async function requestJson<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(getCsrfToken() ? { 'X-CSRF-TOKEN': getCsrfToken()! } : {}),
        },
        body: JSON.stringify(body ?? {}),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = payload?.errors
            ? Object.values(payload.errors).flat().join(' ')
            : payload?.message || 'Request failed.';

        throw new Error(message);
    }

    return payload as T;
}

export default function BuyerOrdersIndex({ orders, paypal }: Props) {
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
    const [revisionTarget, setRevisionTarget] = useState<OrderItem | null>(null);
    const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null);
    const [reviewTarget, setReviewTarget] = useState<OrderItem | null>(null);
    const [checkoutOrder, setCheckoutOrder] = useState<OrderItem | null>(null);
    const [checkoutPaypalOrderId, setCheckoutPaypalOrderId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isLoadingButtons, setIsLoadingButtons] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement | null>(null);
    const [paypalContainerElement, setPaypalContainerElement] = useState<HTMLDivElement | null>(null);
    const revisionForm = useForm<{
        revision_note: string;
    }>({
        revision_note: '',
    });
    const cancelForm = useForm<{
        cancellation_reason: string;
    }>({
        cancellation_reason: '',
    });
    const reviewForm = useForm<{
        rating: string;
        comment: string;
    }>({
        rating: '5',
        comment: '',
    });

    useEffect(() => {
        if (!checkoutOrder || checkoutOrder.payment_status === 'paid' || !paypal.enabled) {
            return;
        }

        let cancelled = false;
        const paypalContainer = paypalContainerRef.current;

        if (!paypalContainer) {
            return;
        }

        paypalContainer.innerHTML = '';

        const loadScript = async () => {
            if (window.paypal) {
                return;
            }

            const existingScript = document.getElementById(PAYPAL_SCRIPT_ID) as HTMLScriptElement | null;

            if (existingScript) {
                await new Promise<void>((resolve, reject) => {
                    if (window.paypal) {
                        resolve();

                        return;
                    }

                    existingScript.addEventListener('load', () => resolve(), { once: true });
                    existingScript.addEventListener('error', () => reject(new Error('Unable to load PayPal SDK.')), { once: true });
                });

                return;
            }

            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.id = PAYPAL_SCRIPT_ID;
                script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
                    paypal.client_id,
                )}&currency=${encodeURIComponent(paypal.currency)}&intent=capture`;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Unable to load PayPal SDK.'));
                document.head.appendChild(script);
            });
        };

        requestJson<{ id: string }>(`/buyer/orders/${checkoutOrder.id}/paypal/order`)
            .then(async (order) => {
                if (cancelled) {
                    return;
                }

                setCheckoutPaypalOrderId(order.id);

                await loadScript();

                if (cancelled || !window.paypal || !paypalContainer) {
                    return;
                }

                const buttons = window.paypal.Buttons({
                    createOrder: async () => order.id,
                    onApprove: async (data) => {
                        if (!data.orderID) {
                            throw new Error('PayPal did not return an order ID.');
                        }

                        try {
                            await requestJson(`/buyer/orders/${checkoutOrder.id}/paypal/capture`, {
                                order_id: data.orderID,
                            });
                        } catch (error) {
                            const message = error instanceof Error ? error.message : 'PayPal capture failed.';

                            setCheckoutError(message);

                            throw error;
                        }

                        setCheckoutOrder(null);
                        setCheckoutPaypalOrderId(null);
                        router.reload({ only: ['orders'] });
                    },
                    onError: (error) => {
                        setCheckoutError(error.message || 'PayPal checkout failed unexpectedly.');
                    },
                });

                await buttons.render(paypalContainer);
            })
            .catch((error: Error) => {
                if (!cancelled) {
                    setCheckoutPaypalOrderId(null);
                    setCheckoutError(error.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingButtons(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [checkoutOrder, paypal.client_id, paypal.currency, paypal.enabled, paypalContainerElement]);

    const handlePaypalContainerRef = useCallback((node: HTMLDivElement | null) => {
        paypalContainerRef.current = node;
        setPaypalContainerElement(node);
    }, []);

    const openCheckout = (order: OrderItem) => {
        setCheckoutError(null);
        setCheckoutPaypalOrderId(null);
        setIsLoadingButtons(true);
        setCheckoutOrder(order);
    };

    const submitRevision = (event: React.FormEvent) => {
        event.preventDefault();

        if (!revisionTarget) {
            return;
        }

        revisionForm.post(`/buyer/orders/${revisionTarget.id}/revision`, {
            preserveScroll: true,
            onSuccess: () => {
                setRevisionTarget(null);
                setSelectedOrder(null);
                revisionForm.reset();
            },
        });
    };

    const submitCancellation = (event: React.FormEvent) => {
        event.preventDefault();

        if (!cancelTarget) {
            return;
        }

        cancelForm.post(`/buyer/orders/${cancelTarget.id}/cancel`, {
            preserveScroll: true,
            onSuccess: () => {
                setCancelTarget(null);
                setSelectedOrder(null);
                cancelForm.reset();
            },
        });
    };

    const completeOrder = (order: OrderItem) => {
        router.post(`/buyer/orders/${order.id}/complete`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedOrder(null);
            },
        });
    };

    const submitReview = (event: React.FormEvent) => {
        event.preventDefault();

        if (!reviewTarget) {
            return;
        }

        reviewForm.post(`/buyer/orders/${reviewTarget.id}/review`, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewTarget(null);
                setSelectedOrder(null);
                reviewForm.reset('comment');
                reviewForm.setData('rating', '5');
            },
        });
    };

    return (
        <>
            <Head title="Orders" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Orders"
                    description="A simpler view of your purchases, payments, and deliveries."
                />

                {orders.length === 0 ? (
                    <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                        <h2 className="text-lg font-semibold">No orders yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Browse the catalog, pick a package, and your first buyer order will show up here.
                        </p>
                        <div className="mt-5">
                            <Button asChild>
                                <Link href="/buyer/gigs">Explore gigs</Link>
                            </Button>
                        </div>
                    </section>
                ) : (
                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Order</th>
                                        <th className="px-4 py-3 font-medium">Seller</th>
                                        <th className="px-4 py-3 font-medium">Requirements</th>
                                        <th className="px-4 py-3 font-medium">Delivery</th>
                                        <th className="px-4 py-3 font-medium">Payment</th>
                                        <th className="px-4 py-3 font-medium">Total</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-t border-border/70 align-top">
                                            <td className="px-4 py-4">
                                                <p className="font-medium">{order.gig_title ?? 'Order'}</p>
                                                <p className="mt-1 text-muted-foreground">#{order.id} • {order.package?.title ?? 'Custom'}</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <Badge variant="outline">{order.package?.tier ?? 'package'}</Badge>
                                                    <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>{order.status}</Badge>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-medium">{order.seller?.name ?? 'Seller'}</p>
                                                <p className="mt-1 text-muted-foreground">{order.seller?.email ?? 'No email'}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-foreground">{summarizeText(order.requirements, 90)}</p>
                                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    <span>Qty {order.quantity}</span>
                                                    <span>Unit USD {order.unit_price}</span>
                                                    {order.brief_file_url && (
                                                        <a href={order.brief_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
                                                            <FileText className="size-3.5" />
                                                            File
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p>{order.deliveries.length} file(s)</p>
                                                <p className="text-muted-foreground">{shortDate(order.delivered_at)}</p>
                                                <p className="mt-1 text-muted-foreground">{order.package?.delivery_days ?? 0} days • {order.package?.revision_count ?? 0} revisions</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>{order.payment_status}</Badge>
                                                    <span className="text-muted-foreground">{shortDate(order.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-medium">USD {order.price}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>View</Button>
                                                    {order.payment_status === 'pending' && (
                                                        <Button size="sm" onClick={() => openCheckout(order)} disabled={!paypal.enabled}>Pay</Button>
                                                    )}
                                                    {order.status === 'delivered' && order.payment_status === 'paid' && order.remaining_revisions > 0 && (
                                                        <Button size="sm" variant="outline" onClick={() => setRevisionTarget(order)}>Revision</Button>
                                                    )}
                                                    {order.status === 'completed' && !order.review && (
                                                        <Button size="sm" variant="outline" onClick={() => setReviewTarget(order)}>Review</Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 p-4 lg:hidden">
                            {orders.map((order) => (
                                <div key={order.id} className="rounded-xl border border-border/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{order.gig_title ?? 'Order'}</p>
                                            <p className="text-sm text-muted-foreground">#{order.id} • {order.seller?.name ?? 'Seller'}</p>
                                        </div>
                                        <p className="font-semibold">USD {order.price}</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="outline">{order.package?.tier ?? 'package'}</Badge>
                                        <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>{order.status}</Badge>
                                        <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>{order.payment_status}</Badge>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">{summarizeText(order.requirements, 100)}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>View</Button>
                                        {order.payment_status === 'pending' && (
                                            <Button size="sm" onClick={() => openCheckout(order)} disabled={!paypal.enabled}>Pay</Button>
                                        )}
                                        {order.status === 'delivered' && order.payment_status === 'paid' && order.remaining_revisions > 0 && (
                                            <Button size="sm" variant="outline" onClick={() => setRevisionTarget(order)}>Revision</Button>
                                        )}
                                        {order.status === 'completed' && !order.review && (
                                            <Button size="sm" variant="outline" onClick={() => setReviewTarget(order)}>Review</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Buyer order detail</DialogTitle>
                        <DialogDescription>
                            Review delivery files, seller notes, revision history, and any cancellation updates for this order.
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
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Badge variant="outline">
                                        {selectedOrder.remaining_revisions} revision{selectedOrder.remaining_revisions === 1 ? '' : 's'} left
                                    </Badge>
                                    {selectedOrder.payment_status === 'pending' && (
                                        <Button onClick={() => openCheckout(selectedOrder)} disabled={!paypal.enabled}>
                                            Pay with PayPal
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'delivered' && selectedOrder.payment_status === 'paid' && selectedOrder.remaining_revisions > 0 && (
                                        <Button variant="outline" onClick={() => setRevisionTarget(selectedOrder)}>
                                            Request revision
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'delivered' && selectedOrder.payment_status === 'paid' && (
                                        <Button onClick={() => completeOrder(selectedOrder)}>
                                            Mark complete
                                        </Button>
                                    )}
                                    {selectedOrder.status === 'completed' && !selectedOrder.review && (
                                        <Button variant="outline" onClick={() => setReviewTarget(selectedOrder)}>
                                            Leave review
                                        </Button>
                                    )}
                                    {['pending', 'active', 'delivered'].includes(selectedOrder.status) && (
                                        <Button variant="outline" onClick={() => setCancelTarget(selectedOrder)}>
                                            Cancel order
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="rounded-3xl border border-border/70 bg-card p-6">
                                    <h3 className="text-base font-semibold">Delivered files</h3>
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
                                        <h3 className="text-base font-semibold">Revision history</h3>
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

                                    <div className="rounded-3xl border border-border/70 bg-card p-6">
                                        <h3 className="text-base font-semibold">Your review</h3>
                                        {!selectedOrder.review ? (
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                {selectedOrder.status === 'completed'
                                                    ? 'This order is complete and ready for your review.'
                                                    : 'You can leave a review after the order is completed.'}
                                            </p>
                                        ) : (
                                            <div className="mt-4 rounded-2xl border border-border/70 p-4 text-sm">
                                                <div className="flex items-center gap-2 font-medium text-amber-600">
                                                    <Star className="size-4 fill-current" />
                                                    {selectedOrder.review.rating.toFixed(1)} out of 5
                                                </div>
                                                <p className="mt-2 text-muted-foreground">
                                                    {selectedOrder.review.comment}
                                                </p>
                                                <p className="mt-3 text-xs text-muted-foreground">
                                                    Submitted {formatDate(selectedOrder.review.created_at)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(revisionTarget)} onOpenChange={(open) => !open && setRevisionTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Request revision</DialogTitle>
                        <DialogDescription>
                            Tell the seller exactly what needs to be updated in the delivered work.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitRevision} className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="revision_note" className="text-sm font-medium">Revision note</label>
                            <textarea
                                id="revision_note"
                                rows={5}
                                value={revisionForm.data.revision_note}
                                onChange={(event) => revisionForm.setData('revision_note', event.target.value)}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Describe what should change in the delivery."
                                required
                            />
                            <InputError message={revisionForm.errors.revision_note} />
                        </div>

                        <Button type="submit" className="w-full" disabled={revisionForm.processing}>
                            {revisionForm.processing ? 'Submitting...' : 'Submit revision request'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Cancel order</DialogTitle>
                        <DialogDescription>
                            Add a reason so the cancellation is recorded in the order history.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCancellation} className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="cancellation_reason" className="text-sm font-medium">Reason</label>
                            <textarea
                                id="cancellation_reason"
                                rows={5}
                                value={cancelForm.data.cancellation_reason}
                                onChange={(event) => cancelForm.setData('cancellation_reason', event.target.value)}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Explain why you want to cancel this order."
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

            <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Leave a review</DialogTitle>
                        <DialogDescription>
                            Rate the completed order and share a short comment for future buyers.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitReview} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Rating</label>
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => {
                                    const active = reviewForm.data.rating === String(rating);

                                    return (
                                        <Button
                                            key={rating}
                                            type="button"
                                            variant={active ? 'default' : 'outline'}
                                            onClick={() => reviewForm.setData('rating', String(rating))}
                                            className="justify-center"
                                        >
                                            <Star className={`mr-1 size-4 ${active ? 'fill-current' : ''}`} />
                                            {rating}
                                        </Button>
                                    );
                                })}
                            </div>
                            <InputError message={reviewForm.errors.rating} />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="comment" className="text-sm font-medium">Comment</label>
                            <textarea
                                id="comment"
                                rows={5}
                                value={reviewForm.data.comment}
                                onChange={(event) => reviewForm.setData('comment', event.target.value)}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Share what went well and what future buyers should know."
                                required
                            />
                            <InputError message={reviewForm.errors.comment} />
                        </div>

                        <Button type="submit" className="w-full" disabled={reviewForm.processing}>
                            {reviewForm.processing ? 'Submitting...' : 'Submit review'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(checkoutOrder)}
                onOpenChange={(open) => {
                    if (!open) {
                        setCheckoutOrder(null);
                        setCheckoutPaypalOrderId(null);
                        setCheckoutError(null);
                        setIsLoadingButtons(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {checkoutOrder ? `Pay for order #${checkoutOrder.id}` : 'Pay for order'}
                        </DialogTitle>
                        <DialogDescription>
                            Complete PayPal checkout to activate this buyer order.
                        </DialogDescription>
                    </DialogHeader>

                    {checkoutOrder && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Gig</span>
                                    <span className="font-medium">{checkoutOrder.gig_title}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Package</span>
                                    <span className="font-medium">{checkoutOrder.package?.title}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Total</span>
                                    <span className="font-medium">
                                        {paypal.currency} {checkoutOrder.price}
                                    </span>
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                    {checkoutError}
                                </div>
                            )}

                            {!paypal.enabled && paypal.message && !checkoutError && (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                    {paypal.message}
                                </div>
                            )}

                            {isLoadingButtons && (
                                <p className="text-sm text-muted-foreground">Loading PayPal checkout…</p>
                            )}

                            {!isLoadingButtons && checkoutPaypalOrderId && (
                                <p className="text-xs text-muted-foreground">
                                    PayPal order ready: {checkoutPaypalOrderId}
                                </p>
                            )}

                            <div ref={handlePaypalContainerRef} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

BuyerOrdersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Orders',
            href: '/buyer/orders',
        },
    ] satisfies BreadcrumbItem[],
};
