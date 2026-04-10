import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileText, Paperclip, Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import admin from '@/routes/admin';
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
    order_price: string;
    order_gross_amount: string;
    order_seller_net_amount: string;
    order_platform_fee_percentage: string;
    order_status: string;
    order_fund_status: string;
    order_payment_status: string;
    order_requirements: string;
    buyer: { name: string; email: string } | null;
    seller: { name: string; email: string } | null;
    order_deliveries: {
        id: number;
        file_url: string;
        note: string | null;
        delivered_at: string | null;
        delivered_by: string | null;
    }[];
    raised_by: string | null;
    reason: string;
    status: 'open' | 'resolved';
    decision: string | null;
    partial_amount: string | null; // stores refund % when decision = partial_refund
    admin_note: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string | null;
    messages: DisputeMessage[];
};

type Props = { dispute: DisputeDetail };

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

function usd(value: number) {
    return `USD ${value.toFixed(2)}`;
}

const decisionLabel: Record<string, string> = {
    full_refund: 'Full Refund',
    partial_refund: 'Partial Refund',
    release: 'Released to Seller',
};

export default function AdminDisputeShow({ dispute }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    const gross = parseFloat(dispute.order_gross_amount) || 0;
    const feeRate = parseFloat(dispute.order_platform_fee_percentage) || 0;
    const fundsReleased = dispute.order_fund_status === 'released';

    const msgForm = useForm<{ body: string; attachment: File | null }>({
        body: '',
        attachment: null,
    });

    const resolveForm = useForm<{
        decision: string;
        partial_amount: string; // refund % 1–99
        admin_note: string;
    }>({
        decision: '',
        partial_amount: '50',
        admin_note: '',
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dispute.messages.length]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        msgForm.post(`/admin/disputes/${dispute.id}/messages`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => msgForm.reset(),
        });
    };

    const submitResolve = (e: React.FormEvent) => {
        e.preventDefault();
        resolveForm.post(`/admin/disputes/${dispute.id}/resolve`, {
            preserveScroll: true,
        });
    };

    // Live split preview for partial_refund
    const pct = Math.min(99, Math.max(1, parseFloat(resolveForm.data.partial_amount) || 0));
    const buyerRefund = Math.round(gross * pct) / 100;
    const sellerKeeps = gross - buyerRefund;
    const sellerNet = Math.round(sellerKeeps * (1 - feeRate / 100) * 100) / 100;
    const platformFee = Math.round((sellerKeeps - sellerNet) * 100) / 100;

    return (
        <>
            <Head title={`Dispute #${dispute.id}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4">
                    <Link
                        href="/admin/disputes"
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

                <div className="grid gap-6 xl:grid-cols-3">
                    {/* Left: order context + resolution */}
                    <div className="space-y-4 xl:col-span-1">
                        {/* Order info */}
                        <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm space-y-2">
                            <p className="font-semibold mb-1">Order Details</p>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Gig</span>
                                <span className="font-medium">{dispute.order_gig_title ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order total</span>
                                <span className="font-medium">{usd(gross)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Platform fee</span>
                                <span>{feeRate}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Order status</span>
                                <Badge variant="secondary">{dispute.order_status}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Fund status</span>
                                <Badge variant={fundsReleased ? 'default' : 'secondary'}>
                                    {dispute.order_fund_status}
                                </Badge>
                            </div>
                            {fundsReleased && (
                                <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                                    Funds already released to seller. Partial/full refund will claw back from seller wallet.
                                </p>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Buyer</span>
                                <span>{dispute.buyer?.name ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Seller</span>
                                <span>{dispute.seller?.name ?? '—'}</span>
                            </div>
                        </div>

                        {/* Requirements */}
                        <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm">
                            <p className="font-medium mb-2">Requirements</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{dispute.order_requirements}</p>
                        </div>

                        {/* Delivery files */}
                        {dispute.order_deliveries.length > 0 && (
                            <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm space-y-3">
                                <p className="font-medium">Delivery Files</p>
                                {dispute.order_deliveries.map((d) => (
                                    <div key={d.id} className="rounded-xl border border-border/70 p-3">
                                        <p className="text-muted-foreground text-xs">
                                            {formatDate(d.delivered_at)} by {d.delivered_by ?? 'Seller'}
                                        </p>
                                        {d.note && <p className="mt-1 text-muted-foreground">{d.note}</p>}
                                        <a
                                            href={d.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-flex items-center gap-1 text-primary underline underline-offset-4 text-xs"
                                        >
                                            <FileText className="size-3.5" />
                                            Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Dispute reason */}
                        <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm">
                            <p className="font-medium mb-2">Dispute Reason</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{dispute.reason}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Raised by {dispute.raised_by} on {formatDate(dispute.created_at)}
                            </p>
                        </div>

                        {/* Resolution form or result */}
                        {dispute.status === 'open' ? (
                            <form
                                onSubmit={submitResolve}
                                className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 text-sm"
                            >
                                <p className="font-semibold">Resolve Dispute</p>

                                <div className="grid gap-2">
                                    <Label>Decision</Label>
                                    <Select
                                        value={resolveForm.data.decision}
                                        onValueChange={(v) => resolveForm.setData('decision', v)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose decision..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="full_refund">
                                                Full Refund → 100% to Buyer
                                            </SelectItem>
                                            <SelectItem value="partial_refund">
                                                Partial Refund → Split by %
                                            </SelectItem>
                                            <SelectItem value="release">
                                                Release → 100% to Seller
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={resolveForm.errors.decision} />
                                </div>

                                {resolveForm.data.decision === 'partial_refund' && (
                                    <div className="space-y-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="partial_amount">
                                                Buyer refund % (1–99)
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    id="partial_amount"
                                                    type="range"
                                                    min="1"
                                                    max="99"
                                                    step="1"
                                                    value={resolveForm.data.partial_amount}
                                                    onChange={(e) =>
                                                        resolveForm.setData('partial_amount', e.target.value)
                                                    }
                                                    className="flex-1 accent-primary"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={resolveForm.data.partial_amount}
                                                        onChange={(e) =>
                                                            resolveForm.setData('partial_amount', e.target.value)
                                                        }
                                                        className="w-16 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-center outline-none"
                                                    />
                                                    <span className="text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                            <InputError message={resolveForm.errors.partial_amount} />
                                        </div>

                                        {/* Live split preview */}
                                        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2 text-xs">
                                            <p className="font-medium text-sm mb-1">Split Preview</p>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Order total</span>
                                                <span className="font-medium">{usd(gross)}</span>
                                            </div>
                                            <div className="h-px bg-border/70" />
                                            <div className="flex justify-between text-blue-600">
                                                <span>Buyer refund ({pct}%)</span>
                                                <span className="font-semibold">{usd(buyerRefund)}</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-600">
                                                <span>Seller keeps ({100 - pct}%)</span>
                                                <span className="font-semibold">{usd(sellerKeeps)}</span>
                                            </div>
                                            {feeRate > 0 && (
                                                <>
                                                    <div className="h-px bg-border/70" />
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Platform fee ({feeRate}% of seller portion)</span>
                                                        <span>−{usd(platformFee)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-emerald-700 font-medium">
                                                        <span>Seller net</span>
                                                        <span>{usd(sellerNet)}</span>
                                                    </div>
                                                </>
                                            )}
                                            {fundsReleased && (
                                                <p className="mt-1 text-amber-700 bg-amber-50 rounded px-2 py-1">
                                                    Funds already released — {usd(buyerRefund)} will be clawed back from seller wallet.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {resolveForm.data.decision === 'full_refund' && (
                                    <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs space-y-1">
                                        <div className="flex justify-between text-blue-600 font-medium">
                                            <span>Buyer refund</span>
                                            <span>{usd(gross)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Seller receives</span>
                                            <span>{usd(0)}</span>
                                        </div>
                                        {fundsReleased && (
                                            <p className="mt-1 text-amber-700 bg-amber-50 rounded px-2 py-1">
                                                Funds already released — full seller net will be clawed back.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {resolveForm.data.decision === 'release' && (
                                    <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs space-y-1">
                                        <div className="flex justify-between text-emerald-600 font-medium">
                                            <span>Seller net</span>
                                            <span>
                                                {fundsReleased
                                                    ? 'Already in wallet'
                                                    : usd(parseFloat(dispute.order_seller_net_amount) || 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Buyer refund</span>
                                            <span>{usd(0)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="admin_note">Admin Note (optional)</Label>
                                    <textarea
                                        id="admin_note"
                                        rows={3}
                                        value={resolveForm.data.admin_note}
                                        onChange={(e) => resolveForm.setData('admin_note', e.target.value)}
                                        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none resize-none"
                                        placeholder="Explain the decision to both parties..."
                                    />
                                    <InputError message={resolveForm.errors.admin_note} />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={resolveForm.processing || !resolveForm.data.decision}
                                >
                                    {resolveForm.processing ? 'Resolving...' : 'Close Dispute'}
                                </Button>
                            </form>
                        ) : (
                            <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm space-y-2">
                                <p className="font-semibold">Resolution</p>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Decision</span>
                                    <Badge variant="outline">
                                        {decisionLabel[dispute.decision ?? ''] ?? dispute.decision}
                                    </Badge>
                                </div>
                                {dispute.decision === 'partial_refund' && dispute.partial_amount && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Buyer refund</span>
                                            <span className="text-blue-600 font-medium">
                                                {dispute.partial_amount}% ({usd(gross * parseFloat(dispute.partial_amount) / 100)})
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Seller kept</span>
                                            <span className="text-emerald-600 font-medium">
                                                {(100 - parseFloat(dispute.partial_amount)).toFixed(0)}% ({usd(gross * (100 - parseFloat(dispute.partial_amount)) / 100)})
                                            </span>
                                        </div>
                                    </>
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

                    {/* Right: chat */}
                    <div className="flex flex-col rounded-2xl border border-border/70 bg-card xl:col-span-2">
                        <div className="border-b border-border/70 px-5 py-3">
                            <p className="font-medium text-sm">Dispute Chat</p>
                            <p className="text-xs text-muted-foreground">
                                Buyer, seller, and admin can all participate
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[520px]">
                            {dispute.messages.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No messages yet.
                                </p>
                            )}
                            {dispute.messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col gap-1 ${msg.is_mine ? 'items-end' : 'items-start'}`}>
                                    <p className="text-xs text-muted-foreground">
                                        {msg.sender_name} · {formatDate(msg.created_at)}
                                    </p>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                        msg.is_mine
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-foreground'
                                    }`}>
                                        {msg.body && (
                                            <p className="whitespace-pre-wrap">{msg.body}</p>
                                        )}
                                        {msg.attachment_url && (
                                            <a
                                                href={msg.attachment_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 underline underline-offset-4 text-xs text-primary"
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
                            <form
                                onSubmit={sendMessage}
                                className="border-t border-border/70 p-4 space-y-3"
                            >
                                <textarea
                                    rows={3}
                                    value={msgForm.data.body}
                                    onChange={(e) => msgForm.setData('body', e.target.value)}
                                    placeholder="Write a message to both parties..."
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none resize-none"
                                />
                                <InputError message={msgForm.errors.body} />

                                <div className="flex items-center justify-between gap-3">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                        <Paperclip className="size-4" />
                                        {msgForm.data.attachment
                                            ? msgForm.data.attachment.name
                                            : 'Attach file'}
                                        <input
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) =>
                                                msgForm.setData(
                                                    'attachment',
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                    </label>
                                    <Button type="submit" size="sm" disabled={msgForm.processing}>
                                        <Send className="size-4 mr-1" />
                                        Send
                                    </Button>
                                </div>
                                <InputError message={msgForm.errors.attachment} />
                            </form>
                        )}

                        {dispute.status === 'resolved' && (
                            <div className="border-t border-border/70 px-5 py-3 text-sm text-muted-foreground">
                                Dispute resolved. Chat is closed.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

AdminDisputeShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Disputes', href: '/admin/disputes' },
        { title: 'Review', href: '#' },
    ] satisfies BreadcrumbItem[],
};
