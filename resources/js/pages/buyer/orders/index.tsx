import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CreditCard,
    Download,
    Eye,
    FileText,
    MessageCircle,
    RefreshCcw,
    ShoppingBag,
    SlidersHorizontal,
    Star,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    unit_price: string;
    status: string;
    payment_status: string;
    paypal_order_id: string | null;
    created_at: string | null;
    delivered_at: string | null;
    due_at: string | null;
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
    open_dispute_id: number | null;
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
    refund_policy: string;
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

function getCsrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.content;
}

async function requestJson<T>(
    url: string,
    body?: Record<string, unknown>,
): Promise<T> {
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

export default function BuyerOrdersIndex({ orders, paypal, refund_policy }: Props) {
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
    const [messageOrder, setMessageOrder] = useState<OrderItem | null>(() => {
        const messageOrderId = new URLSearchParams(window.location.search).get(
            'message_order',
        );

        if (!messageOrderId) {
            return null;
        }

        const parsedOrderId = Number(messageOrderId);

        return orders.find((item) => item.id === parsedOrderId) ?? null;
    });
    const [revisionTarget, setRevisionTarget] = useState<OrderItem | null>(
        null,
    );
    const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null);
    const [reviewTarget, setReviewTarget] = useState<OrderItem | null>(null);
    const [disputeTarget, setDisputeTarget] = useState<OrderItem | null>(null);
    const [checkoutOrder, setCheckoutOrder] = useState<OrderItem | null>(null);
    const [checkoutPaypalOrderId, setCheckoutPaypalOrderId] = useState<
        string | null
    >(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isLoadingButtons, setIsLoadingButtons] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement | null>(null);
    const [paypalContainerElement, setPaypalContainerElement] =
        useState<HTMLDivElement | null>(null);
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
    const disputeForm = useForm<{ reason: string }>({
        reason: '',
    });
    const reviewForm = useForm<{
        rating: string;
        comment: string;
    }>({
        rating: '5',
        comment: '',
    });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
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
                    order.seller?.name,
                    order.seller?.email,
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

    useEffect(() => {
        if (
            !checkoutOrder ||
            checkoutOrder.payment_status === 'paid' ||
            !paypal.enabled
        ) {
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

            const existingScript = document.getElementById(
                PAYPAL_SCRIPT_ID,
            ) as HTMLScriptElement | null;

            if (existingScript) {
                await new Promise<void>((resolve, reject) => {
                    if (window.paypal) {
                        resolve();

                        return;
                    }

                    existingScript.addEventListener('load', () => resolve(), {
                        once: true,
                    });
                    existingScript.addEventListener(
                        'error',
                        () => reject(new Error('Unable to load PayPal SDK.')),
                        { once: true },
                    );
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
                script.onerror = () =>
                    reject(new Error('Unable to load PayPal SDK.'));
                document.head.appendChild(script);
            });
        };

        requestJson<{ id: string }>(
            `/buyer/orders/${checkoutOrder.id}/paypal/order`,
        )
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
                            throw new Error(
                                'PayPal did not return an order ID.',
                            );
                        }

                        try {
                            await requestJson(
                                `/buyer/orders/${checkoutOrder.id}/paypal/capture`,
                                {
                                    order_id: data.orderID,
                                },
                            );
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : 'PayPal capture failed.';

                            setCheckoutError(message);

                            throw error;
                        }

                        setCheckoutOrder(null);
                        setCheckoutPaypalOrderId(null);
                        router.reload({ only: ['orders'] });
                    },
                    onError: (error) => {
                        setCheckoutError(
                            error.message ||
                                'PayPal checkout failed unexpectedly.',
                        );
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
    }, [
        checkoutOrder,
        paypal.client_id,
        paypal.currency,
        paypal.enabled,
        paypalContainerElement,
    ]);

    const handlePaypalContainerRef = useCallback(
        (node: HTMLDivElement | null) => {
            paypalContainerRef.current = node;
            setPaypalContainerElement(node);
        },
        [],
    );

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
        router.post(
            `/buyer/orders/${order.id}/complete`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedOrder(null);
                },
            },
        );
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

    const submitDispute = (event: React.FormEvent) => {
        event.preventDefault();

        if (!disputeTarget) {
            return;
        }

        disputeForm.post(`/orders/${disputeTarget.id}/disputes`, {
            preserveScroll: true,
            onSuccess: () => {
                setDisputeTarget(null);
                setSelectedOrder(null);
                disputeForm.reset();
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
                                placeholder="Search by order ID, seller, or gig"
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
                        title="No orders yet"
                        description="Browse the catalog, pick a package, and your first buyer order will show up here."
                        action={{ label: 'Explore gigs', onClick: () => { window.location.href = '/buyer/gigs'; } }}
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
                                            Seller
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Requirements
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Delivery
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Payment
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
                                                            'Custom'}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <Badge variant="outline">
                                                            {order.package
                                                                ?.tier ??
                                                                'package'}
                                                        </Badge>
                                                        <Badge
                                                            variant={
                                                                order.status ===
                                                                'delivered'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {order.status}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="font-medium">
                                                        {order.seller?.name ??
                                                            'Seller'}
                                                    </p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        {order.seller?.email ??
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
                                                        <span>
                                                            Qty {order.quantity}
                                                        </span>
                                                        <span>
                                                            Unit USD{' '}
                                                            {order.unit_price}
                                                        </span>
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
                                                        {
                                                            order.deliveries
                                                                .length
                                                        }{' '}
                                                        file(s)
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                        {shortDate(
                                                            order.delivered_at,
                                                        )}
                                                    </p>
                                                    <div className="mt-1">
                                                        <OrderDueDate dueAt={order.due_at} status={order.status} />
                                                    </div>
                                                    <p className="mt-1 text-muted-foreground">
                                                        {order.package
                                                            ?.delivery_days ??
                                                            0}{' '}
                                                        days •{' '}
                                                        {order.package
                                                            ?.revision_count ??
                                                            0}{' '}
                                                        revisions
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-2">
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
                                                        <span className="text-muted-foreground">
                                                            {shortDate(
                                                                order.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 font-medium">
                                                    USD {order.price}
                                                    {Number(
                                                        order.discount_amount,
                                                    ) > 0 && (
                                                        <p className="mt-1 text-xs font-normal text-emerald-600">
                                                            Saved USD{' '}
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
                                                        {order.seller && order.payment_status !== 'pending' && order.status !== 'cancelled' && order.payment_status !== 'released' && (
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
                                                        {order.payment_status ===
                                                            'pending' && (
                                                            <ActionIconButton
                                                                label="Pay"
                                                                onClick={() =>
                                                                    openCheckout(
                                                                        order,
                                                                    )
                                                                }
                                                                disabled={
                                                                    !paypal.enabled
                                                                }
                                                            >
                                                                <CreditCard className="size-4" />
                                                            </ActionIconButton>
                                                        )}
                                                        {order.status ===
                                                            'delivered' &&
                                                            order.payment_status ===
                                                                'paid' &&
                                                            order.remaining_revisions >
                                                                0 && (
                                                                <ActionIconButton
                                                                    label="Revision"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setRevisionTarget(
                                                                            order,
                                                                        )
                                                                    }
                                                                >
                                                                    <RefreshCcw className="size-4" />
                                                                </ActionIconButton>
                                                            )}
                                                        {order.status ===
                                                            'completed' &&
                                                            !order.review && (
                                                                <ActionIconButton
                                                                    label="Review"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setReviewTarget(
                                                                            order,
                                                                        )
                                                                    }
                                                                >
                                                                    <Star className="size-4" />
                                                                </ActionIconButton>
                                                            )}
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
                                                {order.seller?.name ?? 'Seller'}
                                            </p>
                                        </div>
                                        <p className="font-semibold">
                                            USD {order.price}
                                        </p>
                                    </div>
                                    {Number(order.discount_amount) > 0 && (
                                        <p className="mt-2 text-xs text-emerald-600">
                                            Saved USD {order.discount_amount}
                                        </p>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="outline">
                                            {order.package?.tier ?? 'package'}
                                        </Badge>
                                        <Badge
                                            variant={
                                                order.status === 'delivered'
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
                                        {order.seller && order.payment_status !== 'pending' && order.status !== 'cancelled' && order.payment_status !== 'released' && (
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
                                        {order.payment_status === 'pending' && (
                                            <ActionIconButton
                                                label="Pay"
                                                onClick={() =>
                                                    openCheckout(order)
                                                }
                                                disabled={!paypal.enabled}
                                            >
                                                <CreditCard className="size-4" />
                                            </ActionIconButton>
                                        )}
                                        {order.status === 'delivered' &&
                                            order.payment_status === 'paid' &&
                                            order.remaining_revisions > 0 && (
                                                <ActionIconButton
                                                    label="Revision"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setRevisionTarget(order)
                                                    }
                                                >
                                                    <RefreshCcw className="size-4" />
                                                </ActionIconButton>
                                            )}
                                        {order.status === 'completed' &&
                                            !order.review && (
                                                <ActionIconButton
                                                    label="Review"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setReviewTarget(order)
                                                    }
                                                >
                                                    <Star className="size-4" />
                                                </ActionIconButton>
                                            )}
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
                            Full order details, your brief, delivery files, revision history, and actions.
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
                                        <span className="text-muted-foreground">Revisions left</span>
                                        <span className="font-medium">{selectedOrder.remaining_revisions} / {selectedOrder.package?.revision_count ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant={selectedOrder.status === 'delivered' ? 'default' : 'secondary'}>{selectedOrder.status}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payment</span>
                                        <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>{selectedOrder.payment_status}</Badge>
                                    </div>
                                </div>

                                {/* Pricing + seller */}
                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm space-y-2">
                                    <p className="font-semibold text-base mb-3">Seller & pricing</p>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Seller</span>
                                        <span className="font-medium">{selectedOrder.seller?.name ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Email</span>
                                        <span className="font-medium">{selectedOrder.seller?.email ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Unit price</span>
                                        <span className="font-medium">USD {selectedOrder.unit_price}</span>
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

                            {/* ── Your brief ── */}
                            <div className="rounded-2xl border border-border/70 bg-card p-4 text-sm">
                                <p className="font-semibold mb-2">Your requirements</p>
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
                            <div className="flex flex-wrap gap-2">
                                {selectedOrder.payment_status === 'pending' && (
                                    <Button size="sm" onClick={() => { setSelectedOrder(null); openCheckout(selectedOrder); }}
                                        disabled={!paypal.enabled}>
                                        Pay with PayPal
                                    </Button>
                                )}
                                {selectedOrder.status === 'delivered' && selectedOrder.payment_status === 'paid' && (
                                    <Button size="sm" onClick={() => { setSelectedOrder(null); completeOrder(selectedOrder); }}>
                                        Mark complete
                                    </Button>
                                )}
                                {selectedOrder.status === 'delivered' && selectedOrder.payment_status === 'paid' && selectedOrder.remaining_revisions > 0 && (
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setRevisionTarget(selectedOrder); }}>
                                        <RefreshCcw className="mr-1.5 size-4" /> Request revision
                                    </Button>
                                )}
                                {selectedOrder.status === 'completed' && !selectedOrder.review && (
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setReviewTarget(selectedOrder); }}>
                                        <Star className="mr-1.5 size-4" /> Leave review
                                    </Button>
                                )}
                                {selectedOrder.seller && selectedOrder.payment_status !== 'pending' && selectedOrder.status !== 'cancelled' && selectedOrder.payment_status !== 'released' && (
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setMessageOrder(selectedOrder); }}>
                                        <MessageCircle className="mr-1.5 size-4" /> Message seller
                                    </Button>
                                )}
                                {['pending', 'active'].includes(selectedOrder.status) && selectedOrder.payment_status !== 'pending' && (
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(null); setCancelTarget(selectedOrder); }}>
                                        Cancel order
                                    </Button>
                                )}
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

                            {/* ── Delivered files ── */}
                            <div className="rounded-2xl border border-border/70 bg-card p-4">
                                <p className="font-semibold mb-3">Delivered files ({selectedOrder.deliveries.length})</p>
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

                            {/* ── Your review ── */}
                            <div className="rounded-2xl border border-border/70 bg-card p-4 text-sm">
                                <p className="font-semibold mb-2">Your review</p>
                                {!selectedOrder.review ? (
                                    <p className="text-muted-foreground">
                                        {selectedOrder.status === 'completed'
                                            ? 'Order complete — you can leave a review above.'
                                            : 'You can leave a review after the order is completed.'}
                                    </p>
                                ) : (
                                    <div className="rounded-xl border border-border/70 p-3">
                                        <div className="flex items-center gap-1.5 font-medium text-amber-600">
                                            <Star className="size-4 fill-current" />
                                            {selectedOrder.review.rating.toFixed(1)} out of 5
                                        </div>
                                        <p className="mt-2 text-muted-foreground">{selectedOrder.review.comment}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">Submitted {formatDate(selectedOrder.review.created_at)}</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Revision history ── */}
                            {selectedOrder.revisions.length > 0 && (
                                <div className="rounded-2xl border border-border/70 bg-card p-4">
                                    <p className="font-semibold mb-3">Revision history ({selectedOrder.revisions.length})</p>
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

                            {/* ── Cancellation trail ── */}
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
                recipientName={messageOrder?.seller?.name ?? null}
            />

            <Dialog
                open={Boolean(revisionTarget)}
                onOpenChange={(open) => !open && setRevisionTarget(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Request revision</DialogTitle>
                        <DialogDescription>
                            Tell the seller exactly what needs to be updated in
                            the delivered work.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitRevision} className="space-y-4">
                        <div className="grid gap-2">
                            <label
                                htmlFor="revision_note"
                                className="text-sm font-medium"
                            >
                                Revision note <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                id="revision_note"
                                rows={5}
                                value={revisionForm.data.revision_note}
                                onChange={(event) =>
                                    revisionForm.setData(
                                        'revision_note',
                                        event.target.value,
                                    )
                                }
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Describe what should change in the delivery."
                                required
                            />
                            <InputError
                                message={revisionForm.errors.revision_note}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={revisionForm.processing}
                        >
                            {revisionForm.processing
                                ? 'Submitting...'
                                : 'Submit revision request'}
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
                            Add a reason so the cancellation is recorded in the
                            order history.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCancellation} className="space-y-4">
                        <div className="grid gap-2">
                            <label
                                htmlFor="cancellation_reason"
                                className="text-sm font-medium"
                            >
                                Reason <span className="text-destructive">*</span>
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
                                placeholder="Explain why you want to cancel this order."
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
                open={Boolean(reviewTarget)}
                onOpenChange={(open) => !open && setReviewTarget(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Leave a review</DialogTitle>
                        <DialogDescription>
                            Rate the completed order and share a short comment
                            for future buyers.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitReview} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">
                                Rating <span className="text-destructive">*</span>
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => {
                                    const active =
                                        reviewForm.data.rating ===
                                        String(rating);

                                    return (
                                        <Button
                                            key={rating}
                                            type="button"
                                            variant={
                                                active ? 'default' : 'outline'
                                            }
                                            onClick={() =>
                                                reviewForm.setData(
                                                    'rating',
                                                    String(rating),
                                                )
                                            }
                                            className="justify-center"
                                        >
                                            <Star
                                                className={`mr-1 size-4 ${active ? 'fill-current' : ''}`}
                                            />
                                            {rating}
                                        </Button>
                                    );
                                })}
                            </div>
                            <InputError message={reviewForm.errors.rating} />
                        </div>

                        <div className="grid gap-2">
                            <label
                                htmlFor="comment"
                                className="text-sm font-medium"
                            >
                                Comment <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                id="comment"
                                rows={5}
                                value={reviewForm.data.comment}
                                onChange={(event) =>
                                    reviewForm.setData(
                                        'comment',
                                        event.target.value,
                                    )
                                }
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                                placeholder="Share what went well and what future buyers should know."
                                required
                            />
                            <InputError message={reviewForm.errors.comment} />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={reviewForm.processing}
                        >
                            {reviewForm.processing
                                ? 'Submitting...'
                                : 'Submit review'}
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
                            {checkoutOrder
                                ? `Pay for order #${checkoutOrder.id}`
                                : 'Pay for order'}
                        </DialogTitle>
                        <DialogDescription>
                            Complete PayPal checkout to activate this buyer
                            order.
                        </DialogDescription>
                    </DialogHeader>

                    {checkoutOrder && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Gig</span>
                                    <span className="font-medium">
                                        {checkoutOrder.gig_title}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Package</span>
                                    <span className="font-medium">
                                        {checkoutOrder.package?.title}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Total</span>
                                    <span className="font-medium">
                                        {paypal.currency} {checkoutOrder.price}
                                    </span>
                                </div>
                                {Number(checkoutOrder.discount_amount) > 0 && (
                                    <div className="mt-2 flex items-center justify-between text-sm text-emerald-600">
                                        <span>Discount</span>
                                        <span className="font-medium">
                                            -{paypal.currency}{' '}
                                            {checkoutOrder.discount_amount}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {checkoutError && (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                    {checkoutError}
                                </div>
                            )}

                            {!paypal.enabled &&
                                paypal.message &&
                                !checkoutError && (
                                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                        {paypal.message}
                                    </div>
                                )}

                            {isLoadingButtons && (
                                <p className="text-sm text-muted-foreground">
                                    Loading PayPal checkout…
                                </p>
                            )}

                            {!isLoadingButtons && checkoutPaypalOrderId && (
                                <p className="text-xs text-muted-foreground">
                                    PayPal order ready: {checkoutPaypalOrderId}
                                </p>
                            )}

                            <div ref={handlePaypalContainerRef} />

                            {refund_policy && (
                                <div className="flex gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                                    <span className="mt-0.5 shrink-0">🛡️</span>
                                    <p className="whitespace-pre-wrap leading-relaxed">{refund_policy}</p>
                                </div>
                            )}
                        </div>
                    )}
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
                                Reason <span className="text-destructive">*</span>
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

BuyerOrdersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Orders',
            href: '/buyer/orders',
        },
    ] satisfies BreadcrumbItem[],
};
