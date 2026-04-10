<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Services\DisputeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminDisputeController extends Controller
{
    public function __construct(private readonly DisputeService $disputes) {}

    public function index(): Response
    {
        $disputes = Dispute::query()
            ->with([
                'order.gig:id,title',
                'order.buyer:id,name,email',
                'order.seller:id,name,email',
                'raisedBy:id,name',
                'resolvedBy:id,name',
            ])
            ->latest()
            ->get()
            ->map(fn (Dispute $dispute) => [
                'id' => $dispute->id,
                'order_id' => $dispute->order_id,
                'order_gig_title' => $dispute->order->gig?->title,
                'order_price' => (string) $dispute->order->price,
                'order_status' => $dispute->order->status,
                'order_fund_status' => $dispute->order->fund_status,
                'buyer' => $dispute->order->buyer ? ['name' => $dispute->order->buyer->name, 'email' => $dispute->order->buyer->email] : null,
                'seller' => $dispute->order->seller ? ['name' => $dispute->order->seller->name, 'email' => $dispute->order->seller->email] : null,
                'raised_by' => $dispute->raisedBy?->name,
                'reason' => $dispute->reason,
                'status' => $dispute->status,
                'decision' => $dispute->decision,
                'partial_amount' => $dispute->partial_amount ? (string) $dispute->partial_amount : null,
                'admin_note' => $dispute->admin_note,
                'resolved_by' => $dispute->resolvedBy?->name,
                'resolved_at' => $dispute->resolved_at?->toIso8601String(),
                'created_at' => $dispute->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/disputes/index', [
            'disputes' => $disputes,
            'stats' => [
                ['label' => 'Total', 'value' => $disputes->count()],
                ['label' => 'Open', 'value' => $disputes->where('status', 'open')->count()],
                ['label' => 'Resolved', 'value' => $disputes->where('status', 'resolved')->count()],
            ],
        ]);
    }

    public function show(Request $request, Dispute $dispute): Response
    {
        $adminId = $request->user()->id;

        $dispute->load([
            'order.gig:id,title',
            'order.buyer:id,name,email',
            'order.seller:id,name,email',
            'order.deliveries.user:id,name',
            'raisedBy:id,name',
            'resolvedBy:id,name',
            'messages.sender:id,name',
        ]);

        return Inertia::render('admin/disputes/show', [
            'dispute' => [
                'id' => $dispute->id,
                'order_id' => $dispute->order_id,
                'order_gig_title' => $dispute->order->gig?->title,
                'order_price' => (string) $dispute->order->price,
                'order_gross_amount' => (string) $dispute->order->gross_amount,
                'order_seller_net_amount' => (string) $dispute->order->seller_net_amount,
                'order_platform_fee_percentage' => (string) $dispute->order->platform_fee_percentage,
                'order_status' => $dispute->order->status,
                'order_fund_status' => $dispute->order->fund_status,
                'order_payment_status' => $dispute->order->payment_status,
                'order_requirements' => $dispute->order->requirements,
                'buyer' => $dispute->order->buyer ? ['name' => $dispute->order->buyer->name, 'email' => $dispute->order->buyer->email] : null,
                'seller' => $dispute->order->seller ? ['name' => $dispute->order->seller->name, 'email' => $dispute->order->seller->email] : null,
                'order_deliveries' => $dispute->order->deliveries->map(fn ($d) => [
                    'id' => $d->id,
                    'file_url' => Storage::disk('public')->url($d->file_path),
                    'note' => $d->note,
                    'delivered_at' => $d->delivered_at?->toIso8601String(),
                    'delivered_by' => $d->user?->name,
                ])->values(),
                'raised_by' => $dispute->raisedBy?->name,
                'reason' => $dispute->reason,
                'status' => $dispute->status,
                'decision' => $dispute->decision,
                'partial_amount' => $dispute->partial_amount ? (string) $dispute->partial_amount : null,
                'admin_note' => $dispute->admin_note,
                'resolved_by' => $dispute->resolvedBy?->name,
                'resolved_at' => $dispute->resolved_at?->toIso8601String(),
                'created_at' => $dispute->created_at?->toIso8601String(),
                'messages' => $dispute->messages->map(fn ($msg) => [
                    'id' => $msg->id,
                    'sender_id' => $msg->sender_id,
                    'sender_name' => $msg->sender?->name,
                    'is_mine' => $msg->sender_id === $adminId,
                    'body' => $msg->body,
                    'attachment_url' => $msg->attachment_path ? Storage::disk('public')->url($msg->attachment_path) : null,
                    'created_at' => $msg->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function sendMessage(Request $request, Dispute $dispute): RedirectResponse
    {
        if ($dispute->status === 'resolved') {
            return back()->withErrors(['body' => 'Cannot send messages on a resolved dispute.']);
        }

        $data = $request->validate([
            'body' => ['required_without:attachment', 'nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:8192'],
        ]);

        $dispute->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $data['body'] ?? null,
            'attachment_path' => $request->file('attachment')?->store('dispute-attachments', 'public'),
        ]);

        return back()->with('success', 'Message sent.');
    }

    public function resolve(Request $request, Dispute $dispute): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', Rule::in(['full_refund', 'partial_refund', 'release'])],
            'partial_amount' => ['required_if:decision,partial_refund', 'nullable', 'numeric', 'min:1', 'max:99'],
            'admin_note' => ['nullable', 'string', 'max:3000'],
        ]);

        $this->disputes->resolve(
            $dispute,
            $request->user(),
            $data['decision'],
            isset($data['partial_amount']) ? (float) $data['partial_amount'] : null,
            $data['admin_note'] ?? null,
        );

        return back()->with('success', sprintf('Dispute #%d resolved.', $dispute->id));
    }
}
