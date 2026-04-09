<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gigs', function (Blueprint $table) {
            $table->string('approval_status')->default('pending')->after('status');
            $table->text('rejection_reason')->nullable()->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('rejection_reason');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
        });

        DB::table('gigs')
            ->where('status', 'active')
            ->update([
                'approval_status' => 'approved',
                'approved_at' => now(),
                'rejection_reason' => null,
                'rejected_at' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::table('gigs', function (Blueprint $table) {
            $table->dropColumn([
                'approval_status',
                'rejection_reason',
                'approved_at',
                'rejected_at',
            ]);
        });
    }
};
