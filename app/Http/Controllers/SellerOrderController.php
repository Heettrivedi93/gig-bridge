<?php

namespace App\Http\Controllers;

use App\Exports\SellerOrdersExport;
use App\Models\Order;
use App\Services\OrderFundService;
use App\Services\SellerRankingService;
use App\Services\SystemNotificationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SellerOrderController extends Controller
{
    public function __construct(
        private readonly OrderFundService $funds,
        private readonly SystemNotificationService $notifications,
        private readonly SellerRankingService $sellerRanking,
    ) {}

    public function index(Request $request): Response
    {
        $seller = $this->ensureSeller($request);

        return Inertia::render('seller/orders/index', [
            'orders' => $this->sellerOrdersQuery($seller->id)
                ->latest('updated_at')
                ->latest('id')
                ->get()
                ->map(fn (Order $order) => $this->orderPayload($order)),
        ]);
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        $seller = $this->ensureSeller($request);
        $orders = $this->sellerOrdersQuery($seller->id)
            ->latest('updated_at')
            ->latest('id')
            ->get();

        return Excel::download(
            new SellerOrdersExport($orders),
            sprintf('seller-orders-%s.xlsx', now()->format('Y-m-d-H-i')),
        );
    }

    public function exportPdf(Request $request)
    {
        $seller = $this->ensureSeller($request);
        $orders = $this->sellerOrdersQuery($seller->id)
            ->latest('updated_at')
            ->latest('id')
            ->get();

        $summary = [
            'total_orders' => $orders->count(),
            'active_orders' => $orders->where('status', 'active')->count(),
            'delivered_orders' => $orders->where('status', 'delivered')->count(),
            'completed_orders' => $orders->where('status', 'completed')->count(),
            'cancelled_orders' => $orders->where('status', 'cancelled')->count(),
            'gross_sales' => (float) $orders->sum(fn (Order $order) => (float) $order->price),
            'seller_net' => (float) $orders->sum(fn (Order $order) => (float) $order->seller_net_amount),
        ];

        $pdf = Pdf::loadView('exports.seller-orders-pdf', [
            'seller' => $seller,
            'orders' => $orders,
            'summary' => $summary,
            'generatedAt' => now(),
        ])->setPaper('a4', 'landscape');

        return $pdf->download(
            sprintf('seller-orders-%s.pdf', now()->format('Y-m-d-H-i')),
        );
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
        $this->sellerRanking->recalculate($seller);

        return back()->with('success', 'Order delivered successfully.');
    }

    public function cancel(Request $request, Order $order): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        abort_unless($order->seller_id === $seller->id, 403);

        if ($order->status !== 'active') {
            throw ValidationException::withMessages([
                'cancellation_reason' => 'Only active orders can be cancelled. Use revision or dispute for delivered orders.',
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
        $this->sellerRanking->recalculate($seller);

        return back()->with('success', 'Order cancelled successfully.');
    }

    private function ensureSeller(Request $request)
    {
        abort_unless($request->user()?->hasRole('seller'), 403);

        return $request->user();
    }

    private function sellerOrdersQuery(int $sellerId): Builder
    {
        return Order::query()
            ->with([
                'buyer:id,name,email',
                'gig:id,title',
                'package:id,gig_id,tier,title,delivery_days,revision_count',
                'deliveries.user:id,name',
                'revisions.requester:id,name',
                'cancellations',
                'disputes',
            ])
            ->where('seller_id', $sellerId)
            ->whereIn('payment_status', ['paid', 'released', 'refunded']);
    }

    private function orderPayload(Order $order): array
    {
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
                'id' => $order->buyer->id,
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
            'due_at' => $order->due_at?->toIso8601String(),
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
            'open_dispute_id' => $order->disputes->where('status', 'open')->first()?->id,
        ];
    }
}
