<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'gig_id',
        'package_id',
        'coupon_id',
        'quantity',
        'requirements',
        'brief_file_path',
        'reference_link',
        'style_notes',
        'coupon_code',
        'billing_name',
        'billing_email',
        'unit_price',
        'subtotal_amount',
        'discount_amount',
        'price',
        'gross_amount',
        'platform_fee_percentage',
        'platform_fee_amount',
        'seller_net_amount',
        'refunded_amount',
        'status',
        'payment_status',
        'fund_status',
        'escrow_held',
        'paypal_order_id',
        'paypal_payer_id',
        'delivered_at',
        'completed_at',
        'cancelled_at',
        'funds_released_at',
        'released_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'price' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'platform_fee_percentage' => 'decimal:2',
        'platform_fee_amount' => 'decimal:2',
        'seller_net_amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'escrow_held' => 'boolean',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'funds_released_at' => 'datetime',
    ];

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(GigPackage::class, 'package_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(OrderDelivery::class)->latest('delivered_at');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(OrderRevision::class)->latest();
    }

    public function cancellations(): HasMany
    {
        return $this->hasMany(OrderCancellation::class)->latest();
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class)->latest();
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }
}
