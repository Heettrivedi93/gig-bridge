import { Paperclip, SendHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type OrderChatMessage = {
    id: number;
    body: string | null;
    attachment_url: string | null;
    sender_id: number;
    sender_name: string | null;
    receiver_id: number;
    read_at: string | null;
    created_at: string | null;
};

type OrderThreadResponse = {
    recipient: {
        id: number;
        name: string;
        email: string;
    };
    order: {
        id: number;
        status: string;
    };
    messages: OrderChatMessage[];
    message?: string;
};

type StoreOrderMessageResponse = {
    success?: boolean;
    messages?: OrderChatMessage[];
    message?: string;
    errors?: Record<string, string[]>;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: number | null;
    recipientName: string | null;
};

type MessageSentEventPayload = {
    order_id?: number;
    message?: OrderChatMessage;
};

type EchoLike = {
    private: (channel: string) => {
        listen: (
            event: string,
            callback: (payload: MessageSentEventPayload) => void,
        ) => unknown;
    };
    leave?: (channel: string) => void;
    leaveChannel?: (channel: string) => void;
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Just now';
    }

    return new Date(value).toLocaleString();
}

function getCsrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.content;
}

export default function OrderChatModal({
    open,
    onOpenChange,
    orderId,
    recipientName,
}: Props) {
    const [messages, setMessages] = useState<OrderChatMessage[]>([]);
    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);

    const conversationTitle = useMemo(() => {
        if (recipientName) {
            return recipientName;
        }

        return 'Order conversation';
    }, [recipientName]);

    const loadThread = useCallback(
        async (silent = false) => {
            if (!orderId) {
                return;
            }

            if (!silent) {
                setIsLoading(true);
            }

            try {
                const response = await fetch(`/orders/${orderId}/messages`, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                    },
                });

                const payload: OrderThreadResponse = await response
                    .json()
                    .catch(() => ({} as OrderThreadResponse));

                if (!response.ok) {
                    throw new Error(payload.message || 'Failed to load messages.');
                }

                setRecipientId(payload.recipient?.id ?? null);
                setMessages(payload.messages ?? []);
                setError(null);
            } catch (threadError) {
                setError(
                    threadError instanceof Error
                        ? threadError.message
                        : 'Failed to load messages.',
                );
            } finally {
                if (!silent) {
                    setIsLoading(false);
                }
            }
        },
        [orderId],
    );

    const submitMessage = async () => {
        if (!orderId) {
            return;
        }

        const trimmedBody = body.trim();

        if (trimmedBody === '' && !attachment) {
            setError('Write a message or attach a file before sending.');

            return;
        }

        setIsSending(true);
        setError(null);

        const formData = new FormData();
        formData.append('body', trimmedBody);

        if (attachment) {
            formData.append('attachment', attachment);
        }

        try {
            const response = await fetch(`/orders/${orderId}/messages`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    ...(getCsrfToken()
                        ? { 'X-CSRF-TOKEN': getCsrfToken()! }
                        : {}),
                },
                body: formData,
            });

            const payload: StoreOrderMessageResponse = await response
                .json()
                .catch(() => ({} as StoreOrderMessageResponse));

            if (!response.ok) {
                const firstError = payload.errors
                    ? Object.values(payload.errors).flat()[0]
                    : null;

                throw new Error(
                    firstError || payload.message || 'Failed to send message.',
                );
            }

            setMessages(payload.messages ?? []);
            setBody('');
            setAttachment(null);
        } catch (sendError) {
            setError(
                sendError instanceof Error
                    ? sendError.message
                    : 'Failed to send message.',
            );
        } finally {
            setIsSending(false);
        }
    };

    const sendMessage = async (event: React.FormEvent) => {
        event.preventDefault();
        await submitMessage();
    };

    const handleMessageKeyDown = (
        event: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();

        if (isSending) {
            return;
        }

        void submitMessage();
    };

    useEffect(() => {
        if (!open || !orderId) {
            setMessages([]);
            setRecipientId(null);
            setError(null);
            setBody('');
            setAttachment(null);

            return;
        }

        void loadThread();
    }, [open, orderId, loadThread]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const container = messagesContainerRef.current;

        if (!container) {
            return;
        }

        container.scrollTop = container.scrollHeight;
    }, [messages, open]);

    useEffect(() => {
        const echo = window.Echo as EchoLike | undefined;

        if (!open || !orderId || echo) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void loadThread(true);
        }, 6000);

        return () => window.clearInterval(intervalId);
    }, [open, orderId, loadThread]);

    useEffect(() => {
        const echo = window.Echo as EchoLike | undefined;

        if (!open || !orderId || !echo) {
            return;
        }

        const channelName = `orders.${orderId}.messages`;
        const channel = echo.private(channelName);

        channel.listen('.message.sent', (payload: MessageSentEventPayload) => {
            const incomingMessage = payload.message;

            if (!incomingMessage) {
                return;
            }

            setMessages((current) => {
                if (current.some((message) => message.id === incomingMessage.id)) {
                    return current;
                }

                return [...current, incomingMessage];
            });
        });

        return () => {
            echo.leave?.(channelName);
            echo.leaveChannel?.(`private-${channelName}`);
        };
    }, [open, orderId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{conversationTitle}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Order #{orderId ?? 'N/A'}
                    </p>
                </DialogHeader>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div
                        ref={messagesContainerRef}
                        className="max-h-80 space-y-3 overflow-y-auto pr-1"
                    >
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground">
                                Loading chat...
                            </p>
                        ) : messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No messages yet. Start the conversation.
                            </p>
                        ) : (
                            messages.map((message) => {
                                const ownMessage =
                                    recipientId !== null &&
                                    message.sender_id !== recipientId;

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${
                                            ownMessage
                                                ? 'justify-end'
                                                : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                                                ownMessage
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-background'
                                            }`}
                                        >
                                            {message.body && (
                                                <p className="whitespace-pre-line leading-6">
                                                    {message.body}
                                                </p>
                                            )}
                                            {message.attachment_url && (
                                                <a
                                                    href={message.attachment_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`mt-2 inline-flex items-center gap-2 underline underline-offset-4 ${
                                                        ownMessage
                                                            ? 'text-primary-foreground'
                                                            : 'text-primary'
                                                    }`}
                                                >
                                                    <Paperclip className="size-4" />
                                                    Open attachment
                                                </a>
                                            )}
                                            <p
                                                className={`mt-2 text-xs ${
                                                    ownMessage
                                                        ? 'text-primary-foreground/80'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {formatDate(message.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <form onSubmit={sendMessage} className="space-y-3">
                    <textarea
                        rows={4}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        onKeyDown={handleMessageKeyDown}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                        placeholder="Type your message..."
                    />
                    <Input
                        type="file"
                        onChange={(event) =>
                            setAttachment(event.target.files?.[0] ?? null)
                        }
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSending}>
                            <SendHorizontal className="mr-2 size-4" />
                            {isSending ? 'Sending...' : 'Send'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
