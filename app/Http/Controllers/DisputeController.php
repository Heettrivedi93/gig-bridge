<?php

namespace App\Http\Controllers;

use App\Events\DisputeMessageSent;
use App\Models\Dispute;
use App\Models\Order;
use App\Services\SystemNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DisputeController extends Controller
{
    public function __construct(
        private readonly SystemNotificationService $notifications,
    ) {}
    public function index(Request $request): Response
    {
        $user = $request->user();

        $disputes = Dispute::query()
            ->with(['order.gig:id,title', 'raisedBy:id,name', 'resolvedBy:id,name'])
            ->whereHas('order', fn ($q) => $q
                ->where('buyer_id', $user->id)
                ->orWhere('seller_id', $user->id)
            )
            ->latest()
            ->get()
            ->map(fn (Dispute $dispute) => [
                'id'             => $dispute->id,
                'order_id'       => $dispute->order_id,
                'order_gig_title' => $dispute->order->gig?->title,
                'raised_by'      => $dispute->raisedBy?->name,
                'reason'         => $dispute->reason,
                'status'         => $dispute->status,
                'decision'       => $dispute->decision,
                'partial_amount' => $dispute->partial_amount ? (string) $dispute->partial_amount : null,
                'admin_note'     => $dispute->admin_note,
                'resolved_by'    => $dispute->resolvedBy?->name,
                'resolved_at'    => $dispute->resolved_at?->toIso8601String(),
                'created_at'     => $dispute->created_at?->toIso8601String(),
                'messages_count' => $dispute->messages()->count(),
            ]);

        return Inertia::render('disputes/index', [
            'disputes' => $disputes,
        ]);
    }

    public function store(Request $request, Order $order): RedirectResponse
    {
        $user = $request->user();

        abort_unless(
            $order->buyer_id === $user->id || $order->seller_id === $user->id,
            403,
        );

        if (! in_array($order->status, ['delivered', 'completed'], true)) {
            throw ValidationException::withMessages([
                'reason' => 'Disputes can only be raised on delivered or completed orders.',
            ]);
        }

        if ($order->payment_status === 'released') {
            throw ValidationException::withMessages([
                'reason' => 'Payment has already been released to the seller. Disputes cannot be raised after funds are released.',
            ]);
        }

        if ($order->disputes()->where('status', 'open')->exists()) {
            throw ValidationException::withMessages([
                'reason' => 'An open dispute already exists for this order.',
            ]);
        }

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:3000'],
        ]);

        $order->disputes()->create([
            'raised_by' => $user->id,
            'reason' => $data['reason'],
            'status' => 'open',
        ]);

        $this->notifications->disputeRaised($order, $user);

        return back()->with('success', 'Dispute raised successfully. Admin will review shortly.');
    }

    public function show(Request $request, Dispute $dispute): Response
    {
        $user = $request->user();
        $dispute->loadMissing(['order', 'raisedBy:id,name', 'resolvedBy:id,name', 'messages.sender:id,name']);

        abort_unless(
            $dispute->order->buyer_id === $user->id || $dispute->order->seller_id === $user->id,
            403,
        );

        return Inertia::render('disputes/show', [
            'dispute' => $this->formatDispute($dispute, $user->id),
        ]);
    }

    public function sendMessage(Request $request, Dispute $dispute): RedirectResponse
    {
        $user = $request->user();
        $dispute->loadMissing('order');

        abort_unless(
            $dispute->order->buyer_id === $user->id || $dispute->order->seller_id === $user->id,
            403,
        );

        if ($dispute->status === 'resolved') {
            throw ValidationException::withMessages(['body' => 'Cannot send messages on a resolved dispute.']);
        }

        $data = $request->validate([
            'body' => ['required_without:attachment', 'nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:8192'],
        ]);

        $msg = $dispute->messages()->create([
            'sender_id' => $user->id,
            'body' => $data['body'] ?? null,
            'attachment_path' => $request->file('attachment')?->store('dispute-attachments', 'public'),
        ]);

        DisputeMessageSent::dispatch($dispute->id, [
            'id' => $msg->id,
            'sender_id' => $msg->sender_id,
            'sender_name' => $user->name,
            'is_mine' => false, // receiver-side default; frontend overrides by sender_id
            'body' => $msg->body,
            'attachment_url' => $msg->attachment_path ? Storage::disk('public')->url($msg->attachment_path) : null,
            'created_at' => $msg->created_at?->toIso8601String(),
        ]);

        return back()->with('success', 'Message sent.');
    }

    private function formatDispute(Dispute $dispute, int $authUserId): array
    {
        $dispute->loadMissing(['order.gig:id,title', 'order.buyer:id,name', 'order.seller:id,name']);

        return [
            'id' => $dispute->id,
            'order_id' => $dispute->order_id,
            'order_gig_title' => $dispute->order->gig?->title,
            'order_buyer' => $dispute->order->buyer ? ['id' => $dispute->order->buyer->id, 'name' => $dispute->order->buyer->name] : null,
            'order_seller' => $dispute->order->seller ? ['id' => $dispute->order->seller->id, 'name' => $dispute->order->seller->name] : null,
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
                'is_mine' => $msg->sender_id === $authUserId,
                'body' => $msg->body,
                'attachment_url' => $msg->attachment_path ? Storage::disk('public')->url($msg->attachment_path) : null,
                'created_at' => $msg->created_at?->toIso8601String(),
            ])->values(),
        ];
    }
}
