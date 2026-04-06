<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WithdrawalRequest extends Model
{
    protected $fillable = [
        'seller_id',
        'wallet_id',
        'amount',
        'status',
        'method',
        'details',
        'reviewed_by',
        'reviewed_at',
        'note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'details' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
