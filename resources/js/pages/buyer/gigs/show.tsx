import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgePercent,
    CalendarClock,
    Clock3,
    Eye,
    FileText,
    Layers3,
    Link2,
    MessageSquareQuote,
    Palette,
    ShoppingCart,
    Star,
    User,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import SellerLevelBadge from '@/components/seller-level-badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { SellerLevelBadgeData } from '@/components/seller-level-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BreadcrumbItem } from '@/types';

type GigPackage = {
    id: number;
    tier: string;
    title: string;
    description: string;
    price: string;
    delivery_days: number;
    revision_count: number;
};

type GigDetail = {
    id: number;
    title: string;
    description: string;
    seller_id: number | null;
    seller_name: string | null;
    seller_is_available: boolean;
    seller_email: string | null;
    seller_avatar: string | null;
    seller_level: SellerLevelBadgeData;
    seller_member_since: string | null;
    seller_completed_orders: number;
    seller_review_count: number;
    seller_average_rating: number;
    category_name: string | null;
    subcategory_name: string | null;
    tags: string[];
    gallery: string[];
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
    views_count: number;
    packages: GigPackage[];
    reviews: {
        id: number;
        rating: number;
        comment: string;
        buyer_name: string | null;
        created_at: string | null;
    }[];
};

type RecommendedGig = {
    id: number;
    title: string;
    description: string;
    seller_id: number | null;
    seller_name: string | null;
    seller_is_available: boolean;
    category_name: string | null;
    subcategory_name: string | null;
    tags: string[];
    cover_image_url: string | null;
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
};

type CouponOption = {
    id: number;
    code: string;
    description: string | null;
    discount_type: 'fixed' | 'percentage';
    discount_value: string;
    minimum_order_amount: string | null;
    usage_limit: number | null;
    used_count: number;
    starts_at: string | null;
    expires_at: string | null;
};

type PaypalConfig = {
    mode: 'sandbox' | 'live';
    client_id: string;
    currency: string;
    enabled: boolean;
    message: string | null;
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

function getCsrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
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
        throw new Error(message as string);
    }
    return payload as T;
}

type Props = {
    gig: GigDetail;
    similar_gigs: RecommendedGig[];
    people_also_bought: RecommendedGig[];
    coupons: CouponOption[];
    paypal: PaypalConfig;
};

type OrderFormData = {
    package_id: string;
    quantity: string;
    requirements: string;
    brief_file: File | null;
    reference_link: string;
    style_notes: string;
    coupon_code: string;
    billing_name: string;
    billing_email: string;
};

