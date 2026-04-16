<?php

namespace App\Http\Controllers;

use App\Models\Gig;
use App\Models\GigFavourite;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class GigFavouriteController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('buyer'), 403);

        $favouriteGigIds = GigFavourite::query()
            ->where('user_id', $user->id)
            ->pluck('gig_id');

        $gigs = Gig::query()
            ->whereIn('id', $favouriteGigIds)
            ->where('status', 'active')
            ->where('approval_status', 'approved')
            ->with(['seller:id,name', 'category:id,name', 'subcategory:id,name', 'images', 'packages'])
            ->withMin('packages', 'price')
            ->withMin('packages', 'delivery_days')
            ->withAvg('reviews as reviews_avg_rating', 'rating')
            ->withCount('reviews')
            ->latest('id')
            ->get()
            ->map(fn (Gig $gig) => $this->gigPayload($gig));

        return Inertia::render('buyer/favourites/index', [
            'gigs' => $gigs,
            'favourite_gig_ids' => $favouriteGigIds->values(),
        ]);
    }

    public function toggle(Request $request, Gig $gig): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('buyer'), 403);

        $existing = GigFavourite::query()
            ->where('user_id', $user->id)
            ->where('gig_id', $gig->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $saved = false;
        } else {
            GigFavourite::create(['user_id' => $user->id, 'gig_id' => $gig->id]);
            $saved = true;
        }

        return response()->json(['saved' => $saved]);
    }

    private function gigPayload(Gig $gig): array
    {
        return [
            'id' => $gig->id,
            'title' => $gig->title,
            'description' => $gig->description,
            'seller_id' => $gig->seller?->id,
            'seller_name' => $gig->seller?->name,
            'category_name' => $gig->category?->name,
            'subcategory_name' => $gig->subcategory?->name,
            'tags' => $gig->tags ?? [],
            'cover_image_url' => $gig->images->first()
                ? Storage::disk('public')->url($gig->images->first()->path)
                : null,
            'starting_price' => number_format((float) ($gig->packages_min_price ?? 0), 2, '.', ''),
            'delivery_days' => (int) ($gig->packages_min_delivery_days ?? 0),
            'rating' => round((float) ($gig->reviews_avg_rating ?? 0), 1),
            'review_count' => (int) ($gig->reviews_count ?? 0),
            'package_count' => $gig->packages->count(),
        ];
    }
}
