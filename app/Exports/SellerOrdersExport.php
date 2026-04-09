<?php

namespace App\Exports;

use App\Models\Order;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SellerOrdersExport implements FromArray, ShouldAutoSize, WithHeadings
{
    public function __construct(
        private readonly Collection $orders,
    ) {}

    public function headings(): array
    {
        return [
            'Order ID',
            'Gig',
            'Package',
            'Buyer Name',
            'Buyer Email',
            'Quantity',
            'Gross Amount',
            'Discount Amount',
            'Final Price',
            'Platform Fee',
            'Seller Net',
            'Order Status',
            'Payment Status',
            'Delivered At',
            'Completed At',
            'Cancelled At',
            'Created At',
        ];
    }

    public function array(): array
    {
        return $this->orders
            ->map(fn (Order $order) => [
                $order->id,
                $order->gig?->title ?? 'Order',
                $order->package?->title ?? 'Package',
                $order->buyer?->name ?? 'Buyer',
                $order->buyer?->email ?? '',
                $order->quantity,
                number_format((float) $order->gross_amount, 2, '.', ''),
                number_format((float) $order->discount_amount, 2, '.', ''),
                number_format((float) $order->price, 2, '.', ''),
                number_format((float) $order->platform_fee_amount, 2, '.', ''),
                number_format((float) $order->seller_net_amount, 2, '.', ''),
                $order->status,
                $order->payment_status,
                $order->delivered_at?->format('Y-m-d H:i:s') ?? '',
                $order->completed_at?->format('Y-m-d H:i:s') ?? '',
                $order->cancelled_at?->format('Y-m-d H:i:s') ?? '',
                $order->created_at?->format('Y-m-d H:i:s') ?? '',
            ])
            ->values()
            ->all();
    }
}
