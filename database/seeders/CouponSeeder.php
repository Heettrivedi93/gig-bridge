<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            [
                'code'                 => 'WELCOME10',
                'description'          => '10% off for new users',
                'discount_type'        => 'percentage',
                'discount_value'       => 10,
                'minimum_order_amount' => 100,
                'usage_limit'          => 100,
                'used_count'           => 0,
                'starts_at'            => now(),
                'expires_at'           => Carbon::now()->addMonths(3),
                'status'               => 'active',
            ],
            [
                'code'                 => 'FLAT50',
                'description'          => 'USD 50 flat discount',
                'discount_type'        => 'fixed',
                'discount_value'       => 50,
                'minimum_order_amount' => 200,
                'usage_limit'          => 50,
                'used_count'           => 0,
                'starts_at'            => now(),
                'expires_at'           => Carbon::now()->addMonths(2),
                'status'               => 'active',
            ],
            [
                'code'                 => 'SUPER20',
                'description'          => '20% off on orders above USD 500',
                'discount_type'        => 'percentage',
                'discount_value'       => 20,
                'minimum_order_amount' => 500,
                'usage_limit'          => 30,
                'used_count'           => 0,
                'starts_at'            => now(),
                'expires_at'           => Carbon::now()->addMonth(),
                'status'               => 'active',
            ],
            [
                'code'                 => 'NEWUSER100',
                'description'          => 'USD 100 off for new users',
                'discount_type'        => 'fixed',
                'discount_value'       => 100,
                'minimum_order_amount' => 300,
                'usage_limit'          => 20,
                'used_count'           => 0,
                'starts_at'            => now(),
                'expires_at'           => Carbon::now()->addMonths(6),
                'status'               => 'active',
            ],
            [
                'code'                 => 'FESTIVE25',
                'description'          => '25% festive discount',
                'discount_type'        => 'percentage',
                'discount_value'       => 25,
                'minimum_order_amount' => 400,
                'usage_limit'          => 10,
                'used_count'           => 0,
                'starts_at'            => now(),
                'expires_at'           => Carbon::now()->addDays(20),
                'status'               => 'active',
            ],
        ];

        foreach ($coupons as $coupon) {
            Coupon::firstOrCreate(['code' => $coupon['code']], $coupon);
        }
    }
}
