<?php

namespace App\Http\Controllers;

use App\Events\OrderMessageSent;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use App\Services\SellerRankingService;
use App\Services\SystemNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function __construct(
        private readonly SystemNotificationService $notifications,
        private readonly SellerRankingService $sellerRanking,
    ) {}

    public function index(Request $request): Response
    {
        $user = $this->ensureMessenger($request);
        $contacts = $this->contactOptions($user);
        $messages = Message::query()
            ->with([
                'sender:id,name,email',
                'receiver:id,name,email',
                'order:id,gig_id,package_id,status',
                'order.gig:id,title',
                'order.package:id,title,tier',
            ])
            ->where(function ($query) use ($user) {
                $query->where('sender_id', $user->id)
                    ->orWhere('receiver_id', $user->id);
            })
            ->latest('created_at')
            ->get();

        $threads = $messages
            ->groupBy(function (Message $message) use ($user) {
                $counterpartId = $message->sender_id === $user->id
                    ? $message->receiver_id
                    : $message->sender_id;

                return sprintf('%d:%d', $counterpartId, $message->order_id ?? 0);
            })
            ->map(function (Collection $group) use ($user) {
                /** @var Message $latest */
                $latest = $group->sortByDesc('created_at')->first();
                $counterpart = $latest->sender_id === $user->id
                    ? $latest->receiver
                    : $latest->sender;

                return [
                    'recipient' => [
                        'id' => $counterpart?->id,
                        'name' => $counterpart?->name,
                        'email' => $counterpart?->email,
                    ],
                    'order' => $latest->order ? [
                        'id' => $latest->order->id,
                        'gig_title' => $latest->order->gig?->title,
                        'package_title' => $latest->order->package?->title,
                        'status' => $latest->order->status,
                    ] : null,
                    'last_message' => [
                        'body' => $latest->body,
                        'attachment_url' => $latest->attachment_path
                            ? Storage::disk('public')->url($latest->attachment_path)
                            : null,
                        'created_at' => $latest->created_at?->toIso8601String(),
                        'sender_id' => $latest->sender_id,
                    ],
                    'unread_count' => $group
                        ->where('receiver_id', $user->id)
                        ->whereNull('read_at')
                        ->count(),
                ];
            })
            ->filter(fn (array $thread) => filled($thread['recipient']['id'] ?? null))
            ->sortByDesc(fn (array $thread) => $thread['last_message']['created_at'] ?? '')
            ->values();

        $requestedRecipientId = $request->integer('recipient_id') ?: null;
        $requestedOrderId = $request->integer('order_id') ?: null;
        $defaultThread = $threads->first();
        $activeRecipientId = $requestedRecipientId ?? data_get($defaultThread, 'recipient.id');
        $activeOrderId = $requestedRecipientId !== null
            ? $requestedOrderId
            : data_get($defaultThread, 'order.id');

        $activeThread = $this->activeThreadPayload(
            $user,
            $contacts,
            $activeRecipientId,
            $activeOrderId,
        );

        if ($activeThread) {
            $threads = $threads->map(function (array $thread) use ($activeThread) {
                $isActive = ($thread['recipient']['id'] ?? null) === ($activeThread['recipient']['id'] ?? null)
                    && ($thread['order']['id'] ?? null) === ($activeThread['order']['id'] ?? null);

                if (! $isActive) {
                    return $thread;
                }

                $thread['unread_count'] = 0;

                return $thread;
            })->values();
        }

        return Inertia::render('messages/index', [
            'threads' => $threads,
            'contacts' => $contacts->values(),
            'activeThread' => $activeThread,
            'selected' => [
                'recipient_id' => $activeThread['recipient']['id'] ?? null,
                'order_id' => $activeThread['order']['id'] ?? null,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $sender = $this->ensureMessenger($request);

        $data = $request->validate([
            'receiver_id' => ['required', 'integer', 'exists:users,id'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'body' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:12288'],
        ]);

        $body = trim((string) ($data['body'] ?? ''));

        if ($body === '' && ! $request->hasFile('attachment')) {
            throw ValidationException::withMessages([
                'body' => 'Write a message or attach a file before sending.',
            ]);
        }

        $receiver = User::query()->findOrFail($data['receiver_id']);
        $order = $this->resolveAccessibleOrder($sender, $receiver, $data['order_id'] ?? null);

        Message::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'order_id' => $order?->id,
            'body' => $body !== '' ? $body : null,
            'attachment_path' => $request->file('attachment')?->store('messages', 'public'),
        ]);

        $this->notifications->newMessage(
            $sender,
            $receiver,
            $order,
            Str::limit($body !== '' ? $body : 'Sent an attachment.', 120),
        );

        if ($sender->hasRole('seller')) {
            $this->sellerRanking->recalculate($sender);
        }

        return redirect()
            ->route('messages.index', array_filter([
                'recipient_id' => $receiver->id,
                'order_id' => $order?->id,
            ]))
            ->with('success', 'Message sent successfully.');
    }

    public function orderThread(Request $request, Order $order): JsonResponse
    {
        $user = $this->ensureMessenger($request);
        $recipient = $this->counterpartForOrder($user, $order);

        Message::query()
            ->where('order_id', $order->id)
            ->where('sender_id', $recipient->id)
            ->where('receiver_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'recipient' => [
                'id' => $recipient->id,
                'name' => $recipient->name,
                'email' => $recipient->email,
            ],
            'order' => [
                'id' => $order->id,
                'status' => $order->status,
            ],
            'messages' => $this->orderMessagesPayload($user, $recipient, $order),
        ]);
    }

    public function storeForOrder(Request $request, Order $order): JsonResponse
    {
        $sender = $this->ensureMessenger($request);
        $receiver = $this->counterpartForOrder($sender, $order);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:12288'],
        ]);

        $body = trim((string) ($data['body'] ?? ''));

        if ($body === '' && ! $request->hasFile('attachment')) {
            throw ValidationException::withMessages([
                'body' => 'Write a message or attach a file before sending.',
            ]);
        }

        $message = Message::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'order_id' => $order->id,
            'body' => $body !== '' ? $body : null,
            'attachment_path' => $request->file('attachment')?->store('messages', 'public'),
        ]);

        $message->loadMissing([
            'sender:id,name',
            'receiver:id,name',
        ]);

        $this->notifications->newMessage(
            $sender,
            $receiver,
            $order,
            Str::limit($body !== '' ? $body : 'Sent an attachment.', 120),
        );

        if ($sender->hasRole('seller')) {
            $this->sellerRanking->recalculate($sender);
        }

        OrderMessageSent::dispatch($order->id, $this->messagePayload($message));

        return response()->json([
            'success' => true,
            'messages' => $this->orderMessagesPayload($sender, $receiver, $order),
        ], 201);
    }

    private function ensureMessenger(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);

        $permissions = $user->effectivePortalPermissions();
        $canMessage = in_array('buyer.messages.access', $permissions, true)
            || in_array('seller.messages.access', $permissions, true);

        abort_unless($canMessage, 403);

        return $user;
    }

    private function contactOptions(User $user): Collection
    {
        $isBuyer = $user->hasRole('buyer');

        return Order::query()
            ->with([
                'buyer:id,name,email',
                'seller:id,name,email',
                'gig:id,title',
                'package:id,title,tier',
            ])
            ->when($isBuyer, fn ($query) => $query->where('buyer_id', $user->id))
            ->when(! $isBuyer, fn ($query) => $query->where('seller_id', $user->id))
            ->latest('updated_at')
            ->latest('id')
            ->get()
            ->groupBy(fn (Order $order) => $isBuyer ? $order->seller_id : $order->buyer_id)
            ->map(function (Collection $orders) use ($isBuyer) {
                /** @var Order $latestOrder */
                $latestOrder = $orders->first();
                $recipient = $isBuyer ? $latestOrder->seller : $latestOrder->buyer;

                return [
                    'recipient' => [
                        'id' => $recipient?->id,
                        'name' => $recipient?->name,
                        'email' => $recipient?->email,
                    ],
                    'orders' => $orders
                        ->map(fn (Order $order) => [
                            'id' => $order->id,
                            'gig_title' => $order->gig?->title,
                            'package_title' => $order->package?->title,
                            'status' => $order->status,
                        ])
                        ->values(),
                ];
            })
            ->filter(fn (array $contact) => filled($contact['recipient']['id'] ?? null))
            ->sortBy('recipient.name')
            ->values();
    }

    private function activeThreadPayload(
        User $user,
        Collection $contacts,
        ?int $recipientId,
        ?int $orderId,
    ): ?array {
        if (! $recipientId) {
            return null;
        }

        $contact = $contacts->firstWhere('recipient.id', $recipientId);
        abort_if($contact === null, 403);

        $allowedOrderIds = collect($contact['orders'])->pluck('id');
        abort_if($orderId !== null && ! $allowedOrderIds->contains($orderId), 403);

        Message::query()
            ->where('sender_id', $recipientId)
            ->where('receiver_id', $user->id)
            ->when(
                $orderId !== null,
                fn ($query) => $query->where('order_id', $orderId),
                fn ($query) => $query->whereNull('order_id'),
            )
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = Message::query()
            ->with([
                'sender:id,name,email',
                'receiver:id,name,email',
                'order:id,gig_id,package_id,status',
                'order.gig:id,title',
                'order.package:id,title,tier',
            ])
            ->where(function ($query) use ($user, $recipientId) {
                $query->where(function ($inner) use ($user, $recipientId) {
                    $inner->where('sender_id', $user->id)
                        ->where('receiver_id', $recipientId);
                })->orWhere(function ($inner) use ($user, $recipientId) {
                    $inner->where('sender_id', $recipientId)
                        ->where('receiver_id', $user->id);
                });
            })
            ->when(
                $orderId !== null,
                fn ($query) => $query->where('order_id', $orderId),
                fn ($query) => $query->whereNull('order_id'),
            )
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message) => [
                'id' => $message->id,
                'body' => $message->body,
                'attachment_url' => $message->attachment_path
                    ? Storage::disk('public')->url($message->attachment_path)
                    : null,
                'sender_id' => $message->sender_id,
                'sender_name' => $message->sender?->name,
                'receiver_id' => $message->receiver_id,
                'read_at' => $message->read_at?->toIso8601String(),
                'created_at' => $message->created_at?->toIso8601String(),
            ])
            ->values();

        $activeOrder = collect($contact['orders'])->firstWhere('id', $orderId);

        return [
            'recipient' => $contact['recipient'],
            'order' => $activeOrder,
            'messages' => $messages,
        ];
    }

    private function resolveAccessibleOrder(User $sender, User $receiver, ?int $orderId): ?Order
    {
        if ($orderId !== null) {
            $order = Order::query()->findOrFail($orderId);

            $participants = [$order->buyer_id, $order->seller_id];
            $expectedCounterpart = $sender->id === $order->buyer_id
                ? $order->seller_id
                : ($sender->id === $order->seller_id ? $order->buyer_id : null);

            abort_unless(in_array($sender->id, $participants, true), 403);
            abort_unless($expectedCounterpart === $receiver->id, 403);

            return $order;
        }

        $sharedOrderExists = Order::query()
            ->where(function ($query) use ($sender, $receiver) {
                $query->where('buyer_id', $sender->id)
                    ->where('seller_id', $receiver->id);
            })
            ->orWhere(function ($query) use ($sender, $receiver) {
                $query->where('buyer_id', $receiver->id)
                    ->where('seller_id', $sender->id);
            })
            ->exists();

        abort_unless($sharedOrderExists, 403);

        return null;
    }

    private function counterpartForOrder(User $user, Order $order): User
    {
        $isBuyer = $order->buyer_id === $user->id;
        $isSeller = $order->seller_id === $user->id;
        abort_unless($isBuyer || $isSeller, 403);

        $counterpartId = $isBuyer ? $order->seller_id : $order->buyer_id;
        $counterpart = User::query()->find($counterpartId);
        abort_unless($counterpart instanceof User, 404);

        return $counterpart;
    }

    private function orderMessagesPayload(User $user, User $recipient, Order $order): array
    {
        return Message::query()
            ->with([
                'sender:id,name',
                'receiver:id,name',
            ])
            ->where('order_id', $order->id)
            ->where(function ($query) use ($user, $recipient) {
                $query->where(function ($inner) use ($user, $recipient) {
                    $inner->where('sender_id', $user->id)
                        ->where('receiver_id', $recipient->id);
                })->orWhere(function ($inner) use ($user, $recipient) {
                    $inner->where('sender_id', $recipient->id)
                        ->where('receiver_id', $user->id);
                });
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message) => $this->messagePayload($message))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(Message $message): array
    {
        return [
            'id' => $message->id,
            'body' => $message->body,
            'attachment_url' => $message->attachment_path
                ? Storage::disk('public')->url($message->attachment_path)
                : null,
            'sender_id' => $message->sender_id,
            'sender_name' => $message->sender?->name,
            'receiver_id' => $message->receiver_id,
            'read_at' => $message->read_at?->toIso8601String(),
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
