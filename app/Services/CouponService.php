<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CouponService
{
    /**
     * Return coupons that are active, not expired, not exhausted,
     * and NOT already used by the given buyer.
     */
    public function availableCoupons(?int $buyerId = null)
    {
        return Coupon::query()
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->where(function ($q) {
                $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit');
            })
            ->when($buyerId !== null, function ($q) use ($buyerId) {
                // Hide coupons this buyer has already redeemed
                $q->whereNotExists(function ($sub) use ($buyerId) {
                    $sub->select(DB::raw(1))
                        ->from('coupon_user')
                        ->whereColumn('coupon_user.coupon_id', 'coupons.id')
                        ->where('coupon_user.user_id', $buyerId);
                });
            })
            ->orderByDesc('discount_type')
            ->orderByDesc('discount_value')
            ->orderBy('code')
            ->get();
    }

    /**
     * Validate a coupon code for a given subtotal and buyer.
     * Throws ValidationException on any failure.
     */
    public function validateForSubtotal(?string $rawCode, float $subtotal, ?int $buyerId = null): array
    {
        $code = strtoupper(trim((string) $rawCode));

        if ($code === '') {
            return ['coupon' => null, 'code' => null, 'discount_amount' => 0.0];
        }

        $coupon = Coupon::query()->whereRaw('upper(code) = ?', [$code])->first();

        if (! $coupon) {
            return ['coupon' => null, 'code' => $code, 'discount_amount' => 0.0];
        }

        if ($coupon->status !== 'active') {
            throw ValidationException::withMessages([
                'coupon_code' => 'This coupon code is invalid or inactive.',
            ]);
        }

        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            throw ValidationException::withMessages([
                'coupon_code' => 'This coupon is not active yet.',
            ]);
        }

        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'coupon_code' => 'This coupon has expired.',
            ]);
        }

        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw ValidationException::withMessages([
                'coupon_code' => 'This coupon has reached its usage limit.',
            ]);
        }

        // Per-user check
        if ($buyerId !== null) {
            $alreadyUsed = DB::table('coupon_user')
                ->where('coupon_id', $coupon->id)
                ->where('user_id', $buyerId)
                ->exists();

            if ($alreadyUsed) {
                throw ValidationException::withMessages([
                    'coupon_code' => 'You have already used this coupon.',
                ]);
            }
        }

        $minimumOrderAmount = (float) ($coupon->minimum_order_amount ?? 0);

        if ($minimumOrderAmount > 0 && $subtotal < $minimumOrderAmount) {
            throw ValidationException::withMessages([
                'coupon_code' => sprintf(
                    'This coupon requires a minimum order of USD %s.',
                    number_format($minimumOrderAmount, 2, '.', '')
                ),
            ]);
        }

        $discountAmount = $coupon->discount_type === 'percentage'
            ? round($subtotal * ((float) $coupon->discount_value / 100), 2)
            : round((float) $coupon->discount_value, 2);

        $discountAmount = min($subtotal, max(0, $discountAmount));

        if ($discountAmount <= 0) {
            throw ValidationException::withMessages([
                'coupon_code' => 'This coupon does not apply to the current order.',
            ]);
        }

        return [
            'coupon' => $coupon,
            'code' => $coupon->code,
            'discount_amount' => $discountAmount,
        ];
    }

    /**
     * Record coupon usage for the buyer and increment the global used_count.
     */
    public function markUsed(?Coupon $coupon, ?int $buyerId = null, ?Order $order = null): void
    {
        if (! $coupon) {
            return;
        }

        $coupon->increment('used_count');

        if ($buyerId !== null) {
            // Insert only if not already recorded (race-condition safety)
            DB::table('coupon_user')->insertOrIgnore([
                'coupon_id' => $coupon->id,
                'user_id'   => $buyerId,
                'order_id'  => $order?->id,
                'used_at'   => now(),
            ]);
        }
    }
}
