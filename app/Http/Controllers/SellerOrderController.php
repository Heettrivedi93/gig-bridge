<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderFundService;
use App\Services\SystemNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SellerOrderController extends Controller
{
    public function __construct(
        private readonly OrderFundService $funds,
        private readonly SystemNotificationService $notifications,
    ) {}

    public function index(Request $request): Response
    {
        $seller = $this->ensureSeller($request);

        return Inertia::render('seller/orders/index', [
            'orders' => Order::query()
                ->with([
                    'buyer:id,name,email',
                    'gig:id,title',
                    'package:id,gig_id,tier,title,delivery_days,revision_count',
                    'deliveries.user:id,name',
                    'revisions.requester:id,name',
                    'cancellations',
                ])
                ->where('seller_id', $seller->id)
                ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                ->latest('updated_at')
                ->latest('id')
                ->get()
                ->map(function (Order $order) {
                    return [
                        'id' => $order->id,
                        'gig_title' => $order->gig?->title,
                        'package' => $order->package ? [
                            'title' => $order->package->title,
                            'tier' => $order->package->tier,
                            'delivery_days' => $order->package->delivery_days,
                            'revision_count' => $order->package->revision_count,
                        ] : null,
                        'buyer' => $order->buyer ? [
                            'name' => $order->buyer->name,
                            'email' => $order->buyer->email,
                        ] : null,
                        'quantity' => $order->quantity,
                        'requirements' => $order->requirements,
                        'reference_link' => $order->reference_link,
                        'style_notes' => $order->style_notes,
                        'coupon_code' => $order->coupon_code,
                        'brief_file_url' => $order->brief_file_path ? Storage::disk('public')->url($order->brief_file_path) : null,
                        'subtotal_amount' => (string) $order->subtotal_amount,
                        'discount_amount' => (string) $order->discount_amount,
                        'price' => (string) $order->price,
                        'status' => $order->status,
                        'payment_status' => $order->payment_status,
                        'delivered_at' => $order->delivered_at?->toIso8601String(),
                        'completed_at' => $order->completed_at?->toIso8601String(),
                        'cancelled_at' => $order->cancelled_at?->toIso8601String(),
                        'deliveries' => $order->deliveries->map(fn ($delivery) => [
                            'id' => $delivery->id,
                            'file_url' => Storage::disk('public')->url($delivery->file_path),
                            'note' => $delivery->note,
                            'delivered_at' => $delivery->delivered_at?->toIso8601String(),
                            'delivered_by' => $delivery->user?->name,
                        ])->values(),
                        'revisions' => $order->revisions->map(fn ($revision) => [
                            'id' => $revision->id,
                            'note' => $revision->note,
                            'requested_by' => $revision->requester?->name,
                            'created_at' => $revision->created_at?->toIso8601String(),
                        ])->values(),
                        'cancellations' => $order->cancellations->map(fn ($cancellation) => [
                            'id' => $cancellation->id,
                            'cancelled_by' => $cancellation->cancelled_by,
                            'reason' => $cancellation->reason,
                            'created_at' => $cancellation->created_at?->toIso8601String(),
                        ])->values(),
                    ];
                }),
        ]);
    }

    public function deliver(Request $request, Order $order): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        abort_unless($order->seller_id === $seller->id, 403);

        if ($order->status !== 'active' || $order->payment_status !== 'paid') {
            throw ValidationException::withMessages([
                'delivery_file' => 'Only active paid orders can be delivered.',
            ]);
        }

        $data = $request->validate([
            'delivery_file' => ['required', 'file', 'max:12288'],
            'delivery_note' => ['nullable', 'string', 'max:3000'],
        ]);

        $order->deliveries()->create([
            'user_id' => $seller->id,
            'file_path' => $request->file('delivery_file')->store('order-deliveries', 'public'),
            'note' => $data['delivery_note'] ?: null,
            'delivered_at' => now(),
        ]);

        $order->update([
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);

        $this->notifications->orderDelivered($order->fresh());

        return back()->with('success', 'Order delivered successfully.');
    }

    public function cancel(Request $request, Order $order): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        abort_unless($order->seller_id === $seller->id, 403);

        if (! in_array($order->status, ['active', 'delivered'], true)) {
            throw ValidationException::withMessages([
                'cancellation_reason' => 'Only active or delivered orders can be cancelled.',
            ]);
        }

        $data = $request->validate([
            'cancellation_reason' => ['required', 'string', 'max:3000'],
        ]);

        $wasPaid = $order->payment_status === 'paid';

        $order->cancellations()->create([
            'cancelled_by' => 'seller',
            'reason' => $data['cancellation_reason'],
        ]);

        $order->update([
            'status' => 'cancelled',
            'payment_status' => $wasPaid ? 'refunded' : $order->payment_status,
            'escrow_held' => false,
            'cancelled_at' => now(),
        ]);

        if ($wasPaid) {
            $this->funds->refundEscrow($order->fresh());
        }

        $this->notifications->orderCancelledBySeller($order->fresh());

        return back()->with('success', 'Order cancelled successfully.');
    }

    private function ensureSeller(Request $request)
    {
        abort_unless($request->user()?->hasRole('seller'), 403);

        return $request->user();
    }
}
