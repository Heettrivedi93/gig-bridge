<?php

namespace App\Services;

use App\Models\Message;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Collection;

class SellerRankingService
{
    public const LEVEL_1 = 'level_1';
    public const LEVEL_2 = 'level_2';
    public const TOP_RATED = 'top_rated';

    public function recalculate(User $seller): ?string
    {
        if (! $seller->hasRole('seller')) {
            if ($seller->seller_level !== null) {
                $seller->forceFill(['seller_level' => null])->saveQuietly();
            }

            return null;
        }

        $metrics = $this->metrics($seller);
        $level = $this->determineLevel($metrics);

        if ($seller->seller_level !== $level) {
            $seller->forceFill(['seller_level' => $level])->saveQuietly();
        }

        return $level;
    }

    public function badge(?string $level): ?array
    {
        return match ($level) {
            self::TOP_RATED => [
                'value' => self::TOP_RATED,
                'label' => 'Top Rated',
                'tone' => 'top_rated',
            ],
            self::LEVEL_2 => [
                'value' => self::LEVEL_2,
                'label' => 'Level 2',
                'tone' => 'level_2',
            ],
            self::LEVEL_1 => [
                'value' => self::LEVEL_1,
                'label' => 'Level 1',
                'tone' => 'level_1',
            ],
            default => null,
        };
    }

    private function metrics(User $seller): array
    {
        $sellerOrders = Order::query()
            ->where('seller_id', $seller->id)
            ->whereIn('payment_status', ['paid', 'released', 'refunded']);

        $totalOrders = (clone $sellerOrders)->count();
        $completedOrders = (clone $sellerOrders)->where('status', 'completed')->count();
        $completionRate = $totalOrders > 0
            ? round(($completedOrders / $totalOrders) * 100, 2)
            : 0.0;

        $averageRating = round((float) Review::query()
            ->where('seller_id', $seller->id)
            ->avg('rating'), 2);

        return [
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrders,
            'completion_rate' => $completionRate,
            'average_rating' => $averageRating,
            'response_time_hours' => $this->averageResponseTimeHours($seller),
        ];
    }

    private function determineLevel(array $metrics): ?string
    {
        $responseTime = $metrics['response_time_hours'];

        if (
            $metrics['total_orders'] >= 50
            && $metrics['completion_rate'] >= 95
            && $metrics['average_rating'] >= 4.8
            && $responseTime !== null
            && $responseTime <= 12
        ) {
            return self::TOP_RATED;
        }

        if (
            $metrics['total_orders'] >= 20
            && $metrics['completion_rate'] >= 90
            && $metrics['average_rating'] >= 4.6
            && $responseTime !== null
            && $responseTime <= 24
        ) {
            return self::LEVEL_2;
        }

        if (
            $metrics['total_orders'] >= 5
            && $metrics['completion_rate'] >= 80
            && $metrics['average_rating'] >= 4.3
            && $responseTime !== null
            && $responseTime <= 48
        ) {
            return self::LEVEL_1;
        }

        return null;
    }

    private function averageResponseTimeHours(User $seller): ?float
    {
        $messages = Message::query()
            ->where('sender_id', $seller->id)
            ->orWhere('receiver_id', $seller->id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['sender_id', 'receiver_id', 'order_id', 'created_at']);

        if ($messages->isEmpty()) {
            return null;
        }

        $hours = $messages
            ->groupBy(function (Message $message) use ($seller) {
                $counterpartId = $message->sender_id === $seller->id
                    ? $message->receiver_id
                    : $message->sender_id;

                return sprintf('%d:%d', $counterpartId, $message->order_id ?? 0);
            })
            ->flatMap(function (Collection $thread) use ($seller) {
                $waitingSince = null;
                $responseTimes = [];

                foreach ($thread as $message) {
                    if ($message->sender_id !== $seller->id) {
                        $waitingSince ??= $message->created_at;
                        continue;
                    }

                    if ($waitingSince === null) {
                        continue;
                    }

                    $responseTimes[] = round($waitingSince->diffInSeconds($message->created_at) / 3600, 2);
                    $waitingSince = null;
                }

                return $responseTimes;
            })
            ->values();

        if ($hours->isEmpty()) {
            return null;
        }

        return round((float) $hours->avg(), 2);
    }
}
