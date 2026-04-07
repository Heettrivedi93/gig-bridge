<?php

namespace App\Support;

class PortalPermissions
{
    public const SELLER = [
        'seller.gigs.access',
        'seller.orders.access',
        'seller.plans.access',
        'seller.wallet.access',
        'seller.payments.access',
    ];

    public const BUYER = [
        'buyer.gigs.access',
        'buyer.orders.access',
        'buyer.payments.access',
    ];

    public static function all(): array
    {
        return [
            ...self::SELLER,
            ...self::BUYER,
        ];
    }

    public static function grouped(): array
    {
        return [
            'seller' => self::SELLER,
            'buyer' => self::BUYER,
        ];
    }

    public static function forRole(?string $role): array
    {
        return match ($role) {
            'seller' => self::SELLER,
            'buyer' => self::BUYER,
            default => [],
        };
    }

    public static function forRoles(array $roles): array
    {
        $permissions = [];

        foreach ($roles as $role) {
            $permissions = array_merge($permissions, self::forRole($role));
        }

        return array_values(array_unique($permissions));
    }

    public static function isPortalPermission(string $permission): bool
    {
        return in_array($permission, self::all(), true);
    }
}
