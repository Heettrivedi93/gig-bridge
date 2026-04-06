<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GigImage extends Model
{
    protected $fillable = [
        'gig_id',
        'path',
        'sort_order',
    ];

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class);
    }
}
