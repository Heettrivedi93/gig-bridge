<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\PortalPermissions;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'name',
    'email',
    'password',
    'status',
    'bio',
    'phone',
    'profile_picture',
    'skills',
    'location',
    'website',
    'notification_preferences',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions_managed_at' => 'datetime',
            'notification_preferences' => 'array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function primaryRoleName(): ?string
    {
        return $this->getRoleNames()->first();
    }

    public function usesDefaultPortalPermissions(): bool
    {
        return $this->permissions_managed_at === null;
    }

    public function effectivePortalPermissions(): array
    {
        if ($this->usesDefaultPortalPermissions()) {
            return PortalPermissions::forRoles($this->getRoleNames()->all());
        }

        return $this->getDirectPermissions()
            ->pluck('name')
            ->values()
            ->all();
    }

    public function gigs(): HasMany
    {
        return $this->hasMany(Gig::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function buyerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function sellerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'seller_id');
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function reviewsWritten(): HasMany
    {
        return $this->hasMany(Review::class, 'buyer_id');
    }

    public function reviewsReceived(): HasMany
    {
        return $this->hasMany(Review::class, 'seller_id');
    }

    public function gigFavourites(): HasMany
    {
        return $this->hasMany(GigFavourite::class);
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->latest('ends_at')
            ->latest('id')
            ->with('plan')
            ->first();
    }

    public function upcomingSubscription(): ?Subscription
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('starts_at', '>', now())
            ->latest('starts_at')
            ->latest('id')
            ->with('plan')
            ->first();
    }
}
