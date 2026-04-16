import { Head, Link } from '@inertiajs/react';
import { Bookmark, Clock3, Heart, Layers3, Search, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/flash-toaster';
import EmptyState from '@/components/empty-state';
import Heading from '@/components/heading';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { BreadcrumbItem } from '@/types';

type GigCard = {
    id: number;
    title: string;
    description: string;
    seller_id: number | null;
    seller_name: string | null;
    category_name: string | null;
    subcategory_name: string | null;
    tags: string[];
    cover_image_url: string | null;
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
    package_count: number;
};

type Props = {
    gigs: GigCard[];
    favourite_gig_ids: number[];
};

function sellerInitials(name: string | null) {
    if (!name) return 'SL';
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function BuyerFavouritesIndex({ gigs, favourite_gig_ids }: Props) {
    const [savedIds, setSavedIds] = useState<Set<number>>(new Set(favourite_gig_ids));

    const toggleFavourite = (e: React.MouseEvent, gigId: number) => {
        e.preventDefault();
        e.stopPropagation();
        const isNowSaved = !savedIds.has(gigId);
        setSavedIds((prev) => {
            const next = new Set(prev);
            next.has(gigId) ? next.delete(gigId) : next.add(gigId);
            return next;
        });
        toast('success', isNowSaved ? 'Gig saved to your wishlist.' : 'Gig removed from your wishlist.');
        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        fetch(`/buyer/gigs/${gigId}/favourite`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
        });
    };

    const visibleGigs = gigs.filter((g) => savedIds.has(g.id));

    return (
        <>
            <Head title="Saved Gigs" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Heading
                        title="Saved Gigs"
                        description="Gigs you've hearted for later. Unsave anytime by clicking the heart."
                    />
                    <Badge variant="outline">{visibleGigs.length} saved</Badge>
                </div>

                {visibleGigs.length === 0 ? (
                    <EmptyState
                        icon={Bookmark}
                        title="No saved gigs yet"
                        description="Browse the catalog and tap the heart on any gig to save it here."
                        action={{ label: 'Explore gigs', onClick: () => { window.location.href = '/buyer/gigs'; } }}
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {visibleGigs.map((gig) => (
                            <Link
                                key={gig.id}
                                href={`/buyer/gigs/${gig.id}`}
                                className="group overflow-hidden rounded-[2rem] border border-border/70 bg-card transition hover:-translate-y-0.5 hover:border-primary/40"
                            >
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

                                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                                        <Badge className="border border-white/20 bg-black/55 text-white shadow-sm backdrop-blur">
                                            {gig.category_name}
                                        </Badge>
                                        {gig.delivery_days <= 3 && (
                                            <Badge className="border border-emerald-200/80 bg-emerald-50 text-emerald-700 shadow-sm">
                                                Fast delivery
                                            </Badge>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => toggleFavourite(e, gig.id)}
                                        className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-background/80 shadow backdrop-blur transition hover:scale-110"
                                        aria-label="Remove from saved"
                                    >
                                        <Heart
                                            className={`size-4 transition ${
                                                savedIds.has(gig.id)
                                                    ? 'fill-rose-500 text-rose-500'
                                                    : 'text-muted-foreground'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-10 border border-border/70">
                                                <AvatarFallback className="bg-secondary text-secondary-foreground">
                                                    {sellerInitials(gig.seller_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                {gig.seller_id ? (
                                                    <Link
                                                        href={`/sellers/${gig.seller_id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sm font-medium hover:underline underline-offset-4"
                                                    >
                                                        {gig.seller_name}
                                                    </Link>
                                                ) : (
                                                    <p className="text-sm font-medium">{gig.seller_name}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground">{gig.subcategory_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Starting at</p>
                                            <p className="mt-1 text-2xl font-semibold">
                                                <span className="text-sm text-muted-foreground">USD</span>{' '}
                                                {gig.starting_price}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h2 className="line-clamp-2 text-lg font-semibold">{gig.title}</h2>
                                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{gig.description}</p>
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm">
                                        <div>
                                            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Delivery</p>
                                            <p className="mt-2 flex items-center gap-1 font-medium">
                                                <Clock3 className="size-4 text-muted-foreground" />
                                                {gig.delivery_days} days
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Packages</p>
                                            <p className="mt-2 flex items-center gap-1 font-medium">
                                                <Layers3 className="size-4 text-muted-foreground" />
                                                {gig.package_count}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Rating</p>
                                            <p className="mt-2 flex items-center gap-1 font-medium">
                                                <Star className="size-4 text-amber-500" />
                                                {gig.review_count > 0 ? gig.rating.toFixed(1) : 'New'}
                                                <span className="text-xs text-muted-foreground">
                                                    {gig.review_count > 0 ? `(${gig.review_count})` : ''}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

BuyerFavouritesIndex.layout = {
    breadcrumbs: [
        { title: 'Explore Gigs', href: '/buyer/gigs' },
        { title: 'Saved Gigs', href: '/buyer/favourites' },
    ] satisfies BreadcrumbItem[],
};
