<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Services\OrderFundService;
use App\Services\SystemNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminOrderController extends Controller
{
    public function __construct(
        private readonly OrderFundService $funds,
        private readonly SystemNotificationService $notifications,
    ) {}

    public function index(): Response
    {
        $platformFeePercentage = (float) Setting::getValue('payment_platform_fee_percentage', 10);

        $orders = Order::query()
            ->with([
                'buyer:id,name,email',
                'seller:id,name,email',
                'gig:id,title',
                'package:id,gig_id,tier,title,delivery_days,revision_count',
                'deliveries.user:id,name',
                'revisions.requester:id,name',
                'cancellations',
            ])
            ->latest('updated_at')
            ->latest('id')
            ->get();

        $grossVolume = $orders
            ->whereIn('payment_status', ['paid', 'released'])
            ->sum(fn (Order $order) => (float) $order->price);

        $platformRevenue = round($grossVolume * ($platformFeePercentage / 100), 2);
        $sellerNet = round($grossVolume - $platformRevenue, 2);

        return Inertia::render('admin/orders/index', [
            'stats' => [
                [
                    'label' => 'Total Orders',
                    'value' => $orders->count(),
                    'detail' => sprintf('%d completed', $orders->where('status', 'completed')->count()),
                ],
                [
                    'label' => 'Open Orders',
                    'value' => $orders->whereIn('status', ['pending', 'active', 'delivered'])->count(),
                    'detail' => sprintf('%d delivered awaiting action', $orders->where('status', 'delivered')->count()),
                ],
                [
                    'label' => 'Gross Volume',
                    'value' => number_format($grossVolume, 2, '.', ''),
                    'detail' => sprintf('Fee %.2f%%', $platformFeePercentage),
                ],
                [
                    'label' => 'Platform Revenue',
                    'value' => number_format($platformRevenue, 2, '.', ''),
                    'detail' => sprintf('Seller net %s', number_format($sellerNet, 2, '.', '')),
                ],
            ],
            'orders' => $orders->map(function (Order $order) use ($platformFeePercentage) {
                $price = (float) $order->price;
                $platformFee = round($price * ($platformFeePercentage / 100), 2);

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
                    'seller' => $order->seller ? [
                        'name' => $order->seller->name,
                        'email' => $order->seller->email,
                    ] : null,
                    'quantity' => $order->quantity,
                    'requirements' => $order->requirements,
                    'reference_link' => $order->reference_link,
                    'style_notes' => $order->style_notes,
                    'coupon_code' => $order->coupon_code,
                    'brief_file_url' => $order->brief_file_path ? Storage::disk('public')->url($order->brief_file_path) : null,
                    'price' => (string) $order->price,
                    'platform_fee' => number_format($platformFee, 2, '.', ''),
                    'seller_net' => number_format($price - $platformFee, 2, '.', ''),
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'fund_status' => $order->fund_status,
                    'escrow_held' => $order->escrow_held,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'delivered_at' => $order->delivered_at?->toIso8601String(),
                    'completed_at' => $order->completed_at?->toIso8601String(),
                    'cancelled_at' => $order->cancelled_at?->toIso8601String(),
                    'funds_released_at' => $order->funds_released_at?->toIso8601String(),
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
            })->values(),
            'statusOptions' => ['pending', 'active', 'delivered', 'completed', 'cancelled'],
            'paymentStatusOptions' => ['pending', 'paid', 'released', 'refunded', 'failed'],
            'platformFeePercentage' => $platformFeePercentage,
        ]);
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'active', 'delivered', 'completed', 'cancelled'])],
            'payment_status' => ['required', Rule::in(['pending', 'paid', 'released', 'refunded', 'failed'])],
            'escrow_held' => ['required', 'boolean'],
            'delivered_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
            'cancelled_at' => ['nullable', 'date'],
        ]);

        $order->update($data);

        return back()->with('success', sprintf('Order #%d updated successfully.', $order->id));
    }

    public function releaseFunds(Request $request, Order $order): RedirectResponse
    {
        $this->funds->releaseToSeller($order, $request->user());
        $this->notifications->paymentReleased($order->fresh());

        return back()->with('success', sprintf('Funds released for order #%d.', $order->id));
    }
}
