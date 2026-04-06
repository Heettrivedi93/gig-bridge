<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderFundService
{
    public function __construct(private readonly WalletService $wallets)
    {
    }

    public function holdEscrow(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $systemWallet = $this->wallets->getOrCreateSystemWallet();

            $this->wallets->creditEscrow(
                $systemWallet,
                (float) $order->gross_amount,
                'escrow_hold',
                $order,
                ['fund_status' => 'escrow'],
                sprintf('Escrow funded for order #%d', $order->id),
            );
        });
    }

    public function markReleasable(Order $order): void
    {
        if ($order->fund_status !== 'escrow') {
            throw ValidationException::withMessages([
                'order' => 'Only escrowed orders can be marked releasable.',
            ]);
        }

        $order->update([
            'fund_status' => 'releasable',
        ]);
    }

    public function releaseToSeller(Order $order, User $admin): void
    {
        DB::transaction(function () use ($order, $admin) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()
                ->with('seller')
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->status !== 'completed' || $lockedOrder->payment_status !== 'paid' || $lockedOrder->fund_status !== 'releasable') {
                throw ValidationException::withMessages([
                    'order' => 'Only completed paid orders with releasable funds can be released.',
                ]);
            }

            $systemWallet = $this->wallets->getOrCreateSystemWallet();
            $sellerWallet = $this->wallets->getOrCreateSellerWallet($lockedOrder->seller);

            $gross = (float) $lockedOrder->gross_amount;
            $fee = (float) $lockedOrder->platform_fee_amount;
            $sellerNet = (float) $lockedOrder->seller_net_amount;

            $this->wallets->debitEscrow(
                $systemWallet,
                $gross,
                'escrow_release',
                $lockedOrder,
                ['released_by' => $admin->id],
                sprintf('Escrow released for order #%d', $lockedOrder->id),
            );

            if ($fee > 0) {
                $this->wallets->creditAvailable(
                    $systemWallet,
                    $fee,
                    'platform_fee',
                    $lockedOrder,
                    ['released_by' => $admin->id],
                    sprintf('Platform fee retained for order #%d', $lockedOrder->id),
                );
            }

            if ($sellerNet > 0) {
                $this->wallets->creditAvailable(
                    $sellerWallet,
                    $sellerNet,
                    'seller_credit',
                    $lockedOrder,
                    ['released_by' => $admin->id],
                    sprintf('Seller credited for order #%d', $lockedOrder->id),
                );
            }

            $lockedOrder->update([
                'fund_status' => 'released',
                'payment_status' => 'released',
                'escrow_held' => false,
                'funds_released_at' => now(),
                'released_by' => $admin->id,
            ]);
        });
    }

    public function refundEscrow(Order $order): void
    {
        DB::transaction(function () use ($order) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (! in_array($lockedOrder->fund_status, ['escrow', 'releasable'], true)) {
                return;
            }

            $gross = (float) $lockedOrder->gross_amount;

            if ($gross > 0) {
                $systemWallet = $this->wallets->getOrCreateSystemWallet();

                $this->wallets->debitEscrow(
                    $systemWallet,
                    $gross,
                    'refund',
                    $lockedOrder,
                    ['fund_status' => 'refunded'],
                    sprintf('Escrow refunded for order #%d', $lockedOrder->id),
                );
            }

            $lockedOrder->update([
                'fund_status' => 'refunded',
                'refunded_amount' => $gross,
                'escrow_held' => false,
            ]);
        });
    }
}
