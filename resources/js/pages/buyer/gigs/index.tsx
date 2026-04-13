import { Head, Link, router } from '@inertiajs/react';
import {
    Clock3,
    Eye,
    Heart,
    Layers3,
    Search,
    SlidersHorizontal,
    Sparkles,
    Star,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/flash-toaster';
import Heading from '@/components/heading';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
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
    gallery: string[];
    starting_price: string;
    delivery_days: number;
    rating: number;
    review_count: number;
    views_count: number;
    package_count: number;
};

type CategoryOption = {
    id: number;
    name: string;
    subcategories: { id: number; name: string }[];
};

type Filters = {
    keyword: string;
    category_id: string;
    subcategory_id: string;
    price_max: string;
    delivery_days: string;
    rating: string;
    sort: string;
};

type Props = {
    gigs: GigCard[];
    categories: CategoryOption[];
    filters: Filters;
    favourite_gig_ids: number[];
};

function sellerInitials(name: string | null) {
    if (!name) {
        return 'SL';
    }

    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

export default function BuyerGigIndex({ gigs, categories, filters, favourite_gig_ids }: Props) {
    const [query, setQuery] = useState<Filters>(filters);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [savedIds, setSavedIds] = useState<Set<number>>(new Set(favourite_gig_ids));
    const keywordSearchTimeoutRef = useRef<number | null>(null);

    const selectedCategory = useMemo(
        () => categories.find((c) => String(c.id) === query.category_id) ?? null,
        [categories, query.category_id],
    );

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

    const activeFilterCount = useMemo(
        () =>
            Object.entries(query).filter(
                ([key, value]) => key !== 'sort' && value !== '',
            ).length,
        [query],
    );

    const clearKeywordSearchTimeout = () => {
        if (keywordSearchTimeoutRef.current === null) {
            return;
        }

        window.clearTimeout(keywordSearchTimeoutRef.current);
        keywordSearchTimeoutRef.current = null;
    };

    const scheduleKeywordSearch = (nextQuery: Filters) => {
        clearKeywordSearchTimeout();

        keywordSearchTimeoutRef.current = window.setTimeout(() => {
            router.get('/buyer/gigs', nextQuery, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                preserveUrl: true,
            });
        }, 350);
    };

    useEffect(() => {
        return () => {
            clearKeywordSearchTimeout();
        };
    }, []);

    const applyFilters = () => {
        clearKeywordSearchTimeout();

        router.get('/buyer/gigs', query, {
            preserveState: true,
            preserveScroll: true,
            preserveUrl: true,
        });

        setShowMobileFilters(false);
    };

    const clearFilters = () => {
        clearKeywordSearchTimeout();

        const reset = {
            keyword: '',
            category_id: '',
            subcategory_id: '',
            price_max: '',
            delivery_days: '',
            rating: '',
            sort: 'latest',
        };

        setQuery(reset);

        router.get('/buyer/gigs', reset, {
            preserveState: true,
            preserveScroll: true,
            preserveUrl: true,
        });

        setShowMobileFilters(false);
    };

    const filterPanel = (
        <div className="space-y-5">
            <div className="rounded-3xl border border-border/70 bg-card p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SlidersHorizontal className="size-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary">
                            {activeFilterCount} active
                        </Badge>
                    )}
                </div>

                <div className="mt-5 space-y-4">
                    <div>
                        <Label>Category</Label>
                        <Select
                            value={query.category_id || 'all'}
                            onValueChange={(value) =>
                                setQuery({
                                    ...query,
                                    category_id: value === 'all' ? '' : value,
                                    subcategory_id: '',
                                })
                            }
                        >
                            <SelectTrigger className="mt-2 w-full">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All categories
                                </SelectItem>
                                {categories.map((category) => (
                                    <SelectItem
                                        key={category.id}
                                        value={String(category.id)}
                                    >
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedCategory && selectedCategory.subcategories.length > 0 && (
                        <div>
                            <Label>Subcategory</Label>
                            <Select
                                value={query.subcategory_id || 'all'}
                                onValueChange={(value) =>
                                    setQuery({
                                        ...query,
                                        subcategory_id: value === 'all' ? '' : value,
                                    })
                                }
                            >
                                <SelectTrigger className="mt-2 w-full">
                                    <SelectValue placeholder="All subcategories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All subcategories
                                    </SelectItem>
                                    {selectedCategory.subcategories.map((sub) => (
                                        <SelectItem
                                            key={sub.id}
                                            value={String(sub.id)}
                                        >
                                            {sub.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div>
                        <Label htmlFor="price-max">Max price</Label>
                        <Input
                            id="price-max"
                            type="number"
                            min="1"
                            value={query.price_max}
                            onChange={(event) =>
                                setQuery({
                                    ...query,
                                    price_max: event.target.value,
                                })
                            }
                            className="mt-2"
                            placeholder="500"
                        />
                    </div>

                    <div>
                        <Label htmlFor="delivery-days">Delivery days</Label>
                        <Input
                            id="delivery-days"
                            type="number"
                            min="1"
                            value={query.delivery_days}
                            onChange={(event) =>
                                setQuery({
                                    ...query,
                                    delivery_days: event.target.value,
                                })
                            }
                            className="mt-2"
                            placeholder="7"
                        />
                    </div>

                    <div>
                        <Label>Rating</Label>
                        <Select
                            value={query.rating || 'all'}
                            onValueChange={(value) =>
                                setQuery({
                                    ...query,
                                    rating: value === 'all' ? '' : value,
                                })
                            }
                        >
                            <SelectTrigger className="mt-2 w-full">
                                <SelectValue placeholder="Any rating" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any rating</SelectItem>
                                <SelectItem value="4">4+ stars</SelectItem>
                                <SelectItem value="5">5 stars</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Sort</Label>
                        <Select
                            value={query.sort || 'latest'}
                            onValueChange={(value) =>
                                setQuery({ ...query, sort: value })
                            }
                        >
                            <SelectTrigger className="mt-2 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latest">Latest</SelectItem>
                                <SelectItem value="price_asc">
                                    Price: Low to high
                                </SelectItem>
                                <SelectItem value="price_desc">
                                    Price: High to low
                                </SelectItem>
                                <SelectItem value="delivery_asc">
                                    Fastest delivery
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    <Button className="w-full" onClick={applyFilters}>
                        Apply filters
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={clearFilters}
                    >
                        Clear filters
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="size-4" />
                    Buyer tips
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                    Use broad search first, then tighten delivery and budget
                    filters. Rating will help more once completed orders start
                    collecting buyer reviews.
                </p>
            </div>
        </div>
    );

    return (
        <>
            <Head title="Explore Gigs" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Heading
                        title="Explore Gigs"
                        description="Discover seller services, compare packages, and prepare your order with filters that match your brief."
                    />
                    <Badge variant="outline">{gigs.length} gigs</Badge>
                </div>

                <section className="rounded-[2rem] border border-border/70 bg-card p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="buyer-search"
                                value={query.keyword}
                                onChange={(event) => {
                                    const nextQuery = {
                                        ...query,
                                        keyword: event.target.value,
                                    };

                                    setQuery(nextQuery);
                                    scheduleKeywordSearch(nextQuery);
                                }}
                                className="h-12 rounded-2xl border-border/70 pl-11"
                                placeholder="Search for logo design, web development, copywriting..."
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                className="rounded-2xl"
                                onClick={() => setShowMobileFilters(true)}
                            >
                                <SlidersHorizontal className="mr-2 size-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                className="rounded-2xl"
                                onClick={applyFilters}
                            >
                                Search
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {query.category_id && (
                            <Badge variant="secondary">
                                {selectedCategory?.name ?? 'Category selected'}
                            </Badge>
                        )}
                        {query.subcategory_id && (
                            <Badge variant="secondary">
                                {selectedCategory?.subcategories.find(
                                    (s) => String(s.id) === query.subcategory_id,
                                )?.name ?? 'Subcategory selected'}
                            </Badge>
                        )}
                        {query.price_max && (
                            <Badge variant="secondary">
                                Up to USD {query.price_max}
                            </Badge>
                        )}
                        {query.delivery_days && (
                            <Badge variant="secondary">
                                Delivery in {query.delivery_days} days
                            </Badge>
                        )}
                        {query.rating && (
                            <Badge variant="secondary">
                                {query.rating}+ stars
                            </Badge>
                        )}
                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={clearFilters}
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="hidden xl:block">
                        <div className="sticky top-6">{filterPanel}</div>
                    </aside>

                    <section className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Marketplace results
                                </p>
                                <p className="text-lg font-semibold">
                                    {gigs.length} services ready to compare
                                </p>
                            </div>
                            <div className="hidden rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground lg:block">
                                Sort:{' '}
                                <span className="font-medium text-foreground">
                                    {query.sort || 'latest'}
                                </span>
                            </div>
                        </div>

                        {gigs.length === 0 ? (
                            <section className="rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
                                <h2 className="text-lg font-semibold">
                                    No gigs matched these filters
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Try broadening your search, removing the
                                    rating filter, or increasing the delivery
                                    range.
                                </p>
                            </section>
                        ) : (
                            <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                                {gigs.map((gig) => (
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
                                                aria-label={savedIds.has(gig.id) ? 'Remove from saved' : 'Save gig'}
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
                                                            {sellerInitials(
                                                                gig.seller_name,
                                                            )}
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
                                                        <p className="text-xs text-muted-foreground">
                                                            {gig.subcategory_name}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                                                        Starting at
                                                    </p>
                                                    <p className="mt-1 text-2xl font-semibold">
                                                        <span className="text-sm text-muted-foreground">
                                                            USD
                                                        </span>{' '}
                                                        {gig.starting_price}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <h2 className="line-clamp-2 text-lg font-semibold">
                                                    {gig.title}
                                                </h2>
                                                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                                                    {gig.description}
                                                </p>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {gig.tags
                                                    .slice(0, 3)
                                                    .map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="secondary"
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                            </div>

                                            <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm">
                                                <div>
                                                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                                                        Delivery
                                                    </p>
                                                    <p className="mt-2 flex items-center gap-1 font-medium">
                                                        <Clock3 className="size-4 text-muted-foreground" />
                                                        {gig.delivery_days} days
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                                                        Rating
                                                    </p>
                                                    <p className="mt-2 flex items-center gap-1 font-medium">
                                                        <Star className="size-4 text-amber-500" />
                                                        {gig.review_count > 0
                                                            ? gig.rating.toFixed(1)
                                                            : 'New'}
                                                        <span className="text-xs text-muted-foreground">
                                                            {gig.review_count > 0
                                                                ? `(${gig.review_count})`
                                                                : '(0 reviews)'}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                                                        Views
                                                    </p>
                                                    <p className="mt-2 flex items-center gap-1 font-medium">
                                                        <Eye className="size-4 text-muted-foreground" />
                                                        {gig.views_count.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Open gig and compare all
                                                    packages
                                                </p>
                                                <span className="text-sm font-medium text-primary">
                                                    View details
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                <SheetContent
                    side="left"
                    className="w-full max-w-sm overflow-y-auto"
                >
                    <SheetHeader>
                        <SheetTitle>Refine Results</SheetTitle>
                        <SheetDescription>
                            Narrow the catalog by budget, timeline, category,
                            and sort order.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">{filterPanel}</div>
                </SheetContent>
            </Sheet>
        </>
    );
}

BuyerGigIndex.layout = {
    breadcrumbs: [
        {
            title: 'Explore Gigs',
            href: '/buyer/gigs',
        },
    ] satisfies BreadcrumbItem[],
};
