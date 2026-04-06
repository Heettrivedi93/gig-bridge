<?php

namespace App\Http\Controllers;

use App\Models\Gig;
use App\Models\GigPackage;
use App\Models\Order;
use App\Services\PaypalCheckoutService;
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
    public function __construct(private readonly PaypalCheckoutService $paypal)
    {
    }

    public function index(Request $request): Response
    {
        $buyer = $this->ensureBuyer($request);

        return Inertia::render('buyer/orders/index', [
            'orders' => Order::query()
                ->with(['gig:id,title', 'package:id,gig_id,tier,title,delivery_days', 'seller:id,name'])
                ->where('buyer_id', $buyer->id)
                ->latest('id')
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'gig_title' => $order->gig?->title,
                    'package_title' => $order->package?->title,
                    'package_tier' => $order->package?->tier,
                    'seller_name' => $order->seller?->name,
                    'quantity' => $order->quantity,
                    'requirements' => $order->requirements,
                    'reference_link' => $order->reference_link,
                    'style_notes' => $order->style_notes,
                    'coupon_code' => $order->coupon_code,
                    'brief_file_url' => $order->brief_file_path ? Storage::disk('public')->url($order->brief_file_path) : null,
                    'price' => (string) $order->price,
                    'unit_price' => (string) $order->unit_price,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'paypal_order_id' => $order->paypal_order_id,
                    'created_at' => $order->created_at?->toIso8601String(),
                ]),
            'paypal' => $this->paypal->publicConfig(),
        ]);
    }

    public function payments(Request $request): Response
    {
        $buyer = $this->ensureBuyer($request);

        return Inertia::render('buyer/payments/index', [
            'payments' => Order::query()
                ->with(['gig:id,title', 'package:id,gig_id,tier,title,delivery_days,revision_count', 'seller:id,name,email'])
                ->where('buyer_id', $buyer->id)
                ->whereNotNull('paypal_order_id')
                ->latest('updated_at')
                ->latest('id')
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'invoice_number' => 'INV-ORDER-'.$order->id,
                    'provider' => 'PAYPAL',
                    'provider_order_id' => $order->paypal_order_id,
                    'provider_reference' => $order->paypal_payer_id,
                    'amount' => (string) $order->price,
                    'currency' => 'USD',
                    'status' => $order->payment_status,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'paid_at' => $order->updated_at?->toIso8601String(),
                    'gig' => [
                        'title' => $order->gig?->title,
                    ],
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

    public function store(Request $request, Gig $gig): RedirectResponse
    {
        $buyer = $this->ensureBuyer($request);

        abort_unless($gig->status === 'active', 404);

        $data = $request->validate([
            'package_id' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1', 'max:20'],
            'requirements' => ['required', 'string', 'max:5000'],
            'brief_file' => ['nullable', 'file', 'max:8192'],
            'reference_link' => ['nullable', 'url', 'max:2000'],
            'style_notes' => ['nullable', 'string', 'max:2000'],
            'coupon_code' => ['nullable', 'string', 'max:100'],
            'billing_name' => ['required', 'string', 'max:255'],
            'billing_email' => ['required', 'email', 'max:255'],
        ]);

        $package = GigPackage::query()
            ->where('gig_id', $gig->id)
            ->whereKey($data['package_id'])
            ->firstOrFail();

        $quantity = (int) $data['quantity'];
        $unitPrice = (float) $package->price;

        Order::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $gig->user_id,
            'gig_id' => $gig->id,
            'package_id' => $package->id,
            'quantity' => $quantity,
            'requirements' => $data['requirements'],
            'brief_file_path' => $request->file('brief_file')?->store('order-briefs', 'public'),
            'reference_link' => $data['reference_link'] ?: null,
            'style_notes' => $data['style_notes'] ?: null,
            'coupon_code' => $data['coupon_code'] ?: null,
            'billing_name' => $data['billing_name'],
            'billing_email' => $data['billing_email'],
            'unit_price' => $unitPrice,
            'price' => $unitPrice * $quantity,
            'status' => 'pending',
            'payment_status' => 'pending',
            'escrow_held' => false,
        ]);

        return redirect()
            ->route('buyer.orders.index')
            ->with('success', 'Order created successfully. Continue to PayPal from your buyer orders list.');
    }

    public function createPaypalOrder(Request $request, Order $order): JsonResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        $config = $this->paypal->config();

        if (! $config['enabled']) {
            throw ValidationException::withMessages([
                'paypal' => 'PayPal is not configured by the super admin yet.',
            ]);
        }

        if ($order->payment_status === 'paid') {
            throw ValidationException::withMessages([
                'paypal' => 'This order has already been paid.',
            ]);
        }

        if ($order->status !== 'pending' || $order->payment_status !== 'pending') {
            throw ValidationException::withMessages([
                'paypal' => 'Only pending orders can continue to payment.',
            ]);
        }

        try {
            $payload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'custom_id' => sprintf('order:%d:buyer:%d', $order->id, $buyer->id),
                    'description' => sprintf('Order #%d for %s', $order->id, $order->gig?->title ?? 'gig'),
                    'amount' => [
                        'currency_code' => $config['currency'],
                        'value' => $this->paypal->formatOrderAmount($order->price, $config['currency']),
                    ],
                ]],
                'payer' => [
                    'name' => [
                        'given_name' => $order->billing_name ?: $buyer->name,
                    ],
                    'email_address' => $order->billing_email ?: $buyer->email,
                ],
            ];

            $response = $this->paypal->createOrder($payload);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'paypal' => $exception->getMessage(),
            ]);
        }

        $order->update([
            'paypal_order_id' => (string) $response['id'],
        ]);

        return response()->json([
            'id' => $response['id'],
        ]);
    }

    public function capturePaypalOrder(Request $request, Order $order): JsonResponse
    {
        $buyer = $this->ensureBuyer($request);
        abort_unless($order->buyer_id === $buyer->id, 403);

        $data = $request->validate([
            'order_id' => ['required', 'string'],
        ]);

        if ($order->payment_status === 'paid') {
            return response()->json([
                'status' => 'COMPLETED',
                'order_id' => $order->id,
            ]);
        }

        if ($order->paypal_order_id !== $data['order_id']) {
            throw ValidationException::withMessages([
                'paypal' => 'We could not match this PayPal order to your buyer order.',
            ]);
        }

        try {
            $capture = $this->paypal->captureOrder($data['order_id']);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'paypal' => $exception->getMessage(),
            ]);
        }

        $captureStatus = strtoupper((string) data_get($capture, 'status', ''));

        if ($captureStatus !== 'COMPLETED') {
            throw ValidationException::withMessages([
                'paypal' => 'PayPal did not complete the capture for this order.',
            ]);
        }

        $order->update([
            'status' => 'active',
            'payment_status' => 'paid',
            'escrow_held' => true,
            'paypal_payer_id' => data_get($capture, 'payer.payer_id'),
        ]);

        return response()->json([
            'status' => 'COMPLETED',
            'order_id' => $order->id,
        ]);
    }

    private function ensureBuyer(Request $request)
    {
        abort_unless($request->user()?->hasRole('buyer'), 403);

        return $request->user();
    }
}
