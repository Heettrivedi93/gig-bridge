<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\WithdrawalRequest;
use App\Services\PaypalCheckoutService;
use App\Services\SystemNotificationService;
use App\Services\WalletService;
use Barryvdh\DomPDF\Facade\Pdf;
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
    public function __construct(
        private readonly PaypalCheckoutService $paypal,
        private readonly WalletService $wallets,
        private readonly SystemNotificationService $notifications,
    ) {}

    public function index(Request $request): Response
    {
        $seller = $this->ensureSeller($request);
        $activeSubscription = $seller->activeSubscription() ?? $this->ensureFallbackSubscription($seller);
        $upcomingSubscription = $seller->upcomingSubscription();
        $activeGigCount = $seller->gigs()->where('status', 'active')->count();
        $canActivateNextNow = $activeSubscription
            && $upcomingSubscription
            && $upcomingSubscription->plan
            && $activeSubscription->plan
            && $activeGigCount >= $activeSubscription->plan->gig_limit
            && $upcomingSubscription->plan->gig_limit > $activeSubscription->plan->gig_limit;

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
                    'is_upcoming' => $upcomingSubscription?->plan_id === $plan->id,
                ]),
            'currentSubscription' => $activeSubscription ? [
                'id' => $activeSubscription->id,
                'plan_name' => $activeSubscription->plan?->name,
                'starts_at' => $activeSubscription->starts_at?->toIso8601String(),
                'ends_at' => $activeSubscription->ends_at?->toIso8601String(),
                'status' => $activeSubscription->status,
                'gig_limit' => $activeSubscription->plan?->gig_limit ?? 0,
            ] : null,
            'nextSubscription' => $upcomingSubscription ? [
                'id' => $upcomingSubscription->id,
                'plan_name' => $upcomingSubscription->plan?->name,
                'starts_at' => $upcomingSubscription->starts_at?->toIso8601String(),
                'ends_at' => $upcomingSubscription->ends_at?->toIso8601String(),
                'status' => $upcomingSubscription->status,
                'gig_limit' => $upcomingSubscription->plan?->gig_limit ?? 0,
            ] : null,
            'planActivation' => [
                'active_gig_count' => $activeGigCount,
                'can_activate_next_now' => $canActivateNextNow,
            ],
            'paypal' => $this->paypal->publicConfig(),
        ]);
    }

    public function activateNext(Request $request): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        $current = $seller->activeSubscription();
        $upcoming = $seller->upcomingSubscription();
        $activeGigCount = $seller->gigs()->where('status', 'active')->count();

        if (! $current || ! $upcoming || ! $current->plan || ! $upcoming->plan) {
            throw ValidationException::withMessages([
                'plan' => 'There is no queued plan available to activate.',
            ]);
        }

        $canActivateNow = $activeGigCount >= $current->plan->gig_limit
            && $upcoming->plan->gig_limit > $current->plan->gig_limit;

        if (! $canActivateNow) {
            throw ValidationException::withMessages([
                'plan' => 'Queued plans can only be activated early after the current gig limit is reached and the next plan increases capacity.',
            ]);
        }

        DB::transaction(function () use ($current, $upcoming) {
            $now = now();

            $current->update([
                'status' => 'replaced',
                'ends_at' => $now,
            ]);

            $upcoming->update([
                'starts_at' => $now,
                'ends_at' => $now->copy()->addDays($upcoming->plan->duration_days),
            ]);
        });

        return back()->with('success', sprintf('%s activated successfully.', $upcoming->plan->name));
    }

    public function history(Request $request): Response
    {
        $seller = $this->ensureSeller($request);

        return Inertia::render('seller/payments/index', [
            'payments' => $this->mapPayments($seller),
            'seller' => [
                'name' => $seller->name,
                'email' => $seller->email,
            ],
        ]);
    }

    public function downloadInvoicePdf(Request $request, SubscriptionPayment $payment)
    {
        $seller = $this->ensureSeller($request);
        abort_unless($payment->user_id === $seller->id, 403);

        $payment->load(['plan:id,name,duration_days,gig_limit', 'subscription:id,starts_at,ends_at,status']);

        $invoiceNumber = $payment->provider_capture_id
            ? 'INV-'.$payment->provider_capture_id
            : 'INV-'.$payment->provider_order_id;

        $pdf = Pdf::loadView('invoices.seller-payment', [
            'invoiceNumber' => $invoiceNumber,
            'seller' => $seller,
            'payment' => $payment,
            'generatedAt' => now(),
        ])->setPaper('a4');

        return $pdf->download(sprintf('seller-invoice-%s.pdf', strtolower($invoiceNumber)));
    }

    public function wallet(Request $request): Response
    {
        $seller = $this->ensureSeller($request);
        $wallet = $this->wallets->getOrCreateSellerWallet($seller);

        return Inertia::render('seller/wallet/index', [
            'seller' => [
                'name' => $seller->name,
                'email' => $seller->email,
            ],
            'wallet' => [
                'available_balance' => (string) $wallet->available_balance,
                'pending_balance' => (string) $wallet->pending_balance,
                'escrow_balance' => (string) $wallet->escrow_balance,
                'currency' => $wallet->currency,
            ],
            'revenue' => (function () use ($seller) {
                $orders = Order::query()
                    ->where('seller_id', $seller->id)
                    ->whereIn('payment_status', ['paid', 'released', 'refunded'])
                    ->get(['gross_amount', 'refunded_amount', 'platform_fee_percentage', 'fund_status']);

                $grossSales    = $orders->reduce(fn (float $c, Order $o) => $c + (float) $o->gross_amount, 0.0);
                $totalRefunds  = $orders->reduce(fn (float $c, Order $o) => $c + (float) ($o->refunded_amount ?? 0), 0.0);
                $netSales      = $grossSales - $totalRefunds;
                $platformFees  = $orders->reduce(function (float $c, Order $o) {
                    $net = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
                    return $c + round($net * ((float) $o->platform_fee_percentage / 100), 2);
                }, 0.0);
                $netRevenue    = $orders->reduce(function (float $c, Order $o) {
                    $net = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
                    return $c + round($net * (1 - (float) $o->platform_fee_percentage / 100), 2);
                }, 0.0);
                $pendingRelease = $orders
                    ->whereIn('fund_status', ['escrow', 'releasable'])
                    ->reduce(function (float $c, Order $o) {
                        $net = max(0, (float) $o->gross_amount - (float) ($o->refunded_amount ?? 0));
                        return $c + round($net * (1 - (float) $o->platform_fee_percentage / 100), 2);
                    }, 0.0);

                return [
                    'gross_sales'    => number_format($grossSales, 2, '.', ''),
                    'total_refunds'  => number_format($totalRefunds, 2, '.', ''),
                    'net_sales'      => number_format($netSales, 2, '.', ''),
                    'platform_fees'  => number_format($platformFees, 2, '.', ''),
                    'net_revenue'    => number_format($netRevenue, 2, '.', ''),
                    'pending_release' => number_format($pendingRelease, 2, '.', ''),
                ];
            })(),
            'withdrawals' => $this->mapWithdrawals($seller),
        ]);
    }

    public function requestWithdrawal(Request $request): RedirectResponse
    {
        $seller = $this->ensureSeller($request);
        $wallet = $this->wallets->getOrCreateSellerWallet($seller);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'method' => ['required', 'string', 'max:100'],
            'details' => ['nullable', 'string', 'max:2000'],
        ]);

        $amount = round((float) $data['amount'], 2);

        if ($amount > (float) $wallet->available_balance) {
            throw ValidationException::withMessages([
                'amount' => 'Withdrawal amount exceeds your available balance.',
            ]);
        }

        DB::transaction(function () use ($wallet, $seller, $amount, $data) {
            $lockedWallet = $this->wallets->debitAvailable(
                $wallet,
                $amount,
                'withdrawal_request',
                null,
                ['method' => $data['method']],
                sprintf('Withdrawal request submitted by seller #%d', $seller->id),
            );

            $this->wallets->creditPending(
                $lockedWallet,
                $amount,
                'withdrawal_request',
                null,
                ['method' => $data['method']],
                sprintf('Withdrawal request reserved for seller #%d', $seller->id),
            );

            $withdrawalRequest = WithdrawalRequest::create([
                'seller_id' => $seller->id,
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'status' => 'pending',
                'method' => $data['method'],
                'details' => $data['details'] ? ['notes' => $data['details']] : null,
                'note' => $data['details'] ?: null,
            ]);
        });

        $latestRequest = WithdrawalRequest::query()
            ->where('seller_id', $seller->id)
            ->with('wallet')
            ->latest('id')
            ->first();

        if ($latestRequest) {
            $this->notifications->withdrawalRequested($latestRequest);
        }

        return back()->with('success', 'Withdrawal request submitted successfully.');
    }

    public function activateFree(Request $request, Plan $plan): RedirectResponse
    {
        $seller = $this->ensureSeller($request);

        if ((float) $plan->price > 0 || $plan->status !== 'active') {
            throw ValidationException::withMessages([
                'plan' => 'Only active free plans can be activated without payment.',
            ]);
        }

        if ($seller->activeSubscription() || $seller->upcomingSubscription()) {
            return back()->with('error', 'The free plan activates automatically after your current plan expires.');
        }

        $this->ensureFallbackSubscription($seller, $plan);

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

        // Always activate immediately if:
        // 1. No current subscription, OR
        // 2. New plan has higher or equal gig limit (upgrade), OR
        // 3. Current plan is free
        $shouldActivateImmediately = ! $current
            || ! $current->plan
            || (int) $plan->gig_limit >= (int) $current->plan->gig_limit
            || (float) $current->plan->price <= 0;

        $startsAt = $now->copy();
        $endsAt   = $startsAt->copy()->addDays($plan->duration_days);

        // Cancel all queued (future) subscriptions
        Subscription::query()
            ->where('user_id', $seller->id)
            ->where('status', 'active')
            ->where('starts_at', '>', $now)
            ->update(['status' => 'replaced']);

        // Override current active plan immediately if upgrading
        if ($shouldActivateImmediately && $current) {
            $current->update([
                'status' => 'replaced',
                'ends_at' => $now,
            ]);
        }

        // If downgrading (lower gig_limit), queue after current ends
        if (! $shouldActivateImmediately && $current?->ends_at?->isFuture()) {
            $startsAt = $current->ends_at->copy();
            $endsAt   = $startsAt->copy()->addDays($plan->duration_days);
        }

        $subscription = Subscription::create([
            'user_id'   => $seller->id,
            'plan_id'   => $plan->id,
            'starts_at' => $startsAt,
            'ends_at'   => $endsAt,
            'status'    => 'active',
        ]);

        if ($payment) {
            $payment->subscription_id = $subscription->id;
            $payment->save();
        }

        return $subscription;
    }

    private function mapPayments(User $seller)
    {
        return SubscriptionPayment::query()
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
    }

    private function mapWithdrawals(User $seller)
    {
        return WithdrawalRequest::query()
            ->where('seller_id', $seller->id)
            ->latest('created_at')
            ->get()
            ->map(fn (WithdrawalRequest $withdrawal) => [
                'id' => $withdrawal->id,
                'amount' => (string) $withdrawal->amount,
                'status' => $withdrawal->status,
                'method' => $withdrawal->method,
                'note' => $withdrawal->note,
                'created_at' => $withdrawal->created_at?->toIso8601String(),
                'reviewed_at' => $withdrawal->reviewed_at?->toIso8601String(),
            ]);
    }

    private function ensureFallbackSubscription(User $seller, ?Plan $fallbackPlan = null): ?Subscription
    {
        $plan = $fallbackPlan ?? Plan::query()
            ->where('status', 'active')
            ->orderBy('price')
            ->orderBy('id')
            ->first();

        if (! $plan) {
            return null;
        }

        return Subscription::create([
            'user_id' => $seller->id,
            'plan_id' => $plan->id,
            'starts_at' => now(),
            'ends_at' => now()->addDays($plan->duration_days),
            'status' => 'active',
        ])->load('plan');
    }
}
