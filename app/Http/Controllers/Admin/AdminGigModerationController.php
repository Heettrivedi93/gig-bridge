<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminGigModerationController extends Controller
{
    public function index(Request $request): Response
    {
        $gigs = Gig::query()
            ->with(['seller:id,name,email', 'category:id,name', 'subcategory:id,name', 'packages:id,gig_id,tier,price'])
            ->latest('updated_at')
            ->latest('id')
            ->get()
            ->map(function (Gig $gig) {
                $startingPrice = (float) ($gig->packages->min('price') ?? 0);

                return [
                    'id' => $gig->id,
                    'title' => $gig->title,
                    'status' => $gig->status,
                    'approval_status' => $gig->approval_status,
                    'rejection_reason' => $gig->rejection_reason,
                    'approved_at' => $gig->approved_at?->toIso8601String(),
                    'rejected_at' => $gig->rejected_at?->toIso8601String(),
                    'created_at' => $gig->created_at?->toIso8601String(),
                    'updated_at' => $gig->updated_at?->toIso8601String(),
                    'seller' => [
                        'name' => $gig->seller?->name,
                        'email' => $gig->seller?->email,
                    ],
                    'category' => $gig->category?->name,
                    'subcategory' => $gig->subcategory?->name,
                    'starting_price' => number_format($startingPrice, 2, '.', ''),
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
            'approval_status' => 'approved',
            'rejection_reason' => null,
            'approved_at' => now(),
            'rejected_at' => null,
        ]);

        return back()->with('success', 'Gig approved successfully.');
    }

    public function reject(Request $request, Gig $gig): RedirectResponse
    {
        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:15', 'max:2000'],
        ]);

        $gig->update([
            'approval_status' => 'rejected',
            'rejection_reason' => $data['rejection_reason'],
            'approved_at' => null,
            'rejected_at' => now(),
        ]);

        return back()->with('success', 'Gig rejected with reason.');
    }
}
