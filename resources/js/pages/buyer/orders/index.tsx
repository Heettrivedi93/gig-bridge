import { Head, Link, router } from '@inertiajs/react';
import { Clock3, CreditCard, FileText, ShoppingBag } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Heading from '@/components/heading';
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
    package_title: string | null;
    package_tier: string | null;
    seller_name: string | null;
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
    const [checkoutOrder, setCheckoutOrder] = useState<OrderItem | null>(null);
    const [checkoutPaypalOrderId, setCheckoutPaypalOrderId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isLoadingButtons, setIsLoadingButtons] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement | null>(null);
    const [paypalContainerElement, setPaypalContainerElement] = useState<HTMLDivElement | null>(null);

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

    return (
        <>
            <Head title="My Orders" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="My Orders"
                    description="Track your pending buyer orders, review the submitted brief, and get ready for payment and delivery milestones."
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
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <section
                                key={order.id}
                                className="rounded-3xl border border-border/70 bg-card p-6"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-lg font-semibold">
                                                {order.gig_title ?? 'Order'}
                                            </h2>
                                            <Badge variant="outline">
                                                {order.package_tier ?? 'package'}
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
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            Seller: {order.seller_name ?? 'Seller'} • Package: {order.package_title ?? 'Custom'}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Order total</p>
                                        <p className="text-2xl font-semibold">USD {order.price}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ShoppingBag className="size-4" />
                                            Order summary
                                        </div>
                                        <p className="mt-3 text-sm">
                                            Quantity: <span className="font-medium">{order.quantity}</span>
                                        </p>
                                        <p className="mt-1 text-sm">
                                            Unit price: <span className="font-medium">USD {order.unit_price}</span>
                                        </p>
                                        <p className="mt-1 text-sm">
                                            Status: <span className="font-medium">{order.status}</span>
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock3 className="size-4" />
                                            Created
                                        </div>
                                        <p className="mt-3 text-sm font-medium">
                                            {formatDate(order.created_at)}
                                        </p>
                                        {order.coupon_code && (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Coupon: {order.coupon_code}
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CreditCard className="size-4" />
                                            Payment
                                        </div>
                                        <p className="mt-3 text-sm font-medium">
                                            {order.payment_status === 'pending'
                                                ? 'Pending payment'
                                                : order.payment_status}
                                        </p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {order.payment_status === 'pending'
                                                ? 'Complete PayPal checkout to activate this order for the seller.'
                                                : 'Payment captured successfully.'}
                                        </p>
                                        {order.payment_status === 'pending' && (
                                            <Button
                                                className="mt-4 w-full"
                                                onClick={() => openCheckout(order)}
                                                disabled={!paypal.enabled}
                                            >
                                                Pay with PayPal
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-border/70 p-4">
                                    <p className="text-sm font-medium">Requirements</p>
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
                            </section>
                        ))}
                    </div>
                )}
            </div>

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
                                    <span className="font-medium">{checkoutOrder.package_title}</span>
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
            title: 'My Orders',
            href: '/buyer/orders',
        },
    ] satisfies BreadcrumbItem[],
};
