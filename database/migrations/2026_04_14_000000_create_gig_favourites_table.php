<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gig_favourites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gig_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'gig_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gig_favourites');
    }
};
