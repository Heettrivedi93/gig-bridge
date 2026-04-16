import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    MessageSquare,
    Paperclip,
    PlusIcon,
    SendHorizontal,
    ShoppingBag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { roleLayout } from '@/hooks/use-role-layout';

type Thread = {
    recipient: {
        id: number;
        name: string;
        email: string;
    };
    order: {
        id: number;
        gig_title: string | null;
        package_title: string | null;
        status: string;
    } | null;
    last_message: {
        body: string | null;
        attachment_url: string | null;
        created_at: string | null;
        sender_id: number;
    };
    unread_count: number;
};

type Contact = {
    recipient: {
        id: number;
        name: string;
        email: string;
    };
    orders: {
        id: number;
        gig_title: string | null;
        package_title: string | null;
        status: string;
    }[];
};

type ActiveThread = {
    recipient: {
        id: number;
        name: string;
        email: string;
    };
    order: {
        id: number;
        gig_title: string | null;
        package_title: string | null;
        status: string;
    } | null;
    messages: {
        id: number;
        body: string | null;
        attachment_url: string | null;
        sender_id: number;
        sender_name: string | null;
        receiver_id: number;
        read_at: string | null;
        created_at: string | null;
    }[];
} | null;

type Props = {
    threads: Thread[];
    contacts: Contact[];
    activeThread: ActiveThread;
    selected: {
        recipient_id: number | null;
        order_id: number | null;
    };
};

type MessageForm = {
    body: string;
    attachment: File | null;
};

type NewMessageForm = {
    receiver_id: string;
    order_id: string;
};

function threadHref(recipientId: number, orderId?: number | null) {
    const params = new URLSearchParams();
    params.set('recipient_id', String(recipientId));

    if (orderId) {
        params.set('order_id', String(orderId));
    }

    return `/messages?${params.toString()}`;
}

