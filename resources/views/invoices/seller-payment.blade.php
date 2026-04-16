<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Seller Invoice {{ $invoiceNumber }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 12px; margin: 28px; }
        .header { display: table; width: 100%; margin-bottom: 18px; }
        .header > div { display: table-cell; vertical-align: top; width: 50%; }
        h1 { margin: 0 0 4px; font-size: 22px; }
        .muted { color: #64748b; }
        .pill { display: inline-block; padding: 3px 8px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
        .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-top: 14px; }
        .row { display: table; width: 100%; }
        .row > div { display: table-cell; width: 50%; vertical-align: top; }
        .keyval { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .keyval td { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .keyval td:last-child { text-align: right; font-weight: 600; }
        .total { font-size: 16px; font-weight: 700; }
        .footer { margin-top: 18px; color: #64748b; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Invoice</h1>
            <div class="muted">Seller Subscription Payment</div>
            <div style="margin-top: 8px;"><span class="pill">{{ strtoupper($payment->status) }}</span></div>
        </div>
        <div style="text-align: right;">
            <div><strong>{{ $invoiceNumber }}</strong></div>
            <div class="muted">Issued: {{ optional($payment->captured_at ?? $payment->created_at)->format('M d, Y h:i A') }}</div>
            <div class="muted">Generated: {{ $generatedAt->format('M d, Y h:i A') }}</div>
        </div>
    </div>

    <div class="row">
        <div class="card" style="margin-right: 8px;">
            <strong>Billed To</strong>
            <div style="margin-top: 8px;">{{ $seller->name }}</div>
            <div class="muted">{{ $seller->email }}</div>
        </div>
        <div class="card" style="margin-left: 8px;">
            <strong>Payment Provider</strong>
            <div style="margin-top: 8px;">{{ strtoupper($payment->provider) }}</div>
            <div class="muted">Subscription plan billing</div>
        </div>
    </div>

    <div class="card">
        <strong>Payment Reference</strong>
        <table class="keyval">
            <tr>
                <td>Provider</td>
                <td>{{ strtoupper($payment->provider) }}</td>
            </tr>
            <tr>
                <td>Order ID</td>
                <td>{{ $payment->provider_order_id }}</td>
            </tr>
            <tr>
                <td>Capture ID</td>
                <td>{{ $payment->provider_capture_id ?? 'Pending' }}</td>
            </tr>
        </table>
    </div>

    <div class="card">
        <strong>Invoice Breakdown</strong>
        <table class="keyval">
            <tr>
                <td>Plan</td>
                <td>{{ $payment->plan?->name ?? 'Seller Plan' }}</td>
            </tr>
            <tr>
                <td>Duration</td>
                <td>{{ $payment->plan?->duration_days ?? 0 }} days</td>
            </tr>
            <tr>
                <td>Gig Limit</td>
                <td>{{ $payment->plan?->gig_limit ?? 0 }} active gigs</td>
            </tr>
            <tr>
                <td>Subscription Period</td>
                <td>
                    {{ optional($payment->subscription?->starts_at)->format('M d, Y') ?? 'Pending' }}
                    -
                    {{ optional($payment->subscription?->ends_at)->format('M d, Y') ?? 'Pending' }}
                </td>
            </tr>
            <tr>
                <td>Amount</td>
                <td>{{ $payment->currency }} {{ number_format((float) $payment->amount, 2) }}</td>
            </tr>
            <tr>
                <td>Total</td>
                <td class="total">{{ $payment->currency }} {{ number_format((float) $payment->amount, 2) }}</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        This invoice was generated electronically and is valid without signature.
    </div>
</body>
</html>
