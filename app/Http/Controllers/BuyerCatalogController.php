<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Gig;
use App\Models\GigFavourite;
use App\Services\CouponService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BuyerCatalogController extends Controller
{
    public function __construct(
        private readonly CouponService $coupons,
    ) {}

    public function index(Request $request): Response
    {
        $this->ensureBuyer($request);

        $filters = [
            'keyword' => trim((string) $request->string('keyword')),
            'category_id' => trim((string) $request->string('category_id')),
            'subcategory_id' => trim((string) $request->string('subcategory_id')),
            'price_max' => trim((string) $request->string('price_max')),
            'delivery_days' => trim((string) $request->string('delivery_days')),
            'rating' => trim((string) $request->string('rating')),
            'sort' => trim((string) $request->string('sort', 'latest')),
        ];

        $gigs = Gig::query()
            ->where('status', 'active')
            ->where('approval_status', 'approved')
            ->whereHas('category', fn (Builder $query) => $query->where('status', 'active'))
            ->whereHas('subcategory', fn (Builder $query) => $query->where('status', 'active'))
            ->whereHas('seller.roles', fn (Builder $query) => $query->where('name', 'seller'))
            ->with(['seller:id,name', 'category:id,name', 'subcategory:id,name', 'images', 'packages'])
            ->withMin('packages', 'price')
            ->withMin('packages', 'delivery_days')
            ->withAvg('reviews as reviews_avg_rating', 'rating')
            ->withCount('reviews')
            ->when($filters['keyword'] !== '', function (Builder $query) use ($filters) {
                $keyword = $filters['keyword'];

                $query->where(function (Builder $search) use ($keyword) {
                    $search
                        ->where('title', 'like', "%{$keyword}%")
                        ->orWhere('description', 'like', "%{$keyword}%")
                        ->orWhereJsonContains('tags', $keyword);
                });
            })
            ->when($filters['category_id'] !== '', function (Builder $query) use ($filters) {
                $query->where('category_id', $filters['category_id']);
            })
            ->when($filters['subcategory_id'] !== '', function (Builder $query) use ($filters) {
                $query->where('subcategory_id', $filters['subcategory_id']);
            })
            ->when($filters['price_max'] !== '', function (Builder $query) use ($filters) {
                $query->whereHas('packages', fn (Builder $packageQuery) => $packageQuery->where('price', '<=', (float) $filters['price_max']));
            })
            ->when($filters['delivery_days'] !== '', function (Builder $query) use ($filters) {
                $query->whereHas('packages', fn (Builder $packageQuery) => $packageQuery->where('delivery_days', '<=', (int) $filters['delivery_days']));
            })
            ->when($filters['rating'] !== '' && (int) $filters['rating'] > 0, function (Builder $query) use ($filters) {
                $query
                    ->has('reviews')
                    ->whereRaw(
                        '(select coalesce(avg(reviews.rating), 0) from reviews where reviews.gig_id = gigs.id) >= ?',
                        [(int) $filters['rating']],
                    );
            })
            ->when($filters['sort'] === 'price_asc', fn (Builder $query) => $query->orderBy('packages_min_price'))
            ->when($filters['sort'] === 'price_desc', fn (Builder $query) => $query->orderByDesc('packages_min_price'))
            ->when($filters['sort'] === 'delivery_asc', fn (Builder $query) => $query->orderBy('packages_min_delivery_days'))
            ->when(! in_array($filters['sort'], ['price_asc', 'price_desc', 'delivery_asc'], true), fn (Builder $query) => $query->latest('id'))
            ->get()
            ->map(fn (Gig $gig) => $this->catalogGigPayload($gig));

        return Inertia::render('buyer/gigs/index', [
            'gigs' => $gigs,
            'categories' => Category::query()
                ->whereNull('parent_id')
                ->where('status', 'active')
                ->with(['subcategories' => fn ($q) => $q->where('status', 'active')->orderBy('name')])
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Category $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'subcategories' => $category->subcategories->map(fn (Category $sub) => [
                        'id' => $sub->id,
                        'name' => $sub->name,
                    ])->values(),
                ]),
            'filters' => $filters,
            'favourite_gig_ids' => GigFavourite::query()
                ->where('user_id', $request->user()->id)
                ->pluck('gig_id')
                ->values(),
        ]);
    }

    public function show(Request $request, Gig $gig): Response
    {
        $this->ensureBuyer($request);

        abort_unless($gig->status === 'active' && $gig->approval_status === 'approved', 404);

        $gig->load([
            'seller:id,name,email',
            'category:id,name,status',
            'subcategory:id,name,status',
            'images',
            'packages',
            'reviews.buyer:id,name',
        ]);
        $gig->loadAvg('reviews as reviews_avg_rating', 'rating');
        $gig->loadCount('reviews');

        abort_if($gig->category?->status !== 'active' || $gig->subcategory?->status !== 'active', 404);

        // Increment view count once per session per gig
        $sessionKey = 'viewed_gig_' . $gig->id;
        if (! $request->session()->has($sessionKey)) {
            $gig->increment('views_count');
            $request->session()->put($sessionKey, true);
        }

        return Inertia::render('buyer/gigs/show', [
            'gig' => [
                ...$this->catalogGigPayload($gig),
                'description' => $gig->description,
                'seller_id' => $gig->seller?->id,
                'seller_email' => $gig->seller?->email,
                'packages' => $gig->packages
                    ->sortBy(fn ($package) => match ($package->tier) {
                        'basic' => 1,
                        'standard' => 2,
                        'premium' => 3,
                        default => 99,
                    })
                    ->values()
                    ->map(fn ($package) => [
                        'id' => $package->id,
                        'tier' => $package->tier,
                        'title' => $package->title,
                        'description' => $package->description,
                        'price' => (string) $package->price,
                        'delivery_days' => $package->delivery_days,
                        'revision_count' => $package->revision_count,
                    ]),
                'review_count' => (int) ($gig->reviews_count ?? 0),
                'views_count' => (int) $gig->views_count,
                'reviews' => $gig->reviews
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(fn ($review) => [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'comment' => $review->comment,
                        'buyer_name' => $review->buyer?->name,
                        'created_at' => $review->created_at?->toIso8601String(),
                    ]),
            ],
            'coupons' => $this->coupons->availableCoupons($request->user()->id)
                ->map(fn ($coupon) => [
                    'id' => $coupon->id,
                    'code' => $coupon->code,
                    'description' => $coupon->description,
                    'discount_type' => $coupon->discount_type,
                    'discount_value' => (string) $coupon->discount_value,
                    'minimum_order_amount' => $coupon->minimum_order_amount !== null
                        ? (string) $coupon->minimum_order_amount
                        : null,
                    'usage_limit' => $coupon->usage_limit,
                    'used_count' => $coupon->used_count,
                    'starts_at' => $coupon->starts_at?->toIso8601String(),
                    'expires_at' => $coupon->expires_at?->toIso8601String(),
                ])
                ->values(),
        ]);
    }

    private function ensureBuyer(Request $request): void
    {
        abort_unless($request->user()?->hasRole('buyer'), 403);
    }

    private function catalogGigPayload(Gig $gig): array
    {
        $coverImage = $gig->images->first();

        return [
            'id' => $gig->id,
            'title' => $gig->title,
            'description' => $gig->description,
            'seller_id' => $gig->seller?->id,
            'seller_name' => $gig->seller?->name,
            'category_name' => $gig->category?->name,
            'subcategory_name' => $gig->subcategory?->name,
            'tags' => $gig->tags ?? [],
            'cover_image_url' => $coverImage ? Storage::disk('public')->url($coverImage->path) : null,
            'gallery' => $gig->images->map(fn ($image) => Storage::disk('public')->url($image->path))->values(),
            'starting_price' => number_format((float) ($gig->packages_min_price ?? 0), 2, '.', ''),
            'delivery_days' => (int) ($gig->packages_min_delivery_days ?? 0),
            'rating' => round((float) ($gig->reviews_avg_rating ?? 0), 1),
            'review_count' => (int) ($gig->reviews_count ?? 0),
            'views_count' => (int) ($gig->views_count ?? 0),
            'package_count' => $gig->packages->count(),
        ];
    }
}
