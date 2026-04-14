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

    private const THRESHOLDS = [
        'level_1'   => ['label' => 'Level 1',   'orders' => 5,   'completion_rate' => 80.0, 'rating' => 4.3, 'response_hours' => 48],
        'level_2'   => ['label' => 'Level 2',   'orders' => 20,  'completion_rate' => 90.0, 'rating' => 4.6, 'response_hours' => 24],
        'top_rated' => ['label' => 'Top Rated', 'orders' => 50,  'completion_rate' => 95.0, 'rating' => 4.8, 'response_hours' => 12],
    ];

    private const LEVEL_ORDER = [null, 'level_1', 'level_2', 'top_rated'];

    public function progress(User $seller): array
    {
        $metrics      = $this->metrics($seller);
        $current      = $this->determineLevel($metrics);
        $currentIndex = (int) array_search($current, self::LEVEL_ORDER, true);
        $nextLevel    = self::LEVEL_ORDER[$currentIndex + 1] ?? null;

        if ($nextLevel === null) {
            return ['current_level' => $current, 'next_level' => null, 'next_label' => null,
                    'is_top' => true, 'metrics' => $metrics, 'requirements' => [], 'blocking' => null];
        }

        $t = self::THRESHOLDS[$nextLevel];
        $rt = $metrics['response_time_hours'];

        $reqs = [
            ['key' => 'orders',          'label' => 'Completed orders',  'current' => $metrics['completed_orders'], 'target' => $t['orders'],          'unit' => '',    'lower_is_better' => false, 'met' => $metrics['completed_orders'] >= $t['orders'],          'progress' => min(100, $t['orders'] > 0          ? (int) round($metrics['completed_orders'] / $t['orders'] * 100)          : 100)],
            ['key' => 'completion_rate', 'label' => 'Completion rate',   'current' => $metrics['completion_rate'], 'target' => $t['completion_rate'], 'unit' => '%',   'lower_is_better' => false, 'met' => $metrics['completion_rate'] >= $t['completion_rate'], 'progress' => min(100, $t['completion_rate'] > 0 ? (int) round($metrics['completion_rate'] / $t['completion_rate'] * 100) : 100)],
            ['key' => 'rating',          'label' => 'Average rating',    'current' => $metrics['average_rating'],  'target' => $t['rating'],          'unit' => '/ 5', 'lower_is_better' => false, 'met' => $metrics['average_rating'] >= $t['rating'],          'progress' => min(100, $t['rating'] > 0          ? (int) round($metrics['average_rating'] / $t['rating'] * 100)          : 100)],
            ['key' => 'response_time',   'label' => 'Avg response time', 'current' => $rt,                         'target' => $t['response_hours'],  'unit' => 'h',   'lower_is_better' => true,  'met' => $rt !== null && $rt <= $t['response_hours'],          'progress' => $rt === null ? 0 : min(100, (int) round($t['response_hours'] / max($rt, 1) * 100))],
        ];

        $blocking = array_values(array_map(fn ($r) => $r['label'], array_filter($reqs, fn ($r) => ! $r['met'])));

        return [
            'current_level' => $current,
            'next_level'    => $nextLevel,
            'next_label'    => $t['label'],
            'is_top'        => false,
            'metrics'       => $metrics,
            'requirements'  => $reqs,
            'blocking'      => count($blocking) > 0
                ? implode(' and ', array_slice($blocking, 0, 2)) . (count($blocking) === 1 ? ' needs' : ' need') . ' improvement to reach ' . $t['label'] . '.'
                : null,
        ];
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
