<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AdminGigModerationController extends Controller
{
    public function index(Request $request): Response
    {
        $gigs = Gig::query()
            ->with([
                'seller:id,name,email',
                'category:id,name',
                'subcategory:id,name',
                'packages:id,gig_id,tier,title,description,price,delivery_days,revision_count',
                'images:id,gig_id,path,sort_order',
            ])
            ->latest('updated_at')
            ->latest('id')
            ->get()
            ->map(function (Gig $gig) {
                $startingPrice = (float) ($gig->packages->min('price') ?? 0);

                return [
                    'id'               => $gig->id,
                    'title'            => $gig->title,
                    'description'      => $gig->description,
                    'tags'             => $gig->tags ?? [],
                    'status'           => $gig->status,
                    'approval_status'  => $gig->approval_status,
                    'rejection_reason' => $gig->rejection_reason,
                    'approved_at'      => $gig->approved_at?->toIso8601String(),
                    'rejected_at'      => $gig->rejected_at?->toIso8601String(),
                    'created_at'       => $gig->created_at?->toIso8601String(),
                    'updated_at'       => $gig->updated_at?->toIso8601String(),
                    'seller' => [
                        'name'  => $gig->seller?->name,
                        'email' => $gig->seller?->email,
                    ],
                    'category'      => $gig->category?->name,
                    'subcategory'   => $gig->subcategory?->name,
                    'starting_price' => number_format($startingPrice, 2, '.', ''),
                    'packages' => $gig->packages->sortBy('tier')->map(fn ($p) => [
                        'tier'           => $p->tier,
                        'title'          => $p->title,
                        'description'    => $p->description,
                        'price'          => number_format((float) $p->price, 2, '.', ''),
                        'delivery_days'  => $p->delivery_days,
                        'revision_count' => $p->revision_count,
                    ])->values(),
                    'images' => $gig->images->sortBy('sort_order')->map(
                        fn ($img) => \Illuminate\Support\Facades\Storage::disk('public')->url($img->path)
                    )->values(),
                    'pending_changes' => $gig->pending_changes,
                ];
            })
            ->values();

        return Inertia::render('admin/gigs/index', [
            'stats' => [
                'pending' => Gig::query()->where('approval_status', 'pending')->count(),
                'approved' => Gig::query()->where('approval_status', 'approved')->count(),
                'rejected' => Gig::query()->where('approval_status', 'rejected')->count(),
            ],
            'gigs' => $gigs,
        ]);
    }

    public function approve(Request $request, Gig $gig): RedirectResponse
    {
        $gig->update([
            'approval_status'  => 'approved',
            'rejection_reason' => null,
            'pending_changes'  => null,
            'approved_at'      => now(),
            'rejected_at'      => null,
        ]);

        return back()->with('success', 'Gig approved successfully.');
    }

    public function reject(Request $request, Gig $gig): RedirectResponse
    {
        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:15', 'max:2000'],
        ]);

        $gig->update([
            'approval_status'  => 'rejected',
            'rejection_reason' => $data['rejection_reason'],
            'pending_changes'  => null,
            'approved_at'      => null,
            'rejected_at'      => now(),
        ]);

        return back()->with('success', 'Gig rejected with reason.');
    }
}
