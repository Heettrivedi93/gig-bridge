import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    Clock3,
    ExternalLink,
    MapPin,
    Star,
} from 'lucide-react';
import { useCallback } from 'react';
import Heading from '@/components/heading';
import SellerLevelBadge from '@/components/seller-level-badge';
import type { SellerLevelBadgeData } from '@/components/seller-level-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { roleLayout } from '@/hooks/use-role-layout';

type GigCard = {
    id: number;
    title: string;
    description: string;
    category_name: string | null;
    subcategory_name: string | null;
    tags: string[];
    cover_image_url: string | null;
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
    package_count: number;
    seller_level: SellerLevelBadgeData;
};

type Review = {
    id: number;
    rating: number;
    comment: string;
    buyer_name: string | null;
    gig_title: string | null;
    created_at: string | null;
};

type Props = {
    seller: {
        id: number;
        name: string;
        bio: string | null;
        skills: string[];
        location: string | null;
        website: string | null;
        avatar: string | null;
        member_since: string | null;
        seller_level: SellerLevelBadgeData;
    };
    stats: {
        gig_count: number;
        completed_orders: number;
        review_count: number;
        average_rating: number;
    };
    gigs: GigCard[];
    recent_reviews: Review[];
};

function initials(name: string) {
    return name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function formatDate(value: string | null) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleDateString(undefined, {
        dateStyle: 'medium',
    });
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`size-3.5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                />
            ))}
        </div>
    );
}

export default function SellerShow({
    seller,
    stats,
    gigs,
    recent_reviews,
}: Props) {
    const { auth } = usePage<{ auth: { user: { roles?: string[] } | null } }>()
        .props;
    const isBuyer = auth?.user?.roles?.includes('buyer') ?? false;

    const goBack = useCallback(() => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/buyer/gigs';
        }
    }, []);

    return (
        <>
            <Head title={`${seller.name} — Seller Profile`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4">
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </button>
                    <Heading
                        title={seller.name}
                        description={
                            seller.location
                                ? `Based in ${seller.location}`
                                : 'Seller profile'
                        }
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* ── Left sidebar ── */}
                    <aside className="space-y-5">
                        {/* Profile card */}
                        <div className="rounded-3xl border border-border/70 bg-card p-6">
                            <div className="flex flex-col items-center text-center">
                                <Avatar className="size-20 rounded-2xl border border-border/70">
                                    <AvatarImage
                                        src={seller.avatar ?? undefined}
                                        alt={seller.name}
                                    />
                                    <AvatarFallback className="rounded-2xl bg-muted text-xl font-semibold">
                                        {initials(seller.name)}
                                    </AvatarFallback>
                                </Avatar>

                                <h2 className="mt-4 text-lg font-bold">
                                    {seller.name}
                                </h2>
                                <SellerLevelBadge
                                    level={seller.seller_level}
                                    className="mt-3"
                                />

                                {seller.location && (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="size-3.5" />
                                        {seller.location}
                                    </p>
                                )}

                                {stats.average_rating > 0 && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <StarRating
                                            rating={stats.average_rating}
                                        />
                                        <span className="text-sm font-medium">
                                            {stats.average_rating.toFixed(1)}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            ({stats.review_count})
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-3 border-t border-border/70 pt-5 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Member since
                                    </span>
                                    <span className="font-medium">
                                        {seller.member_since}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Active gigs
                                    </span>
                                    <span className="font-medium">
                                        {stats.gig_count}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Completed orders
                                    </span>
                                    <span className="font-medium">
                                        {stats.completed_orders}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        {seller.bio && (
                            <div className="rounded-3xl border border-border/70 bg-card p-5">
                                <p className="mb-2 font-semibold">About</p>
                                <p className="text-sm leading-6 whitespace-pre-line text-muted-foreground">
                                    {seller.bio}
                                </p>
                            </div>
                        )}

                        {/* Skills */}
                        {seller.skills.length > 0 && (
                            <div className="rounded-3xl border border-border/70 bg-card p-5">
                                <p className="mb-3 font-semibold">Skills</p>
                                <div className="flex flex-wrap gap-2">
                                    {seller.skills.map((skill) => (
                                        <Badge key={skill} variant="secondary">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Website */}
                        {seller.website && (
                            <div className="rounded-3xl border border-border/70 bg-card p-5">
                                <p className="mb-2 font-semibold">Website</p>
                                <a
                                    href={seller.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                                >
                                    <ExternalLink className="size-3.5" />
                                    {seller.website.replace(/^https?:\/\//, '')}
                                </a>
                            </div>
                        )}
                    </aside>

                    {/* ── Right: gigs + reviews ── */}
                    <div className="space-y-8">
                        {/* Gigs */}
                        <section>
                            <h2 className="mb-4 text-lg font-bold">
                                Services ({stats.gig_count})
                            </h2>

                            {gigs.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-14 text-center">
                                    <BadgeCheck className="mx-auto size-8 text-muted-foreground" />
                                    <p className="mt-3 font-medium">
                                        No active gigs yet
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        This seller hasn't published any
                                        services yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    {gigs.map((gig) =>
                                        isBuyer ? (
                                            <Link
                                                key={gig.id}
                                                href={`/buyer/gigs/${gig.id}`}
                                                className="group overflow-hidden rounded-[2rem] border border-border/70 bg-card transition hover:-translate-y-0.5 hover:border-primary/40"
                                            >
                                                <GigCardContent gig={gig} />
                                            </Link>
                                        ) : (
                                            <div
                                                key={gig.id}
                                                className="overflow-hidden rounded-[2rem] border border-border/70 bg-card"
                                            >
                                                <GigCardContent gig={gig} />
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Reviews */}
                        {recent_reviews.length > 0 && (
                            <section>
                                <div className="mb-4 flex items-center gap-3">
                                    <h2 className="text-lg font-bold">
                                        Reviews ({stats.review_count})
                                    </h2>
                                    {stats.average_rating > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <StarRating
                                                rating={stats.average_rating}
                                            />
                                            <span className="text-sm font-medium text-amber-600">
                                                {stats.average_rating.toFixed(
                                                    1,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {recent_reviews.map((review) => (
                                        <div
                                            key={review.id}
                                            className="rounded-2xl border border-border/70 bg-card p-5"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">
                                                        {review.buyer_name ??
                                                            'Buyer'}
                                                    </p>
                                                    {review.gig_title && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {review.gig_title}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                    <Star className="size-3 fill-current" />
                                                    {review.rating}
                                                </div>
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                                {review.comment}
                                            </p>
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                {formatDate(review.created_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {recent_reviews.length === 0 && stats.gig_count > 0 && (
                            <section>
                                <h2 className="mb-4 text-lg font-bold">
                                    Reviews
                                </h2>
                                <div className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-10 text-center">
                                    <BadgeCheck className="mx-auto size-8 text-muted-foreground" />
                                    <p className="mt-3 font-medium">
                                        No reviews yet
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Reviews appear after buyers complete
                                        orders.
                                    </p>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function GigCardContent({ gig }: { gig: GigCard }) {
    return (
        <>
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {gig.cover_image_url ? (
                    <img
                        src={gig.cover_image_url}
                        alt={gig.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No preview image
                    </div>
                )}
                {gig.category_name && (
                    <div className="absolute inset-x-0 top-0 p-3">
                        <Badge className="border border-white/20 bg-black/55 text-white shadow-sm backdrop-blur">
                            {gig.category_name}
                        </Badge>
                    </div>
                )}
            </div>

            <div className="p-4">
                <SellerLevelBadge level={gig.seller_level} className="mb-3" />
                <h3 className="line-clamp-2 leading-snug font-semibold">
                    {gig.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {gig.description}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3 text-xs">
                    <div>
                        <p className="tracking-wide text-muted-foreground uppercase">
                            From
                        </p>
                        <p className="mt-1 font-semibold">
                            USD {gig.starting_price}
                        </p>
                    </div>
                    <div>
                        <p className="tracking-wide text-muted-foreground uppercase">
                            Delivery
                        </p>
                        <p className="mt-1 flex items-center gap-0.5 font-medium">
                            <Clock3 className="size-3 text-muted-foreground" />
                            {gig.delivery_days}d
                        </p>
                    </div>
                    <div>
                        <p className="tracking-wide text-muted-foreground uppercase">
                            Rating
                        </p>
                        <p className="mt-1 flex items-center gap-0.5 font-medium">
                            <Star className="size-3 text-amber-500" />
                            {gig.review_count > 0
                                ? gig.rating.toFixed(1)
                                : 'New'}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

SellerShow.layout = roleLayout((isSuperAdmin) => [
    {
        title: 'Dashboard',
        href: isSuperAdmin ? '/admin/dashboard' : '/dashboard',
    },
    { title: 'Explore Gigs', href: '/buyer/gigs' },
    { title: 'Seller Profile', href: '#' },
]);
