import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileText, Paperclip, Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem } from '@/types';

type DisputeMessage = {
    id: number;
    sender_id: number;
    sender_name: string | null;
    is_mine: boolean;
    body: string | null;
    attachment_url: string | null;
    created_at: string | null;
};

type DisputeDetail = {
    id: number;
    order_id: number;
    order_gig_title: string | null;
    order_buyer: { id: number; name: string } | null;
    order_seller: { id: number; name: string } | null;
    raised_by: string | null;
    reason: string;
    status: 'open' | 'resolved';
    decision: string | null;
    partial_amount: string | null;
    admin_note: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string | null;
    messages: DisputeMessage[];
};

type Props = { dispute: DisputeDetail };

function formatDate(value: string | null) {
    if (!value) return '';
    return new Date(value).toLocaleString();
}

const decisionLabel: Record<string, string> = {
    full_refund: 'Full Refund',
    partial_refund: 'Partial Refund',
    release: 'Released to Seller',
};

export default function DisputeShow({ dispute }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    const form = useForm<{ body: string; attachment: File | null }>({
        body: '',
        attachment: null,
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dispute.messages.length]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/disputes/${dispute.id}/messages`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <>
            <Head title={`Dispute #${dispute.id}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4">
                    <Link
                        href="/disputes"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Back to disputes
                    </Link>
                    <Heading
                        title={`Dispute #${dispute.id}`}
                        description={`Order #${dispute.order_id} — ${dispute.order_gig_title ?? 'Gig'}`}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Info panel */}
                    <div className="space-y-4 lg:col-span-1">
                        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant={dispute.status === 'open' ? 'default' : 'secondary'}>
                                    {dispute.status}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Raised by</span>
                                <span className="font-medium">{dispute.raised_by}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Buyer</span>
                                <span>{dispute.order_buyer?.name ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Seller</span>
                                <span>{dispute.order_seller?.name ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Opened</span>
                                <span>{formatDate(dispute.created_at)}</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm">
                            <p className="font-medium mb-2">Reason</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{dispute.reason}</p>
                        </div>

                        {dispute.status === 'resolved' && (
                            <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm space-y-2">
                                <p className="font-medium">Resolution</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Decision</span>
                                    <Badge variant="outline">{decisionLabel[dispute.decision ?? ''] ?? dispute.decision}</Badge>
                                </div>
                                {dispute.partial_amount && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Refund amount</span>
                                        <span>USD {dispute.partial_amount}</span>
                                    </div>
                                )}
                                {dispute.admin_note && (
                                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{dispute.admin_note}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Resolved by {dispute.resolved_by} on {formatDate(dispute.resolved_at)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Chat panel */}
                    <div className="flex flex-col rounded-2xl border border-border/70 bg-card lg:col-span-2">
                        <div className="border-b border-border/70 px-5 py-3">
                            <p className="font-medium text-sm">Dispute Chat</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[480px]">
                            {dispute.messages.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No messages yet. Start the conversation.
                                </p>
                            )}
                            {dispute.messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col gap-1 ${msg.is_mine ? 'items-end' : 'items-start'}`}
                                >
                                    <p className="text-xs text-muted-foreground">
                                        {msg.sender_name} · {formatDate(msg.created_at)}
                                    </p>
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                            msg.is_mine
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-foreground'
                                        }`}
                                    >
                                        {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                                        {msg.attachment_url && (
                                            <a
                                                href={msg.attachment_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 underline underline-offset-4 text-xs"
                                            >
                                                <FileText className="size-3.5" />
                                                Attachment
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {dispute.status === 'open' && (
                            <form onSubmit={submit} className="border-t border-border/70 p-4 space-y-3">
                                <textarea
                                    rows={3}
                                    value={form.data.body}
                                    onChange={(e) => form.setData('body', e.target.value)}
                                    placeholder="Write a message..."
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none resize-none"
                                />
                                <InputError message={form.errors.body} />

                                <div className="flex items-center justify-between gap-3">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                        <Paperclip className="size-4" />
                                        {form.data.attachment ? form.data.attachment.name : 'Attach proof'}
                                        <input
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                    <Button type="submit" size="sm" disabled={form.processing}>
                                        <Send className="size-4 mr-1" />
                                        Send
                                    </Button>
                                </div>
                                <InputError message={form.errors.attachment} />
                            </form>
                        )}

                        {dispute.status === 'resolved' && (
                            <div className="border-t border-border/70 px-5 py-3 text-sm text-muted-foreground">
                                This dispute is resolved. Chat is closed.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

DisputeShow.layout = {
    breadcrumbs: [
        { title: 'My Disputes', href: '/disputes' },
        { title: 'Dispute Detail', href: '#' },
    ] satisfies BreadcrumbItem[],
};
