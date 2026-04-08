import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgePercent,
    CalendarClock,
    Clock3,
    FileText,
    Layers3,
    Link2,
    MessageSquareQuote,
    Palette,
    ShoppingCart,
    Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    seller_name: string | null;
    seller_email: string | null;
    category_name: string | null;
    subcategory_name: string | null;
    tags: string[];
    gallery: string[];
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
    packages: GigPackage[];
    reviews: {
        id: number;
        rating: number;
        comment: string;
        buyer_name: string | null;
        created_at: string | null;
    }[];
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

type Props = {
    gig: GigDetail;
    coupons: CouponOption[];
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

function formatCouponDiscount(coupon: CouponOption) {
    return coupon.discount_type === 'percentage'
        ? `${coupon.discount_value}% off`
        : `USD ${coupon.discount_value} off`;
}

function formatCouponWindow(coupon: CouponOption) {
    if (!coupon.expires_at) {
        return 'No expiry';
    }

    return `Expires ${new Date(coupon.expires_at).toLocaleDateString()}`;
}

export default function BuyerGigShow({ gig, coupons }: Props) {
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
        selectedCoupon && couponOptions.find((coupon) => coupon.id === selectedCoupon.id)?.isEligible
            ? couponOptions.find((coupon) => coupon.id === selectedCoupon.id)
                  ?.estimatedDiscount ?? '0.00'
            : '0.00';
    const estimatedTotal = Math.max(
        0,
        Number((subtotalNumber - Number.parseFloat(selectedCouponDiscount)).toFixed(2)),
    ).toFixed(2);

    const submitOrder = (event: React.FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            package_id: selectedPackageId,
        }));

        form.post(`/buyer/gigs/${gig.id}/orders`, {
            forceFormData: true,
            preserveScroll: true,
        });
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
                    <Heading
                        title={gig.title}
                        description={`By ${gig.seller_name ?? 'Seller'} in ${gig.category_name ?? 'General'} / ${gig.subcategory_name ?? 'General'}`}
                    />
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
                    </section>

                    <aside className="space-y-6">
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
                                    <Label htmlFor="quantity">Quantity</Label>
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
                                        Requirements
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

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="reference_link">
                                            Reference link
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

                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Available coupons</Label>
                                        {form.data.coupon_code && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    form.setData(
                                                        'coupon_code',
                                                        '',
                                                    )
                                                }
                                            >
                                                Clear coupon
                                            </Button>
                                        )}
                                    </div>
                                    {couponOptions.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                            No active coupons are available right now.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {couponOptions.map((coupon) => {
                                                const active =
                                                    form.data.coupon_code ===
                                                    coupon.code;

                                                return (
                                                    <button
                                                        key={coupon.id}
                                                        type="button"
                                                        onClick={() =>
                                                            form.setData(
                                                                'coupon_code',
                                                                coupon.code,
                                                            )
                                                        }
                                                        className={`w-full rounded-2xl border p-4 text-left transition ${
                                                            active
                                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                                : 'border-border/70 bg-background'
                                                        }`}
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <BadgePercent className="size-4 text-muted-foreground" />
                                                                    <p className="font-semibold">
                                                                        {coupon.code}
                                                                    </p>
                                                                    {active && (
                                                                        <Badge>
                                                                            Selected
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="mt-2 text-sm text-muted-foreground">
                                                                    {coupon.description ||
                                                                        formatCouponDiscount(
                                                                            coupon,
                                                                        )}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-semibold">
                                                                    {formatCouponDiscount(
                                                                        coupon,
                                                                    )}
                                                                </p>
                                                                <p className="mt-1 text-xs text-emerald-600">
                                                                    Est. save USD{' '}
                                                                    {
                                                                        coupon.estimatedDiscount
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                            <span className="rounded-full bg-muted px-2.5 py-1">
                                                                {formatCouponWindow(
                                                                    coupon,
                                                                )}
                                                            </span>
                                                            <span className="rounded-full bg-muted px-2.5 py-1">
                                                                Min order:{' '}
                                                                {coupon.minimumOrderAmount >
                                                                0
                                                                    ? `USD ${coupon.minimumOrderAmount.toFixed(
                                                                          2,
                                                                      )}`
                                                                    : 'None'}
                                                            </span>
                                                            <span className="rounded-full bg-muted px-2.5 py-1">
                                                                Uses:{' '}
                                                                {coupon.used_count}
                                                                {coupon.usage_limit !==
                                                                null
                                                                    ? ` / ${coupon.usage_limit}`
                                                                    : '+'}
                                                            </span>
                                                        </div>
                                                        {!coupon.isEligible && (
                                                            <p className="mt-3 text-xs text-amber-700">
                                                                Increase your subtotal to at least USD{' '}
                                                                {coupon.minimumOrderAmount.toFixed(
                                                                    2,
                                                                )}{' '}
                                                                to use this coupon.
                                                            </p>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <InputError
                                        message={form.errors.coupon_code}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="style_notes">
                                        Style notes
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
                                            className="min-h-24 rounded-md border border-input bg-transparent py-2 pr-3 pl-9 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            placeholder="Preferred tone, color direction, examples to avoid, or anything style-specific."
                                        />
                                    </div>
                                    <InputError
                                        message={form.errors.style_notes}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="brief_file">
                                        Brief file
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
                                    <div className="grid gap-2">
                                        <Label htmlFor="billing_name">
                                            Billing name
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
                                            Billing email
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
                                                    {formatCouponWindow(
                                                        selectedCoupon,
                                                    )}
                                                </span>
                                            </div>
                                            <p className="mt-2">
                                                Final coupon validation happens when the order is created, including expiry and usage limit.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={form.processing}
                                >
                                    {form.processing
                                        ? 'Creating order...'
                                        : 'Create order & continue'}
                                </Button>

                                <p className="text-xs text-muted-foreground">
                                    This creates your order and sends you to the
                                    buyer orders list for PayPal checkout.
                                </p>
                            </form>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

BuyerGigShow.layout = {
    breadcrumbs: [
        {
            title: 'Explore Gigs',
            href: '/buyer/gigs',
        },
    ] satisfies BreadcrumbItem[],
};
