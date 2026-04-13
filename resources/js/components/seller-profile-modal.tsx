import { Link } from '@inertiajs/react';
import {
    BadgeCheck,
    Clock3,
    ExternalLink,
    MapPin,
    MessageSquare,
    Star,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

type SellerGig = {
    id: number;
    title: string;
    description: string;
    category_name: string | null;
    cover_image_url: string | null;
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
};

type SellerReview = {
    id: number;
    rating: number;
    comment: string;
    buyer_name: string | null;
    gig_title: string | null;
    created_at: string | null;
};

type SellerProfile = {
    seller: {
        id: number;
        name: string;
        bio: string | null;
        location: string | null;
        website: string | null;
        member_since: string | null;
        avatar: string | null;
        skills: string[];
    };
    stats: {
        gig_count: number;
        completed_orders: number;
        review_count: number;
        average_rating: number;
    };
    gigs: SellerGig[];
    recent_reviews: SellerReview[];
};

type Props = {
    sellerId: number | null;
    sellerName?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isBuyer?: boolean;
};

function initials(name: string) {
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function StarRow({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={`size-3 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                />
            ))}
        </div>
    );
}

export default function SellerProfileModal({ sellerId, sellerName, open, onOpenChange, isBuyer = false }: Props) {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !sellerId) return;

        setProfile(null);
        setLoading(true);

        fetch(`/api/sellers/${sellerId}/profile`, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => setProfile(data))
            .finally(() => setLoading(false));
    }, [open, sellerId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl">
                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Spinner className="size-6 text-muted-foreground" />
                    </div>
                )}

                {/* Profile content */}
                {!loading && profile && (
                    <div>
                        {/* Header */}
                        <div className="flex items-start gap-4 border-b border-border/70 p-6">
                            <Avatar className="size-16 shrink-0 rounded-2xl border border-border/70">
                                <AvatarImage src={profile.seller.avatar ?? undefined} alt={profile.seller.name} />
                                <AvatarFallback className="rounded-2xl bg-muted text-lg font-semibold">
                                    {initials(profile.seller.name)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-bold">{profile.seller.name}</h2>

                                {profile.seller.location && (
                                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="size-3.5 shrink-0" />
                                        {profile.seller.location}
                                    </p>
                                )}

                                {profile.stats.average_rating > 0 && (
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <StarRow rating={profile.stats.average_rating} />
                                        <span className="text-sm font-medium">
                                            {profile.stats.average_rating.toFixed(1)}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            ({profile.stats.review_count} reviews)
                                        </span>
                                    </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                    <div>
                                        <span className="font-semibold">{profile.stats.gig_count}</span>
                                        <span className="ml-1 text-muted-foreground">gigs</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">{profile.stats.completed_orders}</span>
                                        <span className="ml-1 text-muted-foreground">completed</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Member since</span>
                                        <span className="ml-1 font-medium">{profile.seller.member_since}</span>
                                    </div>
                                </div>
                            </div>

                            {isBuyer && (
                                <Button asChild variant="outline" size="sm" className="shrink-0">
                                    <Link
                                        href={`/messages?recipient_id=${profile.seller.id}`}
                                        onClick={() => onOpenChange(false)}
                                    >
                                        <MessageSquare className="mr-1.5 size-4" />
                                        Message
                                    </Link>
                                </Button>
                            )}
                        </div>

                        <div className="space-y-5 p-6">
                            {/* Bio */}
                            {profile.seller.bio && (
                                <div>
                                    <p className="mb-1.5 text-sm font-semibold">About</p>
                                    <p className="text-sm leading-6 text-muted-foreground whitespace-pre-line">
                                        {profile.seller.bio}
                                    </p>
                                </div>
                            )}

                            {/* Skills */}
                            {profile.seller.skills.length > 0 && (
                                <div>
                                    <p className="mb-2 text-sm font-semibold">Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {profile.seller.skills.map((skill) => (
                                            <Badge key={skill} variant="secondary" className="text-xs">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Website */}
                            {profile.seller.website && (
                                <div>
                                    <p className="mb-1 text-sm font-semibold">Website</p>
                                    <a
                                        href={profile.seller.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                                    >
                                        <ExternalLink className="size-3.5" />
                                        {profile.seller.website.replace(/^https?:\/\//, '')}
                                    </a>
                                </div>
                            )}

                            {/* Active gigs */}
                            {profile.gigs.length > 0 && (
                                <div>
                                    <p className="mb-3 text-sm font-semibold">
                                        Active services ({profile.stats.gig_count})
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {profile.gigs.map((gig) => (
                                            <Link
                                                key={gig.id}
                                                href={isBuyer ? `/buyer/gigs/${gig.id}` : '#'}
                                                onClick={() => isBuyer && onOpenChange(false)}
                                                className={`group overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-primary/40 ${!isBuyer ? 'pointer-events-none' : ''}`}
                                            >
                                                {gig.cover_image_url ? (
                                                    <img
                                                        src={gig.cover_image_url}
                                                        alt={gig.title}
                                                        className="aspect-[16/7] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                                    />
                                                ) : (
                                                    <div className="flex aspect-[16/7] items-center justify-center bg-muted text-xs text-muted-foreground">
                                                        No image
                                                    </div>
                                                )}
                                                <div className="p-3">
                                                    <p className="line-clamp-1 text-sm font-medium">{gig.title}</p>
                                                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock3 className="size-3" />
                                                            {gig.delivery_days}d
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Star className="size-3 text-amber-500" />
                                                            {gig.review_count > 0 ? gig.rating.toFixed(1) : 'New'}
                                                        </span>
                                                        <span className="font-semibold text-foreground">
                                                            USD {gig.starting_price}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reviews */}
                            {profile.recent_reviews.length > 0 && (
                                <div>
                                    <p className="mb-3 text-sm font-semibold">
                                        Recent reviews ({profile.stats.review_count})
                                    </p>
                                    <div className="space-y-3">
                                        {profile.recent_reviews.map((review) => (
                                            <div
                                                key={review.id}
                                                className="rounded-2xl border border-border/70 bg-card p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {review.buyer_name ?? 'Buyer'}
                                                        </p>
                                                        {review.gig_title && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {review.gig_title}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                        <Star className="size-3 fill-current" />
                                                        {review.rating}
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-sm leading-5 text-muted-foreground line-clamp-3">
                                                    {review.comment}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No gigs empty state */}
                            {profile.gigs.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-border/70 py-8 text-center">
                                    <BadgeCheck className="mx-auto size-7 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        No active gigs published yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
