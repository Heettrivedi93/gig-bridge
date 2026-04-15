<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Refund Receipt {{ $receiptNumber }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 12px; margin: 28px; }
        .header { display: table; width: 100%; margin-bottom: 18px; }
        .header > div { display: table-cell; vertical-align: top; width: 50%; }
        h1 { margin: 0 0 4px; font-size: 22px; }
        .muted { color: #64748b; }
        .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
        .pill-refund { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
        .pill-ref { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-top: 14px; }
        .row { display: table; width: 100%; }
        .row > div { display: table-cell; width: 50%; vertical-align: top; }
        .keyval { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .keyval td { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .keyval td:last-child { text-align: right; font-weight: 600; }
        .total { font-size: 16px; font-weight: 700; }
        .refund-amount { font-size: 16px; font-weight: 700; color: #b45309; }
        .net-amount { font-size: 14px; font-weight: 700; color: #0f172a; }
        .notice { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 14px; margin-top: 14px; color: #92400e; font-size: 11px; }
        .footer { margin-top: 18px; color: #64748b; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Refund Receipt</h1>
            <div class="muted">{{ $siteName }}</div>
            <div style="margin-top: 8px;">
                <span class="pill pill-refund">REFUNDED</span>
            </div>
        </div>
        <div style="text-align: right;">
            <div><strong>{{ $receiptNumber }}</strong></div>
            <div class="muted" style="margin-top: 4px;">
                <span class="pill pill-ref">Ref: {{ $invoiceNumber }}</span>
            </div>
            <div class="muted" style="margin-top: 6px;">Issued: {{ optional($order->cancelled_at ?? $order->updated_at)->format('M d, Y h:i A') }}</div>
            <div class="muted">Generated: {{ $generatedAt->format('M d, Y h:i A') }}</div>
        </div>
    </div>

    <div class="row">
        <div class="card" style="margin-right: 8px;">
            <strong>Refunded To</strong>
            <div style="margin-top: 8px;">{{ $order->billing_name ?: $buyer->name }}</div>
            <div class="muted">{{ $order->billing_email ?: $buyer->email }}</div>
        </div>
        <div class="card" style="margin-left: 8px;">
            <strong>Original Seller</strong>
            <div style="margin-top: 8px;">{{ $order->seller?->name ?? 'Seller' }}</div>
            <div class="muted">{{ $order->seller?->email ?? '' }}</div>
        </div>
    </div>

    <div class="card">
        <strong>Original Order</strong>
        <table class="keyval">
            <tr>
                <td>Invoice reference</td>
                <td>{{ $invoiceNumber }}</td>
            </tr>
            <tr>
                <td>Gig</td>
                <td>{{ $order->gig?->title ?? 'Order' }}</td>
            </tr>
            <tr>
                <td>Package</td>
                <td>{{ $order->package?->title ?? 'Package' }} ({{ $order->package?->tier ?? 'n/a' }})</td>
            </tr>
            <tr>
                <td>PayPal Order ID</td>
                <td>{{ $order->paypal_order_id ?? '—' }}</td>
            </tr>
        </table>
    </div>

    <div class="card">
        <strong>Refund Breakdown</strong>
        <table class="keyval">
            <tr>
                <td>Original amount paid</td>
                <td>USD {{ number_format((float) $order->price, 2) }}</td>
            </tr>
            <tr>
                <td>Refund amount</td>
                <td class="refund-amount">- USD {{ number_format((float) ($order->refunded_amount ?? $order->price), 2) }}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 0; border-bottom: 2px solid #e2e8f0;"></td>
            </tr>
            <tr>
                <td>Net charged</td>
                <td class="net-amount">USD {{ number_format(max(0, (float) $order->price - (float) ($order->refunded_amount ?? $order->price)), 2) }}</td>
            </tr>
        </table>
    </div>

    <div class="card">
        <strong>Refund Details</strong>
        <table class="keyval">
            <tr>
                <td>Cancelled by</td>
                <td>{{ ucfirst($cancelledBy) }}</td>
            </tr>
            <tr>
                <td>Reason</td>
                <td>{{ $refundReason }}</td>
            </tr>
            <tr>
                <td>Refund date</td>
                <td>{{ optional($order->cancelled_at ?? $order->updated_at)->format('M d, Y h:i A') }}</td>
            </tr>
        </table>
    </div>

    <div class="notice">
        Refunds are processed back to your original PayPal payment method. Processing time is typically 3–5 business days depending on your bank.
        @if($contactEmail)
            For questions, contact us at {{ $contactEmail }}.
        @endif
    </div>

    <div class="footer">
        This refund receipt was generated electronically by {{ $siteName }} and is valid without signature.
        Original invoice: {{ $invoiceNumber }} · Refund receipt: {{ $receiptNumber }}
    </div>
</body>
</html>