function formatDate(value: string | null) {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatOrderLabel(order: {
    id: number;
    gig_title: string | null;
    package_title: string | null;
    status: string;
}) {
    return `#${order.id} ${order.gig_title ?? order.package_title ?? 'Order'}`;
}

export default function MessagesIndex({
    threads,
    contacts,
    activeThread,
    selected,
}: Props) {
    const [showComposer, setShowComposer] = useState(false);
    const replyForm = useForm<MessageForm>({
        body: '',
        attachment: null,
    });
    const newMessageForm = useForm<NewMessageForm>({
        receiver_id: selected.recipient_id ? String(selected.recipient_id) : '',
        order_id: selected.order_id ? String(selected.order_id) : 'general',
    });

    const selectedContact = useMemo(
        () =>
            contacts.find(
                (contact) =>
                    String(contact.recipient.id) ===
                    newMessageForm.data.receiver_id,
            ) ?? null,
        [contacts, newMessageForm.data.receiver_id],
    );

    const openComposer = () => {
        newMessageForm.setData({
            receiver_id: selected.recipient_id
                ? String(selected.recipient_id)
                : '',
            order_id: selected.order_id ? String(selected.order_id) : 'general',
        });
        newMessageForm.clearErrors();
        setShowComposer(true);
    };

    const startConversation = (event: React.FormEvent) => {
        event.preventDefault();

        if (!newMessageForm.data.receiver_id) {
            newMessageForm.setError('receiver_id', 'Select a recipient.');

            return;
        }

        router.get(
            '/messages',
            {
                recipient_id: newMessageForm.data.receiver_id,
                order_id:
                    newMessageForm.data.order_id === 'general'
                        ? undefined
                        : newMessageForm.data.order_id,
            },
            {
                preserveState: false,
                preserveScroll: true,
                onSuccess: () => setShowComposer(false),
            },
        );
    };

    const submitReply = (event: React.FormEvent) => {
        event.preventDefault();

        if (!activeThread) {
            return;
        }

        replyForm.transform((data) => ({
            ...data,
            receiver_id: String(activeThread.recipient.id),
            order_id: activeThread.order?.id ? String(activeThread.order.id) : '',
        }));

        replyForm.post('/messages', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                replyForm.reset('body', 'attachment');
            },
        });
    };

    return (
        <>
            <Head title="Messages" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Messages"
                    description="Open an existing conversation or start a new one with the right buyer, seller, and optional order context."
                />

                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <section className="rounded-2xl border border-border/70 bg-card">
                        <div className="border-b border-border/70 px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="font-semibold">
                                        Conversations
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Existing order conversations and general chats.
                                    </p>
                                </div>
                                <Button size="sm" onClick={openComposer}>
                                    <PlusIcon className="mr-2 size-4" />
                                    New message
                                </Button>
                            </div>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-3">
                            {threads.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                                    <MessageSquare className="mx-auto size-8 text-muted-foreground" />
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        No conversations yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {threads.map((thread) => {
                                        const active =
                                            selected.recipient_id ===
                                                thread.recipient.id &&
                                            (selected.order_id ?? null) ===
                                                (thread.order?.id ?? null);

                                        return (
                                            <Link
                                                key={`${thread.recipient.id}:${thread.order?.id ?? 'general'}`}
                                                href={threadHref(
                                                    thread.recipient.id,
                                                    thread.order?.id,
                                                )}
                                                className={`block rounded-xl border p-4 transition ${
                                                    active
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border/70 hover:bg-muted/30'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">
                                                            {thread.recipient.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {thread.order
                                                                ? formatOrderLabel(
                                                                      thread.order,
                                                                  )
                                                                : 'General thread'}
                                                        </p>
                                                    </div>
                                                    {thread.unread_count > 0 && (
                                                        <Badge>
                                                            {thread.unread_count}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="mt-3 text-sm text-muted-foreground">
                                                    {thread.last_message.body ||
                                                        'Attachment sent'}
                                                </p>
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    {formatDate(
                                                        thread.last_message.created_at,
                                                    )}
                                                </p>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="rounded-2xl border border-border/70 bg-card p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="font-semibold">
                                        {activeThread
                                            ? activeThread.recipient.name
                                            : 'Choose a conversation'}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {activeThread
                                            ? activeThread.recipient.email
                                            : 'Pick a conversation from the left, or start a new one from the button above.'}
                                    </p>
                                </div>

                                {activeThread?.order && (
                                    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                                        <div className="flex items-center gap-2 font-medium">
                                            <ShoppingBag className="size-4" />
                                            Order #{activeThread.order.id}
                                        </div>
                                        <p className="mt-1 text-muted-foreground">
                                            {activeThread.order.gig_title}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-card">
                            <div className="max-h-[46vh] space-y-4 overflow-y-auto p-5">
                                {!activeThread ? (
                                    <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
                                        <MessageSquare className="mx-auto size-8 text-muted-foreground" />
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            Select a conversation from the left, or start a new one when you need to reach someone directly.
                                        </p>
                                        <Button
                                            className="mt-4"
                                            size="sm"
                                            onClick={openComposer}
                                        >
                                            <PlusIcon className="mr-2 size-4" />
                                            New message
                                        </Button>
                                    </div>
                                ) : activeThread.messages.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                                        No messages in this thread yet.
                                    </div>
                                ) : (
                                    activeThread.messages.map((message) => {
                                        const ownMessage =
                                            message.sender_id !==
                                            activeThread.recipient.id;

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
                                                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                                                        ownMessage
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted/40'
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
                                                            className={`mt-3 inline-flex items-center gap-2 underline underline-offset-4 ${
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
                                                        className={`mt-3 text-xs ${
                                                            ownMessage
                                                                ? 'text-primary-foreground/80'
                                                                : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {formatDate(
                                                            message.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {activeThread && (
                            <form
                                onSubmit={submitReply}
                                className="rounded-2xl border border-border/70 bg-card p-5"
                            >
                                <div>
                                    <p className="font-medium">
                                        Replying to {activeThread.recipient.name}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {activeThread.order
                                            ? `${formatOrderLabel(activeThread.order)} • ${activeThread.order.status}`
                                            : 'General conversation'}
                                    </p>
                                </div>

                                <div className="mt-4 grid gap-2">
                                    <Label htmlFor="message-body">Message</Label>
                                    <textarea
                                        id="message-body"
                                        rows={5}
                                        value={replyForm.data.body}
                                        onChange={(event) =>
                                            replyForm.setData(
                                                'body',
                                                event.target.value,
                                            )
                                        }
                                        className="min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        placeholder="Write your message here..."
                                    />
                                    <InputError message={replyForm.errors.body} />
                                </div>

                                <div className="mt-4 grid gap-2">
                                    <Label htmlFor="message-attachment">
                                        Attachment
                                    </Label>
                                    <Input
                                        id="message-attachment"
                                        type="file"
                                        onChange={(event) =>
                                            replyForm.setData(
                                                'attachment',
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={replyForm.errors.attachment}
                                    />
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={replyForm.processing}
                                    >
                                        <SendHorizontal className="mr-2 size-4" />
                                        {replyForm.processing
                                            ? 'Sending…'
                                            : 'Send message'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            </div>

            <Dialog open={showComposer} onOpenChange={setShowComposer}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Message</DialogTitle>
                        <DialogDescription>
                            Pick who you want to contact first, then choose whether this should stay general or link to a shared order.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={startConversation} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Recipient</Label>
                            <Select
                                value={newMessageForm.data.receiver_id}
                                onValueChange={(value) => {
                                    const contact =
                                        contacts.find(
                                            (item) =>
                                                String(item.recipient.id) ===
                                                value,
                                        ) ?? null;

                                    newMessageForm.setData(
                                        'receiver_id',
                                        value,
                                    );
                                    newMessageForm.setData(
                                        'order_id',
                                        contact?.orders[0]?.id
                                            ? String(contact.orders[0].id)
                                            : 'general',
                                    );
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select recipient" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contacts.map((contact) => (
                                        <SelectItem
                                            key={contact.recipient.id}
                                            value={String(
                                                contact.recipient.id,
                                            )}
                                        >
                                            {contact.recipient.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError
                                message={newMessageForm.errors.receiver_id}
                            />
                        </div>

                        {selectedContact ? (
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium">
                                            {selectedContact.recipient.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedContact.recipient.email}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">
                                        {selectedContact.orders.length === 0
                                            ? 'No shared orders'
                                            : `${selectedContact.orders.length} order${
                                                  selectedContact.orders.length > 1
                                                      ? 's'
                                                      : ''
                                              }`}
                                    </Badge>
                                </div>

                                <div className="mt-4 grid gap-2">
                                    <Label>Order context</Label>
                                    <Select
                                        value={
                                            newMessageForm.data.order_id ||
                                            'general'
                                        }
                                        onValueChange={(value) =>
                                            newMessageForm.setData(
                                                'order_id',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select order" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general">
                                                General thread
                                            </SelectItem>
                                            {selectedContact.orders.map(
                                                (order) => (
                                                    <SelectItem
                                                        key={order.id}
                                                        value={String(order.id)}
                                                    >
                                                        {formatOrderLabel(order)}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Choose a shared order when the conversation
                                        is about delivery, revisions, or project
                                        updates. Leave it as general for everything
                                        else.
                                    </p>
                                    <InputError
                                        message={newMessageForm.errors.order_id}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                                Select a recipient to see available order context
                                and open the right thread.
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowComposer(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Open Thread</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

MessagesIndex.layout = roleLayout((isSuperAdmin) => [
    {
        title: 'Dashboard',
        href: isSuperAdmin ? '/admin/dashboard' : '/dashboard',
    },
    { title: 'Messages', href: '/messages' },
]);
