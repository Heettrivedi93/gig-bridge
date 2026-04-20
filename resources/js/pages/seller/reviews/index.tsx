import { Head } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import EmptyState from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BreadcrumbItem } from '@/types';

type Review = {
    id: number;
    rating: number;
    comment: string | null;
    buyer_name: string | null;
    gig_title: string | null;
    order_id: number;
    created_at: string | null;
};

type Stats = {
    total: number;
    average: number;
    breakdown: Record<number, number>;
};

type Props = {
    reviews: Review[];
    stats: Stats;
};

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`size-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                />
            ))}
        </div>
    );
}

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function SellerReviewsIndex({ reviews, stats }: Props) {
    const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
    const [pageSize, setPageSize] = useState(10);

    const filtered = ratingFilter === 'all'
        ? reviews
        : reviews.filter((r) => r.rating === ratingFilter);

    const visible = filtered.slice(0, pageSize);

    return (
        <>
            <Head title="My Reviews" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="My Reviews"
                    description="See all ratings and feedback buyers have left for your services."
                />

                {/* Stats */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <p className="text-sm text-muted-foreground">Total reviews</p>
                        <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <p className="text-sm text-muted-foreground">Average rating</p>
                        <div className="mt-2 flex items-center gap-2">
                            <p className="text-3xl font-semibold">{stats.average}</p>
                            <StarRating rating={Math.round(stats.average)} />
                        </div>
                    </div>

                    <div className="col-span-full xl:col-span-2 rounded-2xl border border-border/70 bg-card p-5">
                        <p className="mb-3 text-sm text-muted-foreground">Rating breakdown</p>
                        <div className="space-y-1.5">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = stats.breakdown[star] ?? 0;
                                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                                return (
                                    <div key={star} className="flex items-center gap-2 text-sm">
                                        <span className="w-4 text-right text-muted-foreground">{star}</span>
                                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-amber-400"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="w-6 text-right text-muted-foreground">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Filter + rows per page */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {(['all', 5, 4, 3, 2, 1] as const).map((val) => (
                            <button
                                key={val}
                                onClick={() => setRatingFilter(val)}
                                className={`rounded-full border px-3 py-1 text-sm transition ${
                                    ratingFilter === val
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {val === 'all' ? 'All' : `${val} ★`}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page</span>
                        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50, 100].map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Reviews list */}
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={Star}
                        title="No reviews yet"
                        description="Reviews from buyers will appear here after orders are completed."
                    />
                ) : (
                    <>
                        <div className="space-y-3">
                            {visible.map((review) => (
                                <div
                                    key={review.id}
                                    className="rounded-2xl border border-border/70 bg-card p-5"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StarRating rating={review.rating} />
                                                <Badge variant="outline">{review.rating} / 5</Badge>
                                            </div>
                                            <p className="text-sm font-medium">{review.buyer_name ?? 'Buyer'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Order #{review.order_id}
                                                {review.gig_title ? ` · ${review.gig_title}` : ''}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground shrink-0">
                                            {formatDate(review.created_at)}
                                        </p>
                                    </div>

                                    {review.comment && (
                                        <p className="mt-3 text-sm text-foreground leading-relaxed border-t border-border/50 pt-3">
                                            {review.comment}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

SellerReviewsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'My Reviews', href: '/seller/reviews' },
    ] satisfies BreadcrumbItem[],
};
