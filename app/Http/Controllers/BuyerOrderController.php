<?php

namespace App\Http\Controllers;

use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Models\Review;
use App\Models\Setting;
use App\Services\CouponService;
use App\Services\OrderFundService;
use App\Services\PaypalCheckoutService;
use App\Services\SellerRankingService;
use App\Services\SystemNotificationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class BuyerOrderController extends Controller
{
    public function __construct(
        private readonly PaypalCheckoutService $paypal,
        private readonly CouponService $coupons,
        private readonly OrderFundService $funds,
        private readonly SystemNotificationService $notifications,
        private readonly SellerRankingService $sellerRanking,
    ) {}

    public function index(Request $request): Response
    {
        $buyer = $this->ensureBuyer($request);

        return Inertia::render('buyer/orders/index', [
            'orders' => Order::query()
                ->with([
                    'gig:id,title',
                    'package:id,gig_id,tier,title,delivery_days,revision_count',
                    'seller:id,name,email',
                    'deliveries.user:id,name',
                    'revisions.requester:id,name',
                    'cancellations',
                    'review',
                    'disputes',
                ])
                ->where('buyer_id', $buyer->id)
                ->latest('updated_at')
                ->latest('id')
                ->get()
                ->map(function (Order $order) {
                    $usedRevisions = $order->revisions->count();
                    $allowedRevisions = (int) ($order->package?->revision_count ?? 0);

                    return [
                        'id' => $order->id,
                        'gig_title' => $order->gig?->title,
                        'package' => $order->package ? [
                            'title' => $order->package->title,
                            'tier' => $order->package->tier,
                            'delivery_days' => $order->package->delivery_days,
                            'revision_count' => $order->package->revision_count,
                        ] : null,
                        'seller' => $order->seller ? [
                            'id' => $order->seller->id,
                            'name' => $order->seller->name,
                            'email' => $order->seller->email,
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
                        'unit_price' => (string) $order->unit_price,
                        'status' => $order->status,
                        'payment_status' => $order->payment_status,
                        'paypal_order_id' => $order->paypal_order_id,
                        'created_at' => $order->created_at?->toIso8601String(),
                        'delivered_at' => $order->delivered_at?->toIso8601String(),
                        'due_at' => $order->due_at?->toIso8601String(),
                        'completed_at' => $order->completed_at?->toIso8601String(),
                        'cancelled_at' => $order->cancelled_at?->toIso8601String(),
                        'used_revisions' => $usedRevisions,
                        'remaining_revisions' => max(0, $allowedRevisions - $usedRevisions),
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
                        'review' => $order->review ? [
                            'id' => $order->review->id,
                            'rating' => $order->review->rating,
                            'comment' => $order->review->comment,
                            'created_at' => $order->review->created_at?->toIso8601String(),
                        ] : null,
                        'open_dispute_id' => $order->disputes->where('status', 'open')->first()?->id,
                    ];
                }),
            'paypal' => $this->paypal->publicConfig(),
            'refund_policy' => (string) \App\Models\Setting::getValue('payment_refund_policy_text', ''),
        ]);
    }

    public function payments(Request $request): Response
    {
        $buyer = $this->ensureBuyer($request);

        $orders = Order::query()
            ->with(['gig:id,title', 'package:id,gig_id,tier,title,delivery_days,revision_count', 'seller:id,name,email'])
            ->where('buyer_id', $buyer->id)
            ->whereNotNull('paypal_order_id')
            ->whereIn('payment_status', ['paid', 'released', 'refunded'])
            ->latest('updated_at')
            ->latest('id')
            ->get();

        $totalSpent = number_format(
            $orders->sum(fn (Order $o) => max(0, (float) $o->price - (float) ($o->refunded_amount ?? 0))),
            2, '.', ''
        );

        return Inertia::render('buyer/payments/index', [
            'total_spent' => $totalSpent,
            'payments' => $orders->map(fn (Order $order) => [
                'id' => $order->id,
                'invoice_number' => 'INV-ORDER-'.$order->id,
                'provider' => 'PAYPAL',
                'provider_order_id' => $order->paypal_order_id,
                'provider_reference' => $order->paypal_payer_id,
                'amount' => number_format((float) $order->price, 2, '.', ''),
                'refunded_amount' => number_format((float) ($order->refunded_amount ?? 0), 2, '.', ''),
                'net_amount' => number_format(max(0, (float) $order->price - (float) ($order->refunded_amount ?? 0)), 2, '.', ''),
                'subtotal_amount' => number_format((float) $order->subtotal_amount, 2, '.', ''),
                'discount_amount' => number_format((float) $order->discount_amount, 2, '.', ''),
                'coupon_code' => $order->coupon_code,
                'currency' => 'USD',
                'status' => $order->payment_status,
                'created_at' => $order->created_at?->toIso8601String(),
                'paid_at' => $order->updated_at?->toIso8601String(),
                'gig' => ['title' => $order->gig?->title],
                'package' => $order->package ? [
                    'title' => $order->package->title,
                    'tier' => $order->package->tier,
                    'delivery_days' => $order->package->delivery_days,
                    'revision_count' => $order->package->revision_count,
                ] : null,
                'seller' => $order->seller ? [
                    'name' => $order->seller->name,
                    'email' => $order->seller->email,
                ] : null,
                'billing' => [
                    'name' => $order->billing_name,
                    'email' => $order->billing_email,
                ],
            ]),
            'buyer' => [
                'name' => $buyer->name,
                'email' => $buyer->email,
            ],
        ]);
    }

    public function downloadInvoicePdf(Request $request, Order $order)
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        $order->load(['gig:id,title', 'package:id,title,tier,delivery_days,revision_count', 'seller:id,name,email']);

        abort_unless($order->paypal_order_id !== null, 404);

        $invoiceNumber = 'INV-ORDER-'.$order->id;

        $pdf = Pdf::loadView('invoices.buyer-order-payment', [
            'invoiceNumber' => $invoiceNumber,
            'buyer' => $buyer,
            'order' => $order,
            'generatedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download(sprintf('buyer-invoice-%s.pdf', strtolower($invoiceNumber)));
    }

    public function downloadRefundReceipt(Request $request, Order $order)
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);
        abort_unless($order->payment_status === 'refunded', 404);

        $order->load([
            'gig:id,title',
            'package:id,title,tier',
            'seller:id,name,email',
            'cancellations',
        ]);

        $invoiceNumber   = 'INV-ORDER-'.$order->id;
        $receiptNumber   = 'REF-ORDER-'.$order->id;
        $cancellation    = $order->cancellations->first();
        $refundReason    = $cancellation?->reason ?? 'Order cancelled';
        $cancelledBy     = $cancellation?->cancelled_by ?? 'system';
        $siteName        = (string) \App\Models\Setting::getValue('brand_site_name', 'GigBridge') ?: 'GigBridge';
        $contactEmail    = (string) \App\Models\Setting::getValue('brand_contact_email', '');

        $pdf = Pdf::loadView('invoices.buyer-refund-receipt', [
            'receiptNumber'  => $receiptNumber,
            'invoiceNumber'  => $invoiceNumber,
            'buyer'          => $buyer,
            'order'          => $order,
            'refundReason'   => $refundReason,
            'cancelledBy'    => $cancelledBy,
            'siteName'       => $siteName,
            'contactEmail'   => $contactEmail,
            'generatedAt'    => now(),
        ])->setPaper('a4');

        return $pdf->download(sprintf('refund-receipt-%s.pdf', strtolower($receiptNumber)));
    }

    /**
     * Validate form + calculate price + create a PayPal order via API.
     * No DB write — safe to call even if user abandons checkout.
     */
    public function preparePaypalOrder(Request $request, Gig $gig): JsonResponse
    {
        $buyer = $this->ensureBuyer($request);

        abort_unless($gig->status === 'active', 404);
        $gig->loadMissing('seller:id,is_available');

        if (! ($gig->seller?->is_available ?? false)) {
            throw ValidationException::withMessages([
                'order' => 'This seller is currently unavailable and not accepting new orders.',
            ]);
        }

        $config = $this->paypal->config();
        if (! $config['enabled']) {
            throw ValidationException::withMessages([
                'paypal' => 'PayPal is not configured by the super admin yet.',
            ]);
        }

        $data = $request->validate([
            'package_id'   => ['required', 'integer'],
            'quantity'     => ['required', 'integer', 'min:1', 'max:20'],
            'coupon_code'  => ['nullable', 'string', 'max:100'],
            'billing_name' => ['required', 'string', 'max:255'],
            'billing_email'=> ['required', 'email', 'max:255'],
        ]);

        $package = GigPackage::query()
            ->where('gig_id', $gig->id)
            ->whereKey($data['package_id'])
            ->firstOrFail();

        $quantity      = (int) $data['quantity'];
        $unitPrice     = (float) $package->price;
        $subtotal      = round($unitPrice * $quantity, 2);
        $coupon        = $this->coupons->validateForSubtotal($data['coupon_code'] ?? null, $subtotal, $buyer->id);
        $discountAmount= (float) $coupon['discount_amount'];
        $finalPrice    = round(max(0, $subtotal - $discountAmount), 2);

        try {
            $response = $this->paypal->createOrder([
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'custom_id'   => sprintf('gig:%d:buyer:%d', $gig->id, $buyer->id),
                    'description' => sprintf('Order for %s', $gig->title),
                    'amount'      => [
                        'currency_code' => $config['currency'],
                        'value'         => $this->paypal->formatOrderAmount($finalPrice, $config['currency']),
                    ],
                ]],
                'payer' => [
                    'name'          => ['given_name' => $data['billing_name']],
                    'email_address' => $data['billing_email'],
                ],
            ]);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['paypal' => $exception->getMessage()]);
        }

        return response()->json(['paypal_order_id' => $response['id']]);
    }

    public function store(Request $request, Gig $gig): JsonResponse
    {
        $buyer = $this->ensureBuyer($request);

        abort_unless($gig->status === 'active', 404);
        $gig->loadMissing('seller:id,is_available');

        if (! ($gig->seller?->is_available ?? false)) {
            throw ValidationException::withMessages([
                'order' => 'This seller is currently unavailable and not accepting new orders.',
            ]);
        }

        $data = $request->validate([
            'package_id'      => ['required', 'integer'],
            'quantity'        => ['required', 'integer', 'min:1', 'max:20'],
            'requirements'    => ['required', 'string', 'max:5000'],
            'brief_file'      => ['nullable', 'file', 'max:8192'],
            'reference_link'  => ['nullable', 'url', 'max:2000'],
            'style_notes'     => ['nullable', 'string', 'max:2000'],
            'coupon_code'     => ['nullable', 'string', 'max:100'],
            'billing_name'    => ['required', 'string', 'max:255'],
            'billing_email'   => ['required', 'email', 'max:255'],
            'paypal_order_id' => ['nullable', 'string'],
        ]);

        $package = GigPackage::query()
            ->where('gig_id', $gig->id)
            ->whereKey($data['package_id'])
            ->firstOrFail();

        $quantity       = (int) $data['quantity'];
        $unitPrice      = (float) $package->price;
        $subtotal       = round($unitPrice * $quantity, 2);
        $coupon         = $this->coupons->validateForSubtotal($data['coupon_code'] ?? null, $subtotal, $buyer->id);
        $discountAmount = (float) $coupon['discount_amount'];
        $finalPrice     = round(max(0, $subtotal - $discountAmount), 2);

        $paypalOrderId = ($data['paypal_order_id'] ?? '') ?: null;

        // If paypal_order_id provided — capture payment first, create active order
        if ($paypalOrderId !== null) {
            try {
                $capture = $this->paypal->captureOrder($paypalOrderId);
            } catch (RuntimeException $exception) {
                throw ValidationException::withMessages(['paypal' => $exception->getMessage()]);
            }

            if (strtoupper((string) data_get($capture, 'status', '')) !== 'COMPLETED') {
                throw ValidationException::withMessages(['paypal' => 'PayPal did not complete the capture.']);
            }

            $platformFeePercentage = (float) Setting::getValue('payment_platform_fee_percentage', 10);
            $platformFeeAmount     = round($finalPrice * ($platformFeePercentage / 100), 2);
            $sellerNetAmount       = round($finalPrice - $platformFeeAmount, 2);

            $order = Order::create([
                'buyer_id'                => $buyer->id,
                'seller_id'               => $gig->user_id,
                'gig_id'                  => $gig->id,
                'package_id'              => $package->id,
                'coupon_id'               => $coupon['coupon']?->id,
                'quantity'                => $quantity,
                'requirements'            => $data['requirements'],
                'brief_file_path'         => $request->file('brief_file')?->store('order-briefs', 'public'),
                'reference_link'          => ($data['reference_link'] ?? '') ?: null,
                'style_notes'             => ($data['style_notes'] ?? '') ?: null,
                'coupon_code'             => $coupon['code'],
                'billing_name'            => $data['billing_name'],
                'billing_email'           => $data['billing_email'],
                'unit_price'              => $unitPrice,
                'subtotal_amount'         => $subtotal,
                'discount_amount'         => $discountAmount,
                'price'                   => $finalPrice,
                'gross_amount'            => $finalPrice,
                'platform_fee_percentage' => $platformFeePercentage,
                'platform_fee_amount'     => $platformFeeAmount,
                'seller_net_amount'       => $sellerNetAmount,
                'status'                  => 'active',
                'payment_status'          => 'paid',
                'fund_status'             => 'escrow',
                'escrow_held'             => true,
                'paypal_order_id'         => $paypalOrderId,
                'paypal_payer_id'         => data_get($capture, 'payer.payer_id'),
                'due_at'                  => now()->addDays((int) ($package->delivery_days ?? 0)),
            ]);

            $this->coupons->markUsed($coupon['coupon'], $buyer->id, $order);
            $this->notifications->orderPlaced($order);
            $this->funds->holdEscrow($order);

            return response()->json(['order_id' => $order->id, 'status' => 'active'], 201);
        }

        // No paypal_order_id — user abandoned checkout, save as pending so they can pay later
        $order = Order::create([
            'buyer_id'        => $buyer->id,
            'seller_id'       => $gig->user_id,
            'gig_id'          => $gig->id,
            'package_id'      => $package->id,
            'coupon_id'       => $coupon['coupon']?->id,
            'quantity'        => $quantity,
            'requirements'    => $data['requirements'],
            'brief_file_path' => $request->file('brief_file')?->store('order-briefs', 'public'),
            'reference_link'  => ($data['reference_link'] ?? '') ?: null,
            'style_notes'     => ($data['style_notes'] ?? '') ?: null,
            'coupon_code'     => $coupon['code'],
            'billing_name'    => $data['billing_name'],
            'billing_email'   => $data['billing_email'],
            'unit_price'      => $unitPrice,
            'subtotal_amount' => $subtotal,
            'discount_amount' => $discountAmount,
            'price'           => $finalPrice,
            'gross_amount'    => $finalPrice,
            'status'          => 'pending',
            'payment_status'  => 'pending',
            'fund_status'     => 'none',
            'escrow_held'     => false,
        ]);

        return response()->json(['order_id' => $order->id, 'status' => 'pending'], 201);
    }

    /**
     * Re-pay an existing pending order from the orders list.
     */
    public function createPaypalOrder(Request $request, Order $order): JsonResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        $config = $this->paypal->config();
        if (! $config['enabled']) {
            throw ValidationException::withMessages(['paypal' => 'PayPal is not configured by the super admin yet.']);
        }

        if ($order->payment_status === 'paid') {
            throw ValidationException::withMessages(['paypal' => 'This order has already been paid.']);
        }

        if ($order->status !== 'pending' || $order->payment_status !== 'pending') {
            throw ValidationException::withMessages(['paypal' => 'Only pending orders can continue to payment.']);
        }

        try {
            $response = $this->paypal->createOrder([
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'custom_id'   => sprintf('order:%d:buyer:%d', $order->id, $buyer->id),
                    'description' => sprintf('Order #%d for %s', $order->id, $order->gig?->title ?? 'gig'),
                    'amount'      => [
                        'currency_code' => $config['currency'],
                        'value'         => $this->paypal->formatOrderAmount($order->price, $config['currency']),
                    ],
                ]],
                'payer' => [
                    'name'          => ['given_name' => $order->billing_name ?: $buyer->name],
                    'email_address' => $order->billing_email ?: $buyer->email,
                ],
            ]);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['paypal' => $exception->getMessage()]);
        }

        $order->update(['paypal_order_id' => (string) $response['id']]);

        return response()->json(['id' => $response['id']]);
    }

    public function capturePaypalOrder(Request $request, Order $order): JsonResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        $data = $request->validate(['order_id' => ['required', 'string']]);

        if ($order->payment_status === 'paid') {
            return response()->json(['status' => 'COMPLETED', 'order_id' => $order->id]);
        }

        if ($order->paypal_order_id !== $data['order_id']) {
            throw ValidationException::withMessages(['paypal' => 'We could not match this PayPal order to your buyer order.']);
        }

        try {
            $capture = $this->paypal->captureOrder($data['order_id']);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['paypal' => $exception->getMessage()]);
        }

        if (strtoupper((string) data_get($capture, 'status', '')) !== 'COMPLETED') {
            throw ValidationException::withMessages(['paypal' => 'PayPal did not complete the capture for this order.']);
        }

        $platformFeePercentage = (float) Setting::getValue('payment_platform_fee_percentage', 10);
        $grossAmount           = (float) $order->price;
        $platformFeeAmount     = round($grossAmount * ($platformFeePercentage / 100), 2);
        $sellerNetAmount       = round($grossAmount - $platformFeeAmount, 2);

        $order->update([
            'status'                  => 'active',
            'payment_status'          => 'paid',
            'fund_status'             => 'escrow',
            'escrow_held'             => true,
            'gross_amount'            => $grossAmount,
            'platform_fee_percentage' => $platformFeePercentage,
            'platform_fee_amount'     => $platformFeeAmount,
            'seller_net_amount'       => $sellerNetAmount,
            'paypal_payer_id'         => data_get($capture, 'payer.payer_id'),
            'due_at'                  => now()->addDays((int) ($order->package?->delivery_days ?? 0)),
        ]);

        $this->coupons->markUsed($order->coupon, $buyer->id, $order->fresh());
        $this->notifications->orderPlaced($order->fresh());
        $this->funds->holdEscrow($order->fresh());

        return response()->json(['status' => 'COMPLETED', 'order_id' => $order->id]);
    }

    public function requestRevision(Request $request, Order $order): RedirectResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        $order->loadMissing('package');

        if ($order->status !== 'delivered' || $order->payment_status !== 'paid') {
            throw ValidationException::withMessages([
                'revision_note' => 'Only delivered paid orders can receive revision requests.',
            ]);
        }

        $allowedRevisions = max(0, (int) ($order->package?->revision_count ?? 0));
        $usedRevisions = $order->revisions()->count();
        $remainingRevisions = $allowedRevisions - $usedRevisions;

        if ($remainingRevisions <= 0) {
            throw ValidationException::withMessages([
                'revision_note' => 'This order has already used all included revisions.',
            ]);
        }

        $data = $request->validate([
            'revision_note' => ['required', 'string', 'max:3000'],
        ]);

        $order->revisions()->create([
            'requested_by' => $buyer->id,
            'note' => $data['revision_note'],
        ]);

        $order->update([
            'status' => 'active',
        ]);

        $this->notifications->revisionRequested($order->fresh());

        return back()->with('success', 'Revision request submitted successfully.');
    }

    public function complete(Request $request, Order $order): RedirectResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        if ($order->status !== 'delivered' || $order->payment_status !== 'paid') {
            throw ValidationException::withMessages([
                'order' => 'Only delivered paid orders can be completed.',
            ]);
        }

        $order->update([
            'status' => 'completed',
            'escrow_held' => true,
            'completed_at' => now(),
        ]);
        $freshOrder = $order->fresh();

        if ($freshOrder->fund_status === 'escrow') {
            $this->funds->markReleasable($freshOrder);
        } else {
            $freshOrder->update([
                'fund_status' => 'releasable',
            ]);
        }

        $this->notifications->orderCompleted($freshOrder->fresh());
        $this->sellerRanking->recalculate($freshOrder->seller()->firstOrFail());

        return back()->with('success', 'Order marked as completed.');
    }

    public function review(Request $request, Order $order): RedirectResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        if (
            $order->status !== 'completed'
            || ! in_array($order->payment_status, ['paid', 'released'], true)
        ) {
            throw ValidationException::withMessages([
                'rating' => 'Only completed paid or released orders can be reviewed.',
            ]);
        }

        if ($order->review()->exists()) {
            throw ValidationException::withMessages([
                'rating' => 'A review has already been submitted for this order.',
            ]);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'max:3000'],
        ]);

        Review::create([
            'order_id'  => $order->id,
            'gig_id'    => $order->gig_id,
            'buyer_id'  => $buyer->id,
            'seller_id' => $order->seller_id,
            'rating'    => $data['rating'],
            'comment'   => $data['comment'],
        ]);

        $this->notifications->reviewReceived($order->fresh(), (int) $data['rating']);
        $this->sellerRanking->recalculate($order->seller()->firstOrFail());

        return back()->with('success', 'Review submitted successfully.');
    }

    public function cancel(Request $request, Order $order): RedirectResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        if (! in_array($order->status, ['pending', 'active'], true)) {
            throw ValidationException::withMessages([
                'cancellation_reason' => 'Only pending or active orders can be cancelled. Use revision or dispute for delivered orders.',
            ]);
        }

        $data = $request->validate([
            'cancellation_reason' => ['required', 'string', 'max:3000'],
        ]);

        $wasPaid = $order->payment_status === 'paid';

        $order->cancellations()->create([
            'cancelled_by' => 'buyer',
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

        $this->notifications->orderCancelledByBuyer($order->fresh());
        $this->sellerRanking->recalculate($order->seller()->firstOrFail());

        return back()->with('success', 'Order cancelled successfully.');
    }

    private function ensureBuyer(Request $request)
    {
        abort_unless($request->user()?->hasRole('buyer'), 403);

        return $request->user();
    }
}
