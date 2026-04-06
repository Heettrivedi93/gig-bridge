<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('fund_status')->default('none')->after('payment_status');
            $table->decimal('gross_amount', 12, 2)->default(0)->after('price');
            $table->decimal('platform_fee_percentage', 5, 2)->default(0)->after('gross_amount');
            $table->decimal('platform_fee_amount', 12, 2)->default(0)->after('platform_fee_percentage');
            $table->decimal('seller_net_amount', 12, 2)->default(0)->after('platform_fee_amount');
            $table->decimal('refunded_amount', 12, 2)->default(0)->after('seller_net_amount');
            $table->timestamp('funds_released_at')->nullable()->after('completed_at');
            $table->foreignId('released_by')->nullable()->after('funds_released_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('released_by');
            $table->dropColumn([
                'fund_status',
                'gross_amount',
                'platform_fee_percentage',
                'platform_fee_amount',
                'seller_net_amount',
                'refunded_amount',
                'funds_released_at',
            ]);
        });
    }
};
