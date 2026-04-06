<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Services\PaypalCheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SellerPlanController extends Controller
{
    public function __construct(private readonly PaypalCheckoutService $paypal)
    {
    }

    public function index(Request $request): Response
    {
        $seller = $this->ensureSeller($request);
        $activeSubscription = $seller->activeSubscription();

        return Inertia::render('seller/plans/index', [
            'plans' => Plan::query()
                ->where('status', 'active')
                ->orderBy('price')
                ->orderBy('id')
                ->get()
                ->map(fn (Plan $plan) => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'price' => (string) $plan->price,
                    'duration_days' => $plan->duration_days,
                    'gig_limit' => $plan->gig_limit,
                    'features' => $plan->features ?? [],
                    'status' => $plan->status,
                    'is_current' => $activeSubscription?->plan_id === $plan->id,
                ]),
            'currentSubscription' => $activeSubscription ? [
                'plan_name' => $activeSubscription->plan?->name,
                'starts_at' => $activeSubscription->starts_at?->toIso8601String(),
                'ends_at' => $activeSubscription->ends_at?->toIso8601String(),
                'status' => $activeSubscription->status,
            ] : null,
            'paypal' => $this->paypal->publicConfig(),
        ]);
    }

    public function history(Request $request): Response
    {
        $seller = $this->ensureSeller($request);

        $payments = SubscriptionPayment::query()
            ->with(['plan:id,name,duration_days,gig_limit', 'subscription:id,starts_at,ends_at,status'])
            ->where('user_id', $seller->id)
            ->latest('captured_at')
            ->latest('created_at')
            ->get()
            ->map(function (SubscriptionPayment $payment) {
                $invoiceNumber = $payment->provider_capture_id
                    ? 'INV-'.$payment->provider_capture_id
                    : 'INV-'.$payment->provider_order_id;

                return [
                    'id' => $payment->id,
                    'invoice_number' => $invoiceNumber,
                    'provider' => strtoupper($payment->provider),
                    'provider_order_id' => $payment->provider_order_id,
                    'provider_capture_id' => $payment->provider_capture_id,
                    'amount' => (string) $payment->amount,
                    'currency' => $payment->currency,
                    'status' => $payment->status,
                    'created_at' => $payment->created_at?->toIso8601String(),
                    'captured_at' => $payment->captured_at?->toIso8601String(),
                    'plan' => $payment->plan ? [
                        'name' => $payment->plan->name,
                        'duration_days' => $payment->plan->duration_days,
                        'gig_limit' => $payment->plan->gig_limit,
                    ] : null,
                    'subscription' => $payment->subscription ? [
                        'starts_at' => $payment->subscription->starts_at?->toIso8601String(),
                        'ends_at' => $payment->subscription->ends_at?->toIso8601String(),
                        'status' => $payment->subscription->status,
                    ] : null,
                ];
            });

        return Inertia::render('seller/payments/index', [
            'payments' => $payments,
            'seller' => [
                'name' => $seller->name,
                'email' => $seller->email,
            ],
        ]);
    }

    public function activateFree(Request $request, Plan $plan): RedirectResponse
    {
        $seller = $this->ensureSeller($request);

        if ((float) $plan->price > 0 || $plan->status !== 'active') {
            throw ValidationException::withMessages([
                'plan' => 'Only active free plans can be activated without payment.',
            ]);
        }

        $this->activatePlan($seller, $plan, null);

        return back()->with('success', sprintf('%s plan activated successfully.', $plan->name));
    }

    public function createPaypalOrder(Request $request, Plan $plan): JsonResponse
    {
        $seller = $this->ensureSeller($request);
        $config = $this->paypal->config();

        if (! $config['enabled']) {
            throw ValidationException::withMessages([
                'paypal' => 'PayPal is not configured by the super admin yet.',
            ]);
        }

        if ($plan->status !== 'active' || (float) $plan->price <= 0) {
            throw ValidationException::withMessages([
                'plan' => 'This plan is not available for PayPal checkout.',
            ]);
        }

        try {
            $payload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'custom_id' => sprintf('subscription:%d:user:%d', $plan->id, $seller->id),
                    'description' => sprintf('%s seller subscription', $plan->name),
                    'amount' => [
                        'currency_code' => $config['currency'],
                        'value' => $this->paypal->formatOrderAmount($plan->price, $config['currency']),
                    ],
                ]],
            ];

            $response = $this->paypal->createOrder($payload);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'paypal' => $exception->getMessage(),
            ]);
        }

        SubscriptionPayment::updateOrCreate(
            ['provider_order_id' => (string) $response['id']],
            [
                'user_id' => $seller->id,
                'plan_id' => $plan->id,
                'provider' => 'paypal',
                'amount' => $plan->price,
                'currency' => $config['currency'],
                'status' => strtolower((string) ($response['status'] ?? 'created')),
                'payload' => $response,
            ],
        );

        return response()->json([
            'id' => $response['id'],
        ]);
    }

    public function capturePaypalOrder(Request $request, Plan $plan): JsonResponse
    {
        $seller = $this->ensureSeller($request);
        $data = $request->validate([
            'order_id' => ['required', 'string'],
        ]);

        $payment = SubscriptionPayment::query()
            ->where('provider_order_id', $data['order_id'])
            ->where('user_id', $seller->id)
            ->where('plan_id', $plan->id)
            ->first();

        if (! $payment) {
            throw ValidationException::withMessages([
                'paypal' => 'We could not find the PayPal order for this plan.',
            ]);
        }

        if ($payment->status === 'completed' && $payment->subscription_id) {
            return response()->json([
                'status' => 'COMPLETED',
                'subscription_id' => $payment->subscription_id,
            ]);
        }

        try {
            $capture = $this->paypal->captureOrder($data['order_id']);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'paypal' => $exception->getMessage(),
            ]);
        }

        $captureId = data_get($capture, 'purchase_units.0.payments.captures.0.id');
        $captureStatus = strtoupper((string) data_get($capture, 'status', ''));

        if ($captureStatus !== 'COMPLETED') {
            throw ValidationException::withMessages([
                'paypal' => 'PayPal did not complete the capture for this order.',
            ]);
        }

        $subscription = DB::transaction(function () use ($seller, $plan, $payment, $capture, $captureId) {
            $subscription = $this->activatePlan($seller, $plan, $payment);

            $payment->update([
                'subscription_id' => $subscription->id,
                'provider_capture_id' => $captureId,
                'status' => 'completed',
                'payload' => $capture,
                'captured_at' => now(),
            ]);

            return $subscription;
        });

        return response()->json([
            'status' => 'COMPLETED',
            'subscription_id' => $subscription->id,
        ]);
    }

    private function ensureSeller(Request $request): User
    {
        abort_unless($request->user()?->hasRole('seller'), 403);

        return $request->user();
    }

    private function activatePlan(User $seller, Plan $plan, ?SubscriptionPayment $payment): Subscription
    {
        $current = $seller->activeSubscription();
        $now = now();
        $startsAt = $current && $current->ends_at && $current->ends_at->isFuture()
            ? $current->ends_at->copy()
            : $now->copy();
        $endsAt = $startsAt->copy()->addDays($plan->duration_days);

        if ($current) {
            $current->update([
                'status' => 'replaced',
                'ends_at' => $startsAt,
            ]);
        }

        $subscription = Subscription::create([
            'user_id' => $seller->id,
            'plan_id' => $plan->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => 'active',
        ]);

        if ($payment) {
            $payment->subscription_id = $subscription->id;
            $payment->save();
        }

        return $subscription;
    }
}
