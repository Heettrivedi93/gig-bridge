<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class WalletService
{
    public function getOrCreateSystemWallet(): Wallet
    {
        return Wallet::query()->firstOrCreate(
            ['user_id' => null, 'owner_type' => 'system'],
            ['currency' => 'USD', 'status' => 'active']
        );
    }

    public function getOrCreateSellerWallet(User $seller): Wallet
    {
        return Wallet::query()->firstOrCreate(
            ['user_id' => $seller->id, 'owner_type' => 'seller'],
            ['currency' => 'USD', 'status' => 'active']
        );
    }

    public function creditAvailable(Wallet $wallet, float $amount, string $type, ?Order $order = null, array $meta = [], ?string $description = null): Wallet
    {
        return $this->apply($wallet, 'available_balance', 'available', 'credit', $amount, $type, $order, $meta, $description);
    }

    public function debitAvailable(Wallet $wallet, float $amount, string $type, ?Order $order = null, array $meta = [], ?string $description = null): Wallet
    {
        return $this->apply($wallet, 'available_balance', 'available', 'debit', $amount, $type, $order, $meta, $description);
    }

    public function creditEscrow(Wallet $wallet, float $amount, string $type, ?Order $order = null, array $meta = [], ?string $description = null): Wallet
    {
        return $this->apply($wallet, 'escrow_balance', 'escrow', 'credit', $amount, $type, $order, $meta, $description);
    }

    public function debitEscrow(Wallet $wallet, float $amount, string $type, ?Order $order = null, array $meta = [], ?string $description = null): Wallet
    {
        return $this->apply($wallet, 'escrow_balance', 'escrow', 'debit', $amount, $type, $order, $meta, $description);
    }

    public function creditPending(Wallet $wallet, float $amount, string $type, ?Order $order = null, array $meta = [], ?string $description = null): Wallet
    {
        return $this->apply($wallet, 'pending_balance', 'pending', 'credit', $amount, $type, $order, $meta, $description);
    }

    public function debitPending(Wallet $wallet, float $amount, string $type, ?Order $order = null, array $meta = [], ?string $description = null): Wallet
    {
        return $this->apply($wallet, 'pending_balance', 'pending', 'debit', $amount, $type, $order, $meta, $description);
    }

    private function apply(
        Wallet $wallet,
        string $column,
        string $bucket,
        string $direction,
        float $amount,
        string $type,
        ?Order $order,
        array $meta,
        ?string $description,
    ): Wallet {
        if ($amount < 0) {
            throw new InvalidArgumentException('Wallet amount must be non-negative.');
        }

        /** @var Wallet $lockedWallet */
        $lockedWallet = Wallet::query()->lockForUpdate()->findOrFail($wallet->id);
        $before = (float) $lockedWallet->{$column};
        $after = $direction === 'credit'
            ? $before + $amount
            : $before - $amount;

        if ($after < 0) {
            throw new InvalidArgumentException(sprintf('Wallet %s balance cannot become negative.', $bucket));
        }

        $lockedWallet->update([
            $column => $after,
        ]);

        $lockedWallet->transactions()->create([
            'order_id' => $order?->id,
            'reference_type' => $order ? Order::class : null,
            'reference_id' => $order?->id,
            'type' => $type,
            'direction' => $direction,
            'balance_bucket' => $bucket,
            'amount' => round($amount, 2),
            'balance_before' => round($before, 2),
            'balance_after' => round($after, 2),
            'description' => $description,
            'meta' => $meta,
        ]);

        return $lockedWallet->refresh();
    }
}
