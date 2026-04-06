<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'gig_id',
        'package_id',
        'quantity',
        'requirements',
        'brief_file_path',
        'reference_link',
        'style_notes',
        'coupon_code',
        'billing_name',
        'billing_email',
        'unit_price',
        'price',
        'status',
        'payment_status',
        'escrow_held',
        'paypal_order_id',
        'paypal_payer_id',
        'delivered_at',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'price' => 'decimal:2',
        'escrow_held' => 'boolean',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
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
}
