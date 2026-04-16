<?php

namespace App\Services;

use App\Models\Dispute;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DisputeService
{
    public function __construct(private readonly WalletService $wallets) {}

    /**
     * @param  float|null  $refundPercent  0–100, required when decision = partial_refund
     */
    public function resolve(Dispute $dispute, User $admin, string $decision, ?float $refundPercent, ?string $adminNote): void
    {
        DB::transaction(function () use ($dispute, $admin, $decision, $refundPercent, $adminNote) {
            $dispute->loadMissing(['order.seller']);
            $order = $dispute->order;

            if ($dispute->status === 'resolved') {
                throw ValidationException::withMessages(['decision' => 'Dispute is already resolved.']);
            }

            if (! in_array($decision, ['full_refund', 'partial_refund', 'release'], true)) {
                throw ValidationException::withMessages(['decision' => 'Invalid decision.']);
            }

            $gross = (float) $order->gross_amount;
            $fundStatus = $order->fund_status;
            $fundsInEscrow = in_array($fundStatus, ['escrow', 'releasable'], true);
            $fundsReleased = $fundStatus === 'released';

            if ($decision === 'full_refund') {
                if ($fundsInEscrow && $gross > 0) {
                    $systemWallet = $this->wallets->getOrCreateSystemWallet();
                    $this->wallets->debitEscrow(
                        $systemWallet, $gross, 'refund', $order,
                        ['dispute_id' => $dispute->id],
                        sprintf('Full refund via dispute #%d for order #%d', $dispute->id, $order->id),
                    );
                } elseif ($fundsReleased && $gross > 0) {
                    // Funds already in seller wallet — claw back
                    $sellerWallet = $this->wallets->getOrCreateSellerWallet($order->seller);
                    $this->wallets->debitAvailable(
                        $sellerWallet, (float) $order->seller_net_amount, 'dispute_clawback', $order,
                        ['dispute_id' => $dispute->id],
                        sprintf('Full clawback via dispute #%d for order #%d', $dispute->id, $order->id),
                    );
                }
                $order->update([
                    'fund_status' => 'refunded',
                    'payment_status' => 'refunded',
                    'refunded_amount' => $gross,
                    'escrow_held' => false,
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                ]);

            } elseif ($decision === 'partial_refund') {
                $pct = max(0, min(100, (float) $refundPercent));
                $buyerRefund = round($gross * $pct / 100, 2);
                $sellerKeeps = round($gross - $buyerRefund, 2);
                // Apply platform fee only on the seller's portion
                $feeRate = (float) $order->platform_fee_percentage;
                $sellerNet = round($sellerKeeps * (1 - $feeRate / 100), 2);
                $platformFee = round($sellerKeeps - $sellerNet, 2);

                if ($fundsInEscrow && $gross > 0) {
                    $systemWallet = $this->wallets->getOrCreateSystemWallet();
                    // Drain full escrow
                    $this->wallets->debitEscrow(
                        $systemWallet, $gross, 'partial_refund', $order,
                        ['dispute_id' => $dispute->id],
                        sprintf('Partial refund (%.0f%%) via dispute #%d for order #%d', $pct, $dispute->id, $order->id),
                    );
                    // Credit platform fee
                    if ($platformFee > 0) {
                        $this->wallets->creditAvailable(
                            $systemWallet, $platformFee, 'platform_fee', $order,
                            ['dispute_id' => $dispute->id],
                            sprintf('Platform fee on partial release via dispute #%d', $dispute->id),
                        );
                    }
                    // Credit seller their net portion
                    if ($sellerNet > 0) {
                        $sellerWallet = $this->wallets->getOrCreateSellerWallet($order->seller);
                        $this->wallets->creditAvailable(
                            $sellerWallet, $sellerNet, 'seller_credit', $order,
                            ['dispute_id' => $dispute->id],
                            sprintf('Partial seller credit (%.0f%% kept) via dispute #%d for order #%d', 100 - $pct, $dispute->id, $order->id),
                        );
                    }
                } elseif ($fundsReleased && $gross > 0) {
                    // Funds already in seller wallet — claw back buyer's portion
                    if ($buyerRefund > 0) {
                        $sellerWallet = $this->wallets->getOrCreateSellerWallet($order->seller);
                        $clawback = min($buyerRefund, (float) $order->seller_net_amount);
                        $this->wallets->debitAvailable(
                            $sellerWallet, $clawback, 'dispute_clawback', $order,
                            ['dispute_id' => $dispute->id],
                            sprintf('Partial clawback (%.0f%% refunded) via dispute #%d for order #%d', $pct, $dispute->id, $order->id),
                        );
                    }
                }

                $order->update([
                    'fund_status' => 'released',
                    'payment_status' => 'released',
                    'refunded_amount' => $buyerRefund,
                    'escrow_held' => false,
                    'status' => 'completed',
                    'completed_at' => $order->completed_at ?? now(),
                    'funds_released_at' => $order->funds_released_at ?? now(),
                    'released_by' => $order->released_by ?? $admin->id,
                ]);

            } elseif ($decision === 'release') {
                if ($fundsInEscrow && $gross > 0) {
                    $fee = (float) $order->platform_fee_amount;
                    $sellerNet = (float) $order->seller_net_amount;
                    $systemWallet = $this->wallets->getOrCreateSystemWallet();

                    $this->wallets->debitEscrow(
                        $systemWallet, $gross, 'escrow_release', $order,
                        ['dispute_id' => $dispute->id],
                        sprintf('Release via dispute #%d for order #%d', $dispute->id, $order->id),
                    );
                    if ($fee > 0) {
                        $this->wallets->creditAvailable(
                            $systemWallet, $fee, 'platform_fee', $order,
                            ['dispute_id' => $dispute->id],
                            sprintf('Platform fee retained via dispute #%d for order #%d', $dispute->id, $order->id),
                        );
                    }
                    if ($sellerNet > 0) {
                        $sellerWallet = $this->wallets->getOrCreateSellerWallet($order->seller);
                        $this->wallets->creditAvailable(
                            $sellerWallet, $sellerNet, 'seller_credit', $order,
                            ['dispute_id' => $dispute->id],
                            sprintf('Seller credited via dispute #%d for order #%d', $dispute->id, $order->id),
                        );
                    }
                }
                // If already released — no wallet movement needed, just close dispute
                $order->update([
                    'fund_status' => 'released',
                    'payment_status' => 'released',
                    'escrow_held' => false,
                    'status' => 'completed',
                    'completed_at' => $order->completed_at ?? now(),
                    'funds_released_at' => $order->funds_released_at ?? now(),
                    'released_by' => $order->released_by ?? $admin->id,
                ]);
            }

            $dispute->update([
                'status' => 'resolved',
                'decision' => $decision,
                'partial_amount' => $decision === 'partial_refund' ? $refundPercent : null,
                'admin_note' => $adminNote,
                'resolved_by' => $admin->id,
                'resolved_at' => now(),
            ]);
        });
    }
}
