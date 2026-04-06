<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('gig_id')->constrained()->cascadeOnDelete();
            $table->foreignId('package_id')->constrained('gig_packages')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->text('requirements');
            $table->string('brief_file_path')->nullable();
            $table->string('reference_link', 2000)->nullable();
            $table->text('style_notes')->nullable();
            $table->string('coupon_code', 100)->nullable();
            $table->string('billing_name')->nullable();
            $table->string('billing_email')->nullable();
            $table->decimal('unit_price', 10, 2);
            $table->decimal('price', 10, 2);
            $table->string('status')->default('pending');
            $table->string('payment_status')->default('pending');
            $table->boolean('escrow_held')->default(false);
            $table->string('paypal_order_id')->nullable();
            $table->string('paypal_payer_id')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
