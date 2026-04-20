<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SellerReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $reviews = Review::query()
            ->where('seller_id', $request->user()->id)
            ->with(['buyer:id,name', 'gig:id,title', 'order:id'])
            ->latest()
            ->get()
            ->map(fn ($review) => [
                'id'         => $review->id,
                'rating'     => $review->rating,
                'comment'    => $review->comment,
                'buyer_name' => $review->buyer?->name,
                'gig_title'  => $review->gig?->title,
                'order_id'   => $review->order_id,
                'created_at' => $review->created_at?->toIso8601String(),
            ]);

        $total   = $reviews->count();
        $average = $total > 0 ? round($reviews->avg('rating'), 1) : 0;

        $breakdown = collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($star) => [
            $star => $reviews->where('rating', $star)->count(),
        ]);

        return Inertia::render('seller/reviews/index', [
            'reviews'   => $reviews->values(),
            'stats'     => [
                'total'     => $total,
                'average'   => $average,
                'breakdown' => $breakdown,
            ],
        ]);
    }
}
