<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminCouponController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/coupons/index', [
            'coupons' => Coupon::query()
                ->latest('id')
                ->get()
                ->map(fn (Coupon $coupon) => [
                    'id' => $coupon->id,
                    'code' => $coupon->code,
                    'description' => $coupon->description,
                    'discount_type' => $coupon->discount_type,
                    'discount_value' => (string) $coupon->discount_value,
                    'minimum_order_amount' => $coupon->minimum_order_amount !== null
                        ? (string) $coupon->minimum_order_amount
                        : '',
                    'usage_limit' => $coupon->usage_limit,
                    'used_count' => $coupon->used_count,
                    'starts_at' => $coupon->starts_at?->toIso8601String(),
                    'expires_at' => $coupon->expires_at?->toIso8601String(),
                    'status' => $coupon->status,
                ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateCoupon($request);

        Coupon::create($this->payload($data));

        return back()->with('success', 'Coupon created successfully.');
    }

    public function update(Request $request, Coupon $coupon)
    {
        $data = $this->validateCoupon($request, $coupon);

        $coupon->update($this->payload($data));

        return back()->with('success', 'Coupon updated successfully.');
    }

    public function destroy(Coupon $coupon)
    {
        $coupon->delete();

        return back()->with('success', 'Coupon deleted successfully.');
    }

    private function validateCoupon(Request $request, ?Coupon $coupon = null): array
    {
        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('coupons', 'code')->ignore($coupon?->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'discount_type' => ['required', Rule::in(['fixed', 'percentage'])],
            'discount_value' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'minimum_order_amount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }

    private function payload(array $data): array
    {
        return [
            'code' => strtoupper(trim($data['code'])),
            'description' => trim((string) ($data['description'] ?? '')) ?: null,
            'discount_type' => $data['discount_type'],
            'discount_value' => $data['discount_value'],
            'minimum_order_amount' => ($data['minimum_order_amount'] ?? null) !== null
                ? $data['minimum_order_amount']
                : null,
            'usage_limit' => ($data['usage_limit'] ?? null) !== null
                ? $data['usage_limit']
                : null,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'status' => $data['status'],
        ];
    }
}
