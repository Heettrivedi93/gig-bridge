<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('message');
            $table->string('audience', 20)->default('all');
            $table->string('status', 20)->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'audience']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
