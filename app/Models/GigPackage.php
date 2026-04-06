<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GigPackage extends Model
{
    protected $fillable = [
        'gig_id',
        'tier',
        'title',
        'description',
        'price',
        'delivery_days',
        'revision_count',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class);
    }
}
