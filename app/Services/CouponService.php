<?php

namespace App\Services;

use App\Models\Coupon;
use Illuminate\Validation\ValidationException;

class CouponService
{
    public function availableCoupons()
    {
        return Coupon::query()
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->where(function ($query) {
                $query->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit');
            })
            ->orderByDesc('discount_type')
            ->orderByDesc('discount_value')
            ->orderBy('code')
            ->get();
    }

    public function validateForSubtotal(?string $rawCode, float $subtotal): array
    {
        $code = strtoupper(trim((string) $rawCode));

        if ($code === '') {
            return [
                'coupon' => null,
                'code' => null,
                'discount_amount' => 0.0,
            ];
        }

        $coupon = Coupon::query()
            ->whereRaw('upper(code) = ?', [$code])
            ->first();

        if (! $coupon || $coupon->status !== 'active') {
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

        $minimumOrderAmount = (float) ($coupon->minimum_order_amount ?? 0);

        if ($minimumOrderAmount > 0 && $subtotal < $minimumOrderAmount) {
            throw ValidationException::withMessages([
                'coupon_code' => sprintf('This coupon requires a minimum order of USD %s.', number_format($minimumOrderAmount, 2, '.', '')),
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

    public function markUsed(?Coupon $coupon): void
    {
        if (! $coupon) {
            return;
        }

        $coupon->increment('used_count');
    }
}
