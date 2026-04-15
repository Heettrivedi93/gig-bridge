<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gig extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'subcategory_id',
        'title',
        'description',
        'tags',
        'status',
        'views_count',
        'approval_status',
        'rejection_reason',
        'pending_changes',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'tags'            => 'array',
        'pending_changes' => 'array',
        'views_count'     => 'integer',
        'approved_at'     => 'datetime',
        'rejected_at'     => 'datetime',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'subcategory_id');
    }

    public function packages(): HasMany
    {
        return $this->hasMany(GigPackage::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(GigImage::class)->orderBy('sort_order');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function favourites(): HasMany
    {
        return $this->hasMany(GigFavourite::class);
    }
}
