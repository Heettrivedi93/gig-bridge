<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Seller Orders Report</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #111827;
            margin: 18px;
        }
        h1 {
            margin: 0;
            font-size: 18px;
        }
        .meta {
            margin-top: 4px;
            color: #4b5563;
            font-size: 10px;
        }
        .summary {
            margin-top: 14px;
            width: 100%;
            border-collapse: collapse;
        }
        .summary td {
            border: 1px solid #e5e7eb;
            padding: 8px;
            width: 25%;
        }
        .summary .label {
            display: block;
            color: #6b7280;
            font-size: 10px;
            margin-bottom: 2px;
        }
        .summary .value {
            font-size: 14px;
            font-weight: 700;
        }
        .orders {
            margin-top: 16px;
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .orders th,
        .orders td {
            border: 1px solid #e5e7eb;
            padding: 6px;
            vertical-align: top;
            word-wrap: break-word;
        }
        .orders th {
            background: #f3f4f6;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }
        .muted {
            color: #6b7280;
        }
        .money {
            white-space: nowrap;
        }
    </style>
</head>
<body>
    <h1>Seller Orders Report</h1>
    <p class="meta">Seller: {{ $seller->name }} ({{ $seller->email }})</p>
    <p class="meta">Generated: {{ $generatedAt->format('M d, Y h:i A') }}</p>

    <table class="summary">
        <tr>
            <td>
                <span class="label">Total orders</span>
                <span class="value">{{ $summary['total_orders'] }}</span>
            </td>
            <td>
                <span class="label">Active orders</span>
                <span class="value">{{ $summary['active_orders'] }}</span>
            </td>
            <td>
                <span class="label">Delivered orders</span>
                <span class="value">{{ $summary['delivered_orders'] }}</span>
            </td>
            <td>
                <span class="label">Completed orders</span>
                <span class="value">{{ $summary['completed_orders'] }}</span>
            </td>
        </tr>
        <tr>
            <td>
                <span class="label">Cancelled orders</span>
                <span class="value">{{ $summary['cancelled_orders'] }}</span>
            </td>
            <td>
                <span class="label">Gross sales</span>
                <span class="value money">USD {{ number_format($summary['gross_sales'], 2) }}</span>
            </td>
            <td>
                <span class="label">Seller net</span>
                <span class="value money">USD {{ number_format($summary['seller_net'], 2) }}</span>
            </td>
            <td>
                <span class="label">Rows exported</span>
                <span class="value">{{ $orders->count() }}</span>
            </td>
        </tr>
    </table>

    <table class="orders">
        <thead>
            <tr>
                <th>#</th>
                <th>Gig / Package</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Delivered</th>
                <th>Completed</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($orders as $order)
                <tr>
                    <td>{{ $order->id }}</td>
                    <td>
                        {{ $order->gig?->title ?? 'Order' }}<br>
                        <span class="muted">{{ $order->package?->title ?? 'Package' }}</span>
                    </td>
                    <td>
                        {{ $order->buyer?->name ?? 'Buyer' }}<br>
                        <span class="muted">{{ $order->buyer?->email ?? '' }}</span>
                    </td>
                    <td class="money">USD {{ number_format((float) $order->price, 2) }}</td>
                    <td>{{ ucfirst($order->status) }}</td>
                    <td>{{ ucfirst($order->payment_status) }}</td>
                    <td>{{ $order->delivered_at?->format('M d, Y') ?? 'Pending' }}</td>
                    <td>{{ $order->completed_at?->format('M d, Y') ?? 'Pending' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8">No orders found for export.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
