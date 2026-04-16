<?php

use App\Models\Dispute;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

Broadcast::channel('orders.{orderId}.messages', function (User $user, int $orderId): bool {
    $permissions = $user->effectivePortalPermissions();
    $canMessage = in_array('buyer.messages.access', $permissions, true)
        || in_array('seller.messages.access', $permissions, true);

    if (! $canMessage) {
        return false;
    }

    return Order::query()
        ->where('id', $orderId)
        ->where(function ($query) use ($user) {
            $query->where('buyer_id', $user->id)
                ->orWhere('seller_id', $user->id);
        })
        ->exists();
});

Broadcast::channel('disputes.{disputeId}.messages', function (User $user, int $disputeId): bool {
    // Super admin can always listen
    if ($user->hasRole('super_admin')) {
        return true;
    }

    return Dispute::query()
        ->where('id', $disputeId)
        ->whereHas('order', fn ($q) => $q
            ->where('buyer_id', $user->id)
            ->orWhere('seller_id', $user->id)
        )
        ->exists();
});