export default function BuyerGigShow({
    gig,
    coupons,
    similar_gigs,
    people_also_bought,
    paypal,
}: Props) {
    const similarGigs = similar_gigs;
    const peopleAlsoBought = people_also_bought;
    const { auth } = usePage<{
        auth: { user: { name: string; email: string } | null };
    }>().props;
    const [selectedPackageId, setSelectedPackageId] = useState<string>(
        String(gig.packages[0]?.id ?? ''),
    );
    const selectedPackage = useMemo(
        () =>
            gig.packages.find(
                (item) => String(item.id) === selectedPackageId,
            ) ?? gig.packages[0],
        [gig.packages, selectedPackageId],
    );
    const form = useForm<OrderFormData>({
        package_id: selectedPackageId,
        quantity: '1',
        requirements: '',
        brief_file: null,
        reference_link: '',
        style_notes: '',
        coupon_code: '',
        billing_name: auth.user?.name ?? '',
        billing_email: auth.user?.email ?? '',
    });
    const quantity = Math.max(
        1,
        Number.parseInt(form.data.quantity ?? '1', 10) || 1,
    );
    const subtotal = selectedPackage
        ? (Number.parseFloat(selectedPackage.price) * quantity).toFixed(2)
        : '0.00';
    const subtotalNumber = Number.parseFloat(subtotal);
    const selectedCoupon = coupons.find(
        (coupon) => coupon.code === form.data.coupon_code,
    );
    const couponOptions = useMemo(
        () =>
            coupons.map((coupon) => {
                const minimumOrderAmount = Number.parseFloat(
                    coupon.minimum_order_amount ?? '0',
                );
                const estimatedDiscount =
                    coupon.discount_type === 'percentage'
                        ? Number(
                              (
                                  subtotalNumber *
                                  (Number.parseFloat(coupon.discount_value) /
                                      100)
                              ).toFixed(2),
                          )
                        : Number.parseFloat(coupon.discount_value);
                const boundedDiscount = Math.min(
                    subtotalNumber,
                    Math.max(0, estimatedDiscount),
                );
                const isEligible =
                    minimumOrderAmount <= 0 ||
                    subtotalNumber >= minimumOrderAmount;

                return {
                    ...coupon,
                    minimumOrderAmount,
                    estimatedDiscount: boundedDiscount.toFixed(2),
                    isEligible,
                };
            }),
        [coupons, subtotalNumber],
    );
    const selectedCouponDiscount =
        selectedCoupon &&
        couponOptions.find((coupon) => coupon.id === selectedCoupon.id)
            ?.isEligible
            ? (couponOptions.find((coupon) => coupon.id === selectedCoupon.id)
                  ?.estimatedDiscount ?? '0.00')
            : '0.00';
    const estimatedTotal = Math.max(
        0,
        Number(
            (
                subtotalNumber - Number.parseFloat(selectedCouponDiscount)
            ).toFixed(2),
        ),
    ).toFixed(2);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
    const [formSnapshot, setFormSnapshot] = useState<{ data: OrderFormData; briefFile: File | null } | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isLoadingButtons, setIsLoadingButtons] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement | null>(null);
    const [paypalContainerElement, setPaypalContainerElement] = useState<HTMLDivElement | null>(null);

    const handlePaypalContainerRef = useCallback((node: HTMLDivElement | null) => {
        paypalContainerRef.current = node;
        setPaypalContainerElement(node);
    }, []);

    useEffect(() => {
        if (!checkoutOpen || !paypal.enabled || !paypalOrderId || !formSnapshot) return;

        let cancelled = false;
        const paypalContainer = paypalContainerRef.current;
        if (!paypalContainer) return;
        paypalContainer.innerHTML = '';

        const loadScript = async () => {
            if (window.paypal) return;
            const existing = document.getElementById(PAYPAL_SCRIPT_ID) as HTMLScriptElement | null;
            if (existing) {
                await new Promise<void>((resolve, reject) => {
                    if (window.paypal) { resolve(); return; }
                    existing.addEventListener('load', () => resolve(), { once: true });
                    existing.addEventListener('error', () => reject(new Error('Unable to load PayPal SDK.')), { once: true });
                });
                return;
            }
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.id = PAYPAL_SCRIPT_ID;
                script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypal.client_id)}&currency=${encodeURIComponent(paypal.currency)}&intent=capture`;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Unable to load PayPal SDK.'));
                document.head.appendChild(script);
            });
        };

        const snapshot = formSnapshot;
        const ppOrderId = paypalOrderId;

        loadScript()
            .then(async () => {
                if (cancelled || !window.paypal || !paypalContainer) return;

                const buttons = window.paypal.Buttons({
                    createOrder: async () => ppOrderId,
                    onApprove: async (data) => {
                        if (!data.orderID) throw new Error('PayPal did not return an order ID.');

                        const fd = new FormData();
                        fd.append('package_id', snapshot.data.package_id);
                        fd.append('quantity', snapshot.data.quantity);
                        fd.append('requirements', snapshot.data.requirements);
                        fd.append('reference_link', snapshot.data.reference_link);
                        fd.append('style_notes', snapshot.data.style_notes);
                        fd.append('coupon_code', snapshot.data.coupon_code);
                        fd.append('billing_name', snapshot.data.billing_name);
                        fd.append('billing_email', snapshot.data.billing_email);
                        fd.append('paypal_order_id', data.orderID);
                        if (snapshot.briefFile) fd.append('brief_file', snapshot.briefFile);

                        const csrf = getCsrfToken();
                        const res = await fetch(`/buyer/gigs/${gig.id}/orders`, {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {
                                Accept: 'application/json',
                                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                            },
                            body: fd,
                        });
                        const payload = await res.json().catch(() => ({}));
                        if (!res.ok) {
                            throw new Error(
                                payload?.errors
                                    ? (Object.values(payload.errors) as string[][]).flat().join(' ')
                                    : payload?.message || 'Failed to save order.',
                            );
                        }
                        window.location.href = '/buyer/orders';
                    },
                    onError: (error) => {
                        setCheckoutError(error.message || 'PayPal checkout failed unexpectedly.');
                    },
                });
                await buttons.render(paypalContainer);
            })
            .catch((error: Error) => {
                if (!cancelled) setCheckoutError(error.message);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingButtons(false);
            });

        return () => { cancelled = true; };
    }, [checkoutOpen, paypalOrderId, formSnapshot, paypal.client_id, paypal.currency, paypal.enabled, paypalContainerElement, gig.id]);

    const submitOrder = (event: React.FormEvent) => {
        event.preventDefault();

        const csrf = getCsrfToken();
        form.setError({});
        setIsSubmitting(true);

        // Step 1: /prepare — validates + creates PayPal order, NO DB write
        const prepareData = new FormData();
        prepareData.append('package_id', selectedPackageId);
        prepareData.append('quantity', form.data.quantity);
        prepareData.append('coupon_code', form.data.coupon_code);
        prepareData.append('billing_name', form.data.billing_name);
        prepareData.append('billing_email', form.data.billing_email);

        fetch(`/buyer/gigs/${gig.id}/paypal/prepare`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
            },
            body: prepareData,
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (payload?.errors) form.setError(payload.errors);
                    else form.setError({ requirements: payload?.message || 'Failed to prepare payment.' });
                    return;
                }
                const ppOrderId = payload?.paypal_order_id as string | undefined;
                if (ppOrderId) {
                    setFormSnapshot({ data: { ...form.data, package_id: selectedPackageId }, briefFile: form.data.brief_file });
                    setCheckoutError(null);
                    setIsLoadingButtons(true);
                    setPaypalOrderId(ppOrderId);
                    setCheckoutOpen(true);
                }
            })
            .catch(() => {
                form.setError({ requirements: 'Network error. Please try again.' });
            })
            .finally(() => setIsSubmitting(false));
    };

    return (
        <>
            <Head title={gig.title} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4">
                    <Link
                        href="/buyer/gigs"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Back to gigs
                    </Link>
                    <Heading title={gig.title} />
                    <p className="text-sm text-muted-foreground">
                        in {gig.category_name ?? 'General'} /{' '}
                        {gig.subcategory_name ?? 'General'}
                    </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                    <section className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            {gig.gallery.length > 0 ? (
                                gig.gallery.map((image) => (
                                    <div
                                        key={image}
                                        className="overflow-hidden rounded-3xl border border-border/70 bg-card"
                                    >
                                        <img
                                            src={image}
                                            alt={gig.title}
                                            className="h-72 w-full object-cover"
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card text-sm text-muted-foreground">
                                    No preview images uploaded
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex items-center gap-2">
                                <FileText className="size-4 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">
                                    Service overview
                                </h2>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                                    <Star className="size-4 fill-current" />
                                    <span className="font-medium">
                                        {gig.review_count > 0
                                            ? gig.rating.toFixed(1)
                                            : 'New service'}
                                    </span>
                                </div>
                                <span className="text-muted-foreground">
                                    {gig.review_count > 0
                                        ? `${gig.review_count} buyer review${gig.review_count === 1 ? '' : 's'}`
                                        : 'No buyer reviews yet'}
                                </span>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
                                    <Eye className="size-4" />
                                    <span className="font-medium">
                                        {gig.views_count.toLocaleString()} views
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {gig.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <p className="mt-5 text-sm leading-7 whitespace-pre-line text-muted-foreground">
                                {gig.description}
                            </p>
                        </div>

                        <div className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex items-center gap-2">
                                <Layers3 className="size-4 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">
                                    Compare packages
                                </h2>
                            </div>

                            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                {gig.packages.map((item) => {
                                    const active =
                                        item.id === selectedPackage?.id;

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPackageId(
                                                    String(item.id),
                                                );
                                                form.setData(
                                                    'package_id',
                                                    String(item.id),
                                                );
                                            }}
                                            className={`rounded-3xl border p-5 text-left transition ${
                                                active
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : 'border-border/70 bg-background'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
                                                    {item.tier}
                                                </p>
                                                {active && (
                                                    <Badge>Selected</Badge>
                                                )}
                                            </div>
                                            <p className="mt-3 text-lg font-semibold">
                                                {item.title}
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {item.description}
                                            </p>
                                            <p className="mt-5 text-3xl font-semibold">
                                                <span className="text-sm text-muted-foreground">
                                                    USD
                                                </span>{' '}
                                                {item.price}
                                            </p>
                                            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                                                <p>
                                                    {item.delivery_days} day
                                                    delivery
                                                </p>
                                                <p>
                                                    {item.revision_count}{' '}
                                                    revisions
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex items-center gap-2">
                                <MessageSquareQuote className="size-4 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">
                                    Buyer reviews
                                </h2>
                            </div>

                            {gig.reviews.length === 0 ? (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    This service has not received a buyer review
                                    yet.
                                </p>
                            ) : (
                                <div className="mt-5 space-y-4">
                                    {gig.reviews.map((review) => (
                                        <div
                                            key={review.id}
                                            className="rounded-2xl border border-border/70 p-4"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">
                                                        {review.buyer_name ??
                                                            'Buyer'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {review.created_at
                                                            ? new Date(
                                                                  review.created_at,
                                                              ).toLocaleDateString()
                                                            : 'Recently'}
                                                    </p>
                                                </div>
                                                <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                                                    <Star className="size-4 fill-current" />
                                                    {review.rating.toFixed(1)}
                                                </div>
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                                {review.comment}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex items-center gap-2">
                                <Layers3 className="size-4 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">
                                    Similar gigs
                                </h2>
                            </div>
                            {similarGigs.length === 0 ? (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    We will show similar gigs here once more
                                    matching services are available.
                                </p>
                            ) : (
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    {similarGigs.map((item) => (
                                        <Link
                                            key={`similar-${item.id}`}
                                            href={`/buyer/gigs/${item.id}`}
                                            className="overflow-hidden rounded-2xl border border-border/70 bg-background transition hover:border-primary/40"
                                        >
                                            <div className="aspect-[16/9] bg-muted">
                                                {item.cover_image_url ? (
                                                    <img
                                                        src={
                                                            item.cover_image_url
                                                        }
                                                        alt={item.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                        No preview image
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2 p-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="secondary">
                                                        {item.category_name ??
                                                            'General'}
                                                    </Badge>
                                                    <span className="text-sm font-semibold">
                                                        USD{' '}
                                                        {item.starting_price}
                                                    </span>
                                                </div>
                                                <p className="line-clamp-2 font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    by{' '}
                                                    {item.seller_name ??
                                                        'Seller'}{' '}
                                                    • {item.delivery_days} days
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="size-4 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">
                                    People also bought
                                </h2>
                            </div>
                            {peopleAlsoBought.length === 0 ? (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    We will show related buyer picks here as
                                    order history grows.
                                </p>
                            ) : (
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    {peopleAlsoBought.map((item) => (
                                        <Link
                                            key={`also-${item.id}`}
                                            href={`/buyer/gigs/${item.id}`}
                                            className="overflow-hidden rounded-2xl border border-border/70 bg-background transition hover:border-primary/40"
                                        >
                                            <div className="aspect-[16/9] bg-muted">
                                                {item.cover_image_url ? (
                                                    <img
                                                        src={
                                                            item.cover_image_url
                                                        }
                                                        alt={item.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                        No preview image
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2 p-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="secondary">
                                                        {item.subcategory_name ??
                                                            item.category_name ??
                                                            'General'}
                                                    </Badge>
                                                    <span className="text-sm font-semibold">
                                                        USD{' '}
                                                        {item.starting_price}
                                                    </span>
                                                </div>
                                                <p className="line-clamp-2 font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.review_count > 0
                                                        ? `${item.rating.toFixed(1)} stars (${item.review_count})`
                                                        : 'New service'}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="space-y-6">
                        {/* Seller card */}
                        {gig.seller_id && (
                            <Link
                                href={`/sellers/${gig.seller_id}`}
                                className="group flex items-center gap-4 rounded-3xl border border-border/70 bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
                            >
                                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-lg font-bold text-muted-foreground">
                                    {gig.seller_avatar ? (
                                        <img
                                            src={gig.seller_avatar}
                                            alt={gig.seller_name ?? ''}
                                            className="size-14 rounded-2xl object-cover"
                                        />
                                    ) : (
                                        <User className="size-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">
                                        {gig.seller_name ?? 'Seller'}
                                    </p>
                                    {!gig.seller_is_available && (
                                        <Badge
                                            variant="destructive"
                                            className="mt-1"
                                        >
                                            Unavailable
                                        </Badge>
                                    )}
                                    <SellerLevelBadge
                                        level={gig.seller_level}
                                        className="mt-1"
                                    />
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {gig.seller_average_rating > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Star className="size-3 fill-amber-400 text-amber-400" />
                                                {gig.seller_average_rating.toFixed(
                                                    1,
                                                )}
                                                <span>
                                                    ({gig.seller_review_count})
                                                </span>
                                            </span>
                                        )}
                                        {gig.seller_completed_orders > 0 && (
                                            <span>
                                                {gig.seller_completed_orders}{' '}
                                                orders done
                                            </span>
                                        )}
                                        {gig.seller_member_since && (
                                            <span>
                                                Since {gig.seller_member_since}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs font-medium text-primary underline-offset-4 group-hover:underline">
                                    View profile →
                                </span>
                            </Link>
                        )}

                        <section className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="size-4" />
                                <h2 className="text-lg font-semibold">
                                    Place order
                                </h2>
                            </div>

                            <form
                                onSubmit={submitOrder}
                                className="mt-5 space-y-4"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="quantity">Quantity <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        max="20"
                                        required
                                        value={form.data.quantity}
                                        onChange={(event) =>
                                            form.setData(
                                                'quantity',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.quantity}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="requirements">
                                        Requirements <span className="text-destructive">*</span>
                                    </Label>
                                    <textarea
                                        id="requirements"
                                        rows={5}
                                        required
                                        value={form.data.requirements}
                                        onChange={(event) =>
                                            form.setData(
                                                'requirements',
                                                event.target.value,
                                            )
                                        }
                                        className="min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        placeholder="Share your brief, goals, dimensions, references, and anything the seller should know."
                                    />
                                    <InputError
                                        message={form.errors.requirements}
                                    />
                                </div>

                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="reference_link">
                                            Reference link <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                        </Label>
                                        <div className="relative">
                                            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="reference_link"
                                                value={form.data.reference_link}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'reference_link',
                                                        event.target.value,
                                                    )
                                                }
                                                className="pl-9"
                                                placeholder="https://example.com/reference"
                                            />
                                        </div>
                                        <InputError
                                            message={form.errors.reference_link}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="style_notes">
                                        Style notes <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                    </Label>
                                    <div className="relative">
                                        <Palette className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                                        <textarea
                                            id="style_notes"
                                            rows={4}
                                            value={form.data.style_notes}
                                            onChange={(event) =>
                                                form.setData(
                                                    'style_notes',
                                                    event.target.value,
                                                )
                                            }
                                            className="min-h-24 w-full rounded-md border border-input bg-transparent py-2 pr-3 pl-9 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            placeholder="Preferred tone, color direction, examples to avoid, or anything style-specific."
                                        />
                                    </div>
                                    <InputError
                                        message={form.errors.style_notes}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="brief_file">
                                        Brief file <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                    </Label>
                                    <div className="relative">
                                        <FileText className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="brief_file"
                                            type="file"
                                            className="pl-9"
                                            onChange={(event) =>
                                                form.setData(
                                                    'brief_file',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </div>
                                    <InputError
                                        message={form.errors.brief_file}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-3 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="coupon_select">
                                                <BadgePercent className="mr-1.5 inline size-4 text-muted-foreground" />
                                                Coupon
                                            </Label>
                                            {form.data.coupon_code && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        form.setData(
                                                            'coupon_code',
                                                            '',
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="size-3" />
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        {couponOptions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No coupons available for your
                                                account.
                                            </p>
                                        ) : (
                                            <Select
                                                value={
                                                    form.data.coupon_code ||
                                                    '__none__'
                                                }
                                                onValueChange={(v) =>
                                                    form.setData(
                                                        'coupon_code',
                                                        v === '__none__'
                                                            ? ''
                                                            : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="coupon_select"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Select a coupon..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        No coupon
                                                    </SelectItem>
                                                    {couponOptions.map(
                                                        (coupon) => (
                                                            <SelectItem
                                                                key={coupon.id}
                                                                value={
                                                                    coupon.code
                                                                }
                                                                disabled={
                                                                    !coupon.isEligible
                                                                }
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <span className="font-medium">
                                                                        {
                                                                            coupon.code
                                                                        }
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        —
                                                                    </span>
                                                                    <span className="text-emerald-600">
                                                                        {coupon.discount_type ===
                                                                        'percentage'
                                                                            ? `${coupon.discount_value}% off`
                                                                            : `USD ${coupon.discount_value} off`}
                                                                    </span>
                                                                    {!coupon.isEligible && (
                                                                        <span className="text-xs text-amber-600">
                                                                            (min
                                                                            USD{' '}
                                                                            {coupon.minimumOrderAmount.toFixed(
                                                                                2,
                                                                            )}
                                                                            )
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {/* Selected coupon detail pill */}
                                        {form.data.coupon_code &&
                                            (() => {
                                                const c = couponOptions.find(
                                                    (o) =>
                                                        o.code ===
                                                        form.data.coupon_code,
                                                );

                                                if (!c) {
                                                    return null;
                                                }

                                                return (
                                                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                                        <BadgePercent className="size-3.5" />
                                                        <span className="font-medium">
                                                            {c.code}
                                                        </span>
                                                        {c.description && (
                                                            <span>
                                                                —{' '}
                                                                {c.description}
                                                            </span>
                                                        )}
                                                        <span className="ml-auto font-semibold">
                                                            Est. save USD{' '}
                                                            {
                                                                c.estimatedDiscount
                                                            }
                                                        </span>
                                                        {c.expires_at && (
                                                            <span className="flex items-center gap-1 text-emerald-700">
                                                                <CalendarClock className="size-3" />
                                                                Expires{' '}
                                                                {new Date(
                                                                    c.expires_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                        <InputError
                                            message={form.errors.coupon_code}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="billing_name">
                                            Billing name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="billing_name"
                                            required
                                            value={form.data.billing_name}
                                            onChange={(event) =>
                                                form.setData(
                                                    'billing_name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Your full name"
                                        />
                                        <InputError
                                            message={form.errors.billing_name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="billing_email">
                                            Billing email <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="billing_email"
                                            type="email"
                                            required
                                            value={form.data.billing_email}
                                            onChange={(event) =>
                                                form.setData(
                                                    'billing_email',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="you@example.com"
                                        />
                                        <InputError
                                            message={form.errors.billing_email}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Selected package
                                        </span>
                                        <span className="font-medium">
                                            {selectedPackage?.title ??
                                                'Not selected'}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Subtotal
                                        </span>
                                        <span className="font-medium">
                                            USD {subtotal}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Delivery
                                        </span>
                                        <span className="flex items-center gap-1 font-medium">
                                            <Clock3 className="size-4" />
                                            {selectedPackage?.delivery_days ??
                                                0}{' '}
                                            days
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 text-base font-semibold">
                                        <span>Coupon</span>
                                        <span>
                                            {form.data.coupon_code || 'None'}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Estimated discount
                                        </span>
                                        <span className="font-medium text-emerald-600">
                                            -USD {selectedCouponDiscount}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Estimated total
                                        </span>
                                        <span className="font-semibold">
                                            USD {estimatedTotal}
                                        </span>
                                    </div>
                                    {selectedCoupon && (
                                        <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <CalendarClock className="size-3.5" />
                                                <span>
                                                    {selectedCoupon.expires_at
                                                        ? `Expires ${new Date(selectedCoupon.expires_at).toLocaleDateString()}`
                                                        : 'No expiry'}
                                                </span>
                                            </div>
                                            <p className="mt-2">
                                                Final coupon validation happens
                                                when the order is created,
                                                including expiry and usage
                                                limit.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting || !gig.seller_is_available}
                                >
                                    {isSubmitting
                                        ? 'Creating order...'
                                        : gig.seller_is_available
                                          ? 'Continue to payment'
                                          : 'Seller unavailable'}
                                </Button>
                                <InputError message={form.errors.requirements} />

                                <p className="text-xs text-muted-foreground">
                                    {gig.seller_is_available
                                        ? 'Your order will be created and PayPal checkout will open immediately.'
                                        : 'This seller is currently on a break and not accepting new orders.'}
                                </p>
                            </form>
                        </section>
                    </aside>
                </div>
            </div>
            <Dialog
                open={checkoutOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setCheckoutOpen(false);
                        setPaypalOrderId(null);
                        setFormSnapshot(null);
                        setCheckoutError(null);
                        setIsLoadingButtons(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Complete your payment</DialogTitle>
                        <DialogDescription>
                            Complete PayPal checkout to activate your order.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Package</span>
                                <span className="font-medium">{selectedPackage?.title}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-semibold">{paypal.currency} {estimatedTotal}</span>
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

                        <div ref={handlePaypalContainerRef} />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

BuyerGigShow.layout = {
    breadcrumbs: [
        { title: 'Explore Gigs', href: '/buyer/gigs' },
        { title: 'Gig Details', href: '#' },
    ] satisfies BreadcrumbItem[],
};

