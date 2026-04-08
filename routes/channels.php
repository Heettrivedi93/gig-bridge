<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

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
