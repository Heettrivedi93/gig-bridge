<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('coupon_id')->nullable()->after('package_id')->constrained('coupons')->nullOnDelete();
            $table->decimal('subtotal_amount', 12, 2)->default(0)->after('unit_price');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('subtotal_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn([
                'subtotal_amount',
                'discount_amount',
            ]);
        });
    }
};
