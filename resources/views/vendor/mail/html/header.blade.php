@props(['url'])
@php
    use Illuminate\Support\Facades\Storage;
    $logoPath = \App\Models\Setting::getValue('brand_logo_path');
    $logoUrl = $logoPath ? url(Storage::disk('public')->url($logoPath)) : null;
    $siteName = (string) (\App\Models\Setting::getValue('brand_site_name', config('app.name')) ?: config('app.name'));
    $defaultIconBase64 = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDggNDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzE4MTgxYiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IndoaXRlIi8+PGNpcmNsZSBjeD0iMzYiIGN5PSIxMiIgcj0iNCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTYgMTJIMzIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTggMzBDMTIgMjEuNSAxNy41IDE3IDI0IDE3QzMwLjUgMTcgMzYgMjEuNSA0MCAzMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTQgMzBWMzhNMzQgMzBWMzgiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTEwIDM4SDM4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==';
@endphp
<tr>
<td class="header">
<a href="{{ $url }}" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;">
@if ($logoUrl)
    <img src="{{ $logoUrl }}" alt="{{ $siteName }}" style="max-height:40px;width:auto;display:block;">
@else
    <img src="{{ $defaultIconBase64 }}" alt="{{ $siteName }}" style="width:36px;height:36px;border-radius:8px;display:block;">
    <span style="font-size:16px;font-weight:700;color:#1a1a1a;font-family:sans-serif;">{{ $siteName }}</span>
@endif
</a>
</td>
</tr>
