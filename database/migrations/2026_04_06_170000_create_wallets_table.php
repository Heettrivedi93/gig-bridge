<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('owner_type');
            $table->string('currency', 10)->default('USD');
            $table->decimal('available_balance', 12, 2)->default(0);
            $table->decimal('pending_balance', 12, 2)->default(0);
            $table->decimal('escrow_balance', 12, 2)->default(0);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['user_id', 'owner_type']);
            $table->index(['owner_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
