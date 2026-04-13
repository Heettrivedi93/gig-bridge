<?php

namespace App\Http\Controllers;

use App\Models\Gig;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SellerProfileController extends Controller
{
    public function show(User $user): Response
    {
        abort_unless($user->hasRole('seller'), 404);

        $gigs = Gig::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('approval_status', 'approved')
            ->whereHas('category', fn (Builder $q) => $q->where('status', 'active'))
            ->whereHas('subcategory', fn (Builder $q) => $q->where('status', 'active'))
            ->with(['category:id,name', 'subcategory:id,name', 'images', 'packages'])
            ->withMin('packages', 'price')
            ->withMin('packages', 'delivery_days')
            ->withAvg('reviews as reviews_avg_rating', 'rating')
            ->withCount('reviews')
            ->latest('id')
            ->get()
            ->map(fn (Gig $gig) => [
                'id'              => $gig->id,
                'title'           => $gig->title,
                'description'     => $gig->description,
                'category_name'   => $gig->category?->name,
                'subcategory_name' => $gig->subcategory?->name,
                'tags'            => $gig->tags ?? [],
                'cover_image_url' => $gig->images->first()
                    ? Storage::disk('public')->url($gig->images->first()->path)
                    : null,
                'starting_price'  => number_format((float) ($gig->packages_min_price ?? 0), 2, '.', ''),
                'delivery_days'   => (int) ($gig->packages_min_delivery_days ?? 0),
                'rating'          => round((float) ($gig->reviews_avg_rating ?? 0), 1),
                'review_count'    => (int) ($gig->reviews_count ?? 0),
                'package_count'   => $gig->packages->count(),
            ]);

        $reviewStats = Review::query()
            ->where('seller_id', $user->id)
            ->selectRaw('COUNT(*) as total, COALESCE(AVG(rating), 0) as average')
            ->first();

        $completedOrders = Order::query()
            ->where('seller_id', $user->id)
            ->where('status', 'completed')
            ->count();

        $recentReviews = Review::query()
            ->where('seller_id', $user->id)
            ->with(['buyer:id,name', 'gig:id,title'])
            ->latest()
            ->take(6)
            ->get()
            ->map(fn (Review $review) => [
                'id'         => $review->id,
                'rating'     => $review->rating,
                'comment'    => $review->comment,
                'buyer_name' => $review->buyer?->name,
                'gig_title'  => $review->gig?->title,
                'created_at' => $review->created_at?->toIso8601String(),
            ]);

        $skills = $user->skills
            ? collect(explode(',', $user->skills))->map(fn ($s) => trim($s))->filter()->values()->all()
            : [];

        return Inertia::render('sellers/show', [
            'seller' => [
                'id'           => $user->id,
                'name'         => $user->name,
                'bio'          => $user->bio,
                'skills'       => $skills,
                'location'     => $user->location,
                'website'      => $user->website,
                'avatar'       => $user->profile_picture
                    ? Storage::disk('public')->url($user->profile_picture)
                    : null,
                'member_since' => $user->created_at?->format('F Y'),
            ],
            'stats' => [
                'gig_count'        => $gigs->count(),
                'completed_orders' => $completedOrders,
                'review_count'     => (int) ($reviewStats->total ?? 0),
                'average_rating'   => round((float) ($reviewStats->average ?? 0), 1),
            ],
            'gigs'           => $gigs,
            'recent_reviews' => $recentReviews,
        ]);
    }
}
