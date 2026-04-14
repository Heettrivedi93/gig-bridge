<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Gig;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\SellerRankingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SellerGigController extends Controller
{
    private const PACKAGE_TIERS = ['basic', 'standard', 'premium'];

    public function __construct(
        private readonly SellerRankingService $sellerRanking,
    ) {}

    public function index(Request $request): Response
    {
        $seller = $this->ensureSeller($request);
        $subscription = $this->ensureActiveSubscription($seller->id);
        $sellerLevel = $this->sellerRanking->badge(
            $this->sellerRanking->recalculate($seller)
        );

        return Inertia::render('seller/gigs/index', [
            'gigs' => Gig::query()
                ->where('user_id', $seller->id)
                ->with(['category:id,name,status', 'subcategory:id,name,status', 'packages', 'images'])
                ->latest('id')
                ->get()
                ->map(fn (Gig $gig) => $this->gigPayload($gig)),
            'categories' => Category::query()
                ->whereNull('parent_id')
                ->where('status', 'active')
                ->with(['subcategories' => fn ($query) => $query->where('status', 'active')->orderBy('name')])
                ->orderBy('name')
                ->get(['id', 'name', 'status'])
                ->map(fn (Category $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'subcategories' => $category->subcategories->map(fn (Category $subcategory) => [
                        'id' => $subcategory->id,
                        'name' => $subcategory->name,
                    ])->values(),
                ]),
            'subscription' => [
                'plan_name' => $subscription->plan->name,
                'gig_limit' => $subscription->plan->gig_limit,
                'active_gig_count' => Gig::query()
                    ->where('user_id', $seller->id)
                    ->where('status', 'active')
                    ->count(),
                'ends_at' => $subscription->ends_at?->toIso8601String(),
            ],
            'seller_level' => $sellerLevel,
            'seller_is_available' => (bool) $seller->is_available,
        ]);
    }

    public function updateAvailability(Request $request): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        $data = $request->validate([
            'is_available' => ['required', 'boolean'],
        ]);

        $seller->forceFill([
            'is_available' => (bool) $data['is_available'],
        ])->save();

        return back()->with(
            'success',
            $seller->is_available
                ? 'You are now available for new orders.'
                : 'You are now marked unavailable. New orders are paused.',
        );
    }

    public function store(Request $request): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        $data = $this->validateGig($request);
        $shouldActivate = $data['status'] === 'active';

        if ($shouldActivate) {
            $this->ensureGigLimitAvailable($seller->id);
        }

        DB::transaction(function () use ($request, $seller, $data) {
            $normalizedTags = $this->normalizeTags($data['tags'] ?? null);

            $gig = Gig::create([
                'user_id' => $seller->id,
                'category_id' => $data['category_id'],
                'subcategory_id' => $data['subcategory_id'],
                'title' => $data['title'],
                'description' => $data['description'],
                'tags' => $normalizedTags,
                'status' => $data['status'],
                'approval_status' => 'pending',
                'rejection_reason' => null,
                'approved_at' => null,
                'rejected_at' => null,
            ]);

            $this->syncPackages($gig, $data['packages']);
            $this->appendImages($gig, $request->file('images', []));
        });

        return back()->with('success', 'Gig created successfully.');
    }

    public function update(Request $request, Gig $gig): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        abort_unless($gig->user_id === $seller->id, 403);

        $data = $this->validateGig($request, $gig);
        $shouldActivate = $data['status'] === 'active' && $gig->status !== 'active';

        if ($shouldActivate) {
            $this->ensureGigLimitAvailable($seller->id);
        }

        DB::transaction(function () use ($request, $gig, $data) {
            $normalizedTags = $this->normalizeTags($data['tags'] ?? null);
            $needsReapproval = $this->needsReapproval($gig, $data, $normalizedTags);

            $gig->update([
                'category_id' => $data['category_id'],
                'subcategory_id' => $data['subcategory_id'],
                'title' => $data['title'],
                'description' => $data['description'],
                'tags' => $normalizedTags,
                'status' => $data['status'],
                'approval_status' => $needsReapproval ? 'pending' : $gig->approval_status,
                'rejection_reason' => $needsReapproval ? null : $gig->rejection_reason,
                'approved_at' => $needsReapproval ? null : $gig->approved_at,
                'rejected_at' => $needsReapproval ? null : $gig->rejected_at,
            ]);

            $this->syncPackages($gig, $data['packages']);
            $this->removeImages($gig, $data['remove_image_ids'] ?? []);
            $this->appendImages($gig, $request->file('images', []));
        });

        return back()->with('success', 'Gig updated successfully.');
    }

    public function destroy(Request $request, Gig $gig): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        abort_unless($gig->user_id === $seller->id, 403);

        foreach ($gig->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $gig->delete();

        return back()->with('success', 'Gig deleted successfully.');
    }

    private function ensureSeller(Request $request)
    {
        abort_unless($request->user()?->hasRole('seller'), 403);

        return $request->user();
    }

    private function ensureActiveSubscription(int $userId): Subscription
    {
        $subscription = Subscription::query()
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->with('plan')
            ->latest('ends_at')
            ->latest('id')
            ->first();

        if ($subscription) {
            return $subscription;
        }

        $fallbackPlan = Plan::query()
            ->where('status', 'active')
            ->orderBy('price')
            ->orderBy('id')
            ->firstOrFail();

        return Subscription::create([
            'user_id' => $userId,
            'plan_id' => $fallbackPlan->id,
            'starts_at' => now(),
            'ends_at' => now()->addDays($fallbackPlan->duration_days),
            'status' => 'active',
        ])->load('plan');
    }

    private function ensureGigLimitAvailable(int $userId): void
    {
        $subscription = $this->ensureActiveSubscription($userId);

        $activeGigCount = Gig::query()
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->count();

        if ($activeGigCount >= $subscription->plan->gig_limit) {
            throw ValidationException::withMessages([
                'status' => sprintf(
                    'Your %s plan allows only %d active gigs. Upgrade your subscription or deactivate an existing gig.',
                    $subscription->plan->name,
                    $subscription->plan->gig_limit,
                ),
            ]);
        }
    }

    private function validateGig(Request $request, ?Gig $gig = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'category_id' => ['required', Rule::exists('categories', 'id')->where(fn ($query) => $query->whereNull('parent_id')->where('status', 'active'))],
            'subcategory_id' => ['required', Rule::exists('categories', 'id')->where(fn ($query) => $query->whereNotNull('parent_id')->where('status', 'active'))],
            'tags' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'in:active,inactive'],
            'images' => [$gig ? 'nullable' : 'required', 'array', 'max:8'],
            'images.*' => ['image', 'max:4096'],
            'remove_image_ids' => ['nullable', 'array'],
            'remove_image_ids.*' => ['integer'],
            'packages' => ['required', 'array', 'size:3'],
            'packages.basic.title' => ['required', 'string', 'max:255'],
            'packages.basic.description' => ['required', 'string', 'max:2000'],
            'packages.basic.price' => ['required', 'numeric', 'min:1'],
            'packages.basic.delivery_days' => ['required', 'integer', 'min:1', 'max:365'],
            'packages.basic.revision_count' => ['required', 'integer', 'min:0', 'max:50'],
            'packages.standard.title' => ['required', 'string', 'max:255'],
            'packages.standard.description' => ['required', 'string', 'max:2000'],
            'packages.standard.price' => ['required', 'numeric', 'min:1'],
            'packages.standard.delivery_days' => ['required', 'integer', 'min:1', 'max:365'],
            'packages.standard.revision_count' => ['required', 'integer', 'min:0', 'max:50'],
            'packages.premium.title' => ['required', 'string', 'max:255'],
            'packages.premium.description' => ['required', 'string', 'max:2000'],
            'packages.premium.price' => ['required', 'numeric', 'min:1'],
            'packages.premium.delivery_days' => ['required', 'integer', 'min:1', 'max:365'],
            'packages.premium.revision_count' => ['required', 'integer', 'min:0', 'max:50'],
        ]);

        $subcategory = Category::query()
            ->whereKey($data['subcategory_id'])
            ->where('status', 'active')
            ->firstOrFail();

        if ((int) $subcategory->parent_id !== (int) $data['category_id']) {
            throw ValidationException::withMessages([
                'subcategory_id' => 'Selected subcategory does not belong to the chosen category.',
            ]);
        }

        return $data;
    }

    private function syncPackages(Gig $gig, array $packages): void
    {
        foreach (self::PACKAGE_TIERS as $tier) {
            $payload = $packages[$tier];

            $gig->packages()->updateOrCreate(
                ['tier' => $tier],
                [
                    'title' => $payload['title'],
                    'description' => $payload['description'],
                    'price' => $payload['price'],
                    'delivery_days' => $payload['delivery_days'],
                    'revision_count' => $payload['revision_count'],
                ],
            );
        }
    }

    private function appendImages(Gig $gig, array $files): void
    {
        $nextSortOrder = (int) $gig->images()->max('sort_order') + 1;

        foreach ($files as $file) {
            $gig->images()->create([
                'path' => $file->store('gigs', 'public'),
                'sort_order' => $nextSortOrder++,
            ]);
        }
    }

    private function removeImages(Gig $gig, array $imageIds): void
    {
        if ($imageIds === []) {
            return;
        }

        $images = $gig->images()->whereIn('id', $imageIds)->get();

        foreach ($images as $image) {
            Storage::disk('public')->delete($image->path);
            $image->delete();
        }
    }

    private function normalizeTags(?string $tags): array
    {
        if (! $tags) {
            return [];
        }

        return collect(explode(',', $tags))
            ->map(fn ($tag) => trim($tag))
            ->filter()
            ->take(10)
            ->values()
            ->all();
    }

    private function gigPayload(Gig $gig): array
    {
        $gig->loadMissing(['packages', 'images', 'category', 'subcategory']);

        return [
            'id' => $gig->id,
            'title' => $gig->title,
            'description' => $gig->description,
            'category_id' => $gig->category_id,
            'subcategory_id' => $gig->subcategory_id,
            'category_name' => $gig->category?->name,
            'subcategory_name' => $gig->subcategory?->name,
            'tags' => implode(', ', $gig->tags ?? []),
            'status' => $gig->status,
            'approval_status' => $gig->approval_status,
            'rejection_reason' => $gig->rejection_reason,
            'approved_at' => $gig->approved_at?->toIso8601String(),
            'rejected_at' => $gig->rejected_at?->toIso8601String(),
            'images' => $gig->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => Storage::disk('public')->url($image->path),
            ])->values(),
            'packages' => collect(self::PACKAGE_TIERS)->mapWithKeys(fn ($tier) => [
                $tier => [
                    'title' => $gig->packages->firstWhere('tier', $tier)?->title ?? '',
                    'description' => $gig->packages->firstWhere('tier', $tier)?->description ?? '',
                    'price' => (string) ($gig->packages->firstWhere('tier', $tier)?->price ?? ''),
                    'delivery_days' => (string) ($gig->packages->firstWhere('tier', $tier)?->delivery_days ?? ''),
                    'revision_count' => (string) ($gig->packages->firstWhere('tier', $tier)?->revision_count ?? ''),
                ],
            ])->all(),
            'views_count' => (int) ($gig->views_count ?? 0),
        ];
    }

    private function needsReapproval(Gig $gig, array $data, array $normalizedTags): bool
    {
        if ($gig->approval_status !== 'approved') {
            return false;
        }

        if ((int) $gig->category_id !== (int) $data['category_id']) {
            return true;
        }

        if ((int) $gig->subcategory_id !== (int) $data['subcategory_id']) {
            return true;
        }

        if ($gig->title !== $data['title'] || $gig->description !== $data['description']) {
            return true;
        }

        if (($gig->tags ?? []) !== $normalizedTags) {
            return true;
        }

        foreach (self::PACKAGE_TIERS as $tier) {
            $existing = $gig->packages->firstWhere('tier', $tier);
            $payload = $data['packages'][$tier] ?? null;

            if (! $existing || ! $payload) {
                return true;
            }

            if (
                (string) $existing->title !== (string) $payload['title']
                || (string) $existing->description !== (string) $payload['description']
                || (float) $existing->price !== (float) $payload['price']
                || (int) $existing->delivery_days !== (int) $payload['delivery_days']
                || (int) $existing->revision_count !== (int) $payload['revision_count']
            ) {
                return true;
            }
        }

        return false;
    }
}
