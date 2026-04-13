<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GigFavourite extends Model
{
    protected $fillable = ['user_id', 'gig_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class);
    }
}
