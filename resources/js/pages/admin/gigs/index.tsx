import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock3, Eye, ShieldX, Store } from 'lucide-react';
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
import admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Package = {
    tier: string;
    title: string;
    description: string;
    price: string;
    delivery_days: number;
    revision_count: number;
};

type FieldChange = { old: string | number | string[]; new: string | number | string[] };

type PendingChanges = {
    title?: FieldChange;
    description?: FieldChange;
    category_id?: FieldChange;
    subcategory_id?: FieldChange;
    tags?: { old: string[]; new: string[] };
    packages?: Record<string, Record<string, FieldChange>>;
};

type ModerationGig = {
    id: number;
    title: string;
    description: string;
    tags: string[];
    status: 'active' | 'inactive';
    approval_status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    pending_changes: PendingChanges | null;
    approved_at: string | null;
    rejected_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    seller: { name: string | null; email: string | null };
    category: string | null;
    subcategory: string | null;
    starting_price: string;
    packages: Package[];
    images: string[];
};

type Props = {
    stats: { pending: number; approved: number; rejected: number };
    gigs: ModerationGig[];
};

type StatusFilter = 'pending' | 'approved' | 'rejected';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

const TIER_LABELS: Record<string, string> = {
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium',
};

function formatDate(value: string | null) {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
}

export default function AdminGigModerationIndex({ stats, gigs }: Props) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [search, setSearch] = useState('');
    const [detailGig, setDetailGig] = useState<ModerationGig | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ModerationGig | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const rejectForm = useForm<{ rejection_reason: string }>({ rejection_reason: '' });

    const total = stats.pending + stats.approved + stats.rejected;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return gigs.filter((gig) => {
            if (gig.approval_status !== statusFilter) return false;
            if (!q) return true;
            return (
                gig.title.toLowerCase().includes(q) ||
                (gig.seller.name ?? '').toLowerCase().includes(q) ||
                (gig.seller.email ?? '').toLowerCase().includes(q)
            );
        });
    }, [gigs, statusFilter, search]);

    const approveGig = (gig: ModerationGig) => {
        router.post(`/admin/gigs/${gig.id}/approve`, {}, { preserveScroll: true, preserveState: true });
    };

    const openRejectDialog = (gig: ModerationGig) => {
        rejectForm.reset();
        rejectForm.clearErrors();
        setRejectTarget(gig);
    };

    const submitReject = (event: React.FormEvent) => {
        event.preventDefault();
        if (!rejectTarget) return;
        rejectForm.post(`/admin/gigs/${rejectTarget.id}/reject`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { setRejectTarget(null); rejectForm.reset(); },
        });
    };

    return (
        <>
            <Head title="Gig Approvals" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Gig Approvals"
                    description="Review submitted gigs, approve quality listings, and reject with clear reasons."
                />

                <section className="grid gap-4 md:grid-cols-4">
                    {[
                        { icon: Store, label: 'Total gigs', value: total },
                        { icon: Clock3, label: 'Pending', value: stats.pending },
                        { icon: CheckCircle2, label: 'Approved', value: stats.approved },
                        { icon: ShieldX, label: 'Rejected', value: stats.rejected },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="rounded-2xl border border-border/70 bg-card p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Icon className="size-4" />{label}
                            </div>
                            <p className="mt-2 text-2xl font-semibold">{value}</p>
                        </div>
                    ))}
                </section>

                <section className="rounded-2xl border border-border/70 bg-card p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <Input
                            className="max-w-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search gig title, seller name, or email"
                        />
                        {search && (
                            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                                Clear
                            </Button>
                        )}
                        <div className="flex flex-wrap gap-2 lg:ml-auto">
                            {STATUS_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    size="sm"
                                    variant={statusFilter === option.value ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {filtered.length} result{filtered.length === 1 ? '' : 's'}
                    </p>
                </section>

                <section className="rounded-2xl border border-border/70 bg-card">
                    <div className="border-b border-border/70 px-5 py-4">
                        <h2 className="font-semibold">
                            Moderation Queue
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({filtered.length} {statusFilter})
                            </span>
                        </h2>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-muted-foreground">No gigs found.</div>
                    ) : (
                        <div className="divide-y divide-border/70">
                            {filtered.map((gig) => (
                                <div key={gig.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{gig.title}</p>
                                            <Badge variant={gig.status === 'active' ? 'default' : 'secondary'}>{gig.status}</Badge>
                                            <Badge variant={gig.approval_status === 'approved' ? 'default' : gig.approval_status === 'rejected' ? 'destructive' : 'secondary'}>
                                                {gig.approval_status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Seller: {gig.seller.name ?? 'Seller'} ({gig.seller.email ?? 'N/A'})
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {gig.category ?? 'N/A'} / {gig.subcategory ?? 'N/A'} • From USD {gig.starting_price}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Updated {formatDate(gig.updated_at)}</p>
                                        {gig.rejection_reason && (
                                            <p className="text-sm text-destructive">Rejection: {gig.rejection_reason}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setDetailGig(gig)}>
                                            <Eye className="mr-1 size-3.5" /> View
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => approveGig(gig)} disabled={gig.approval_status === 'approved'}>
                                            Approve
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openRejectDialog(gig)} disabled={gig.approval_status === 'rejected'}>
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ── Detail Dialog ── */}
            <Dialog open={Boolean(detailGig)} onOpenChange={(open) => { if (!open) setDetailGig(null); }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{detailGig?.title}</DialogTitle>
                        <DialogDescription>
                            {detailGig?.seller.name} ({detailGig?.seller.email}) •{' '}
                            {detailGig?.category} / {detailGig?.subcategory}
                        </DialogDescription>
                    </DialogHeader>

                    {detailGig && (
                        <div className="space-y-5 pt-1">
                            {/* Changes diff — only for re-submitted gigs */}
                            {detailGig.pending_changes && Object.keys(detailGig.pending_changes).length > 0 && (
                                <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-4 dark:border-amber-700/40 dark:bg-amber-950/30">
                                    <p className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-300">⚠ Changes from previously approved version</p>
                                    <div className="space-y-3 text-sm">
                                        {detailGig.pending_changes.title && (
                                            <div>
                                                <p className="font-medium text-muted-foreground">Title</p>
                                                <p className="line-through text-red-600 dark:text-red-400">{String(detailGig.pending_changes.title.old)}</p>
                                                <p className="text-green-700 dark:text-green-400">{String(detailGig.pending_changes.title.new)}</p>
                                            </div>
                                        )}
                                        {detailGig.pending_changes.description && (
                                            <div>
                                                <p className="font-medium text-muted-foreground">Description</p>
                                                <p className="line-through whitespace-pre-wrap rounded bg-red-50 px-2 py-1 text-red-600 dark:bg-red-950/30 dark:text-red-400">{String(detailGig.pending_changes.description.old)}</p>
                                                <p className="mt-1 whitespace-pre-wrap rounded bg-green-50 px-2 py-1 text-green-700 dark:bg-green-950/30 dark:text-green-400">{String(detailGig.pending_changes.description.new)}</p>
                                            </div>
                                        )}
                                        {detailGig.pending_changes.tags && (
                                            <div>
                                                <p className="font-medium text-muted-foreground">Tags</p>
                                                <p className="line-through text-red-600 dark:text-red-400">{detailGig.pending_changes.tags.old.join(', ') || '(none)'}</p>
                                                <p className="text-green-700 dark:text-green-400">{detailGig.pending_changes.tags.new.join(', ') || '(none)'}</p>
                                            </div>
                                        )}
                                        {detailGig.pending_changes.packages && Object.entries(detailGig.pending_changes.packages).map(([tier, fields]) => (
                                            <div key={tier}>
                                                <p className="font-medium text-muted-foreground capitalize">{tier} package</p>
                                                {Object.entries(fields).map(([field, change]) => (
                                                    <div key={field} className="ml-3">
                                                        <span className="text-xs text-muted-foreground capitalize">{field.replace('_', ' ')}: </span>
                                                        <span className="line-through text-red-600 dark:text-red-400">{String(change.old)}</span>
                                                        <span className="mx-1 text-muted-foreground">→</span>
                                                        <span className="text-green-700 dark:text-green-400">{String(change.new)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Images */}
                            {detailGig.images.length > 0 && (
                                <div>
                                    <p className="mb-2 text-sm font-medium">Images</p>
                                    <div className="flex flex-wrap gap-2">
                                        {detailGig.images.map((url, i) => (
                                            <img
                                                key={i}
                                                src={url}
                                                alt={`Gig image ${i + 1}`}
                                                className="h-24 w-32 cursor-pointer rounded-lg border border-border object-cover hover:opacity-80"
                                                onClick={() => setPreviewImage(url)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <p className="mb-1 text-sm font-medium">Description</p>
                                <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                    {detailGig.description}
                                </p>
                            </div>

                            {/* Tags */}
                            {detailGig.tags.length > 0 && (
                                <div>
                                    <p className="mb-2 text-sm font-medium">Tags</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {detailGig.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Packages */}
                            <div>
                                <p className="mb-2 text-sm font-medium">Packages</p>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {detailGig.packages.map((pkg) => (
                                        <div key={pkg.tier} className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                {TIER_LABELS[pkg.tier] ?? pkg.tier}
                                            </p>
                                            <p className="font-medium">{pkg.title}</p>
                                            <p className="text-xs text-muted-foreground">{pkg.description}</p>
                                            <div className="pt-1 text-sm">
                                                <span className="font-semibold">USD {pkg.price}</span>
                                                <span className="ml-2 text-muted-foreground">
                                                    {pkg.delivery_days}d · {pkg.revision_count} rev
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Status info */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>Status: <Badge variant={detailGig.status === 'active' ? 'default' : 'secondary'}>{detailGig.status}</Badge></span>
                                <span>Approval: <Badge variant={detailGig.approval_status === 'approved' ? 'default' : detailGig.approval_status === 'rejected' ? 'destructive' : 'secondary'}>{detailGig.approval_status}</Badge></span>
                                <span>Submitted: {formatDate(detailGig.created_at)}</span>
                                <span>Updated: {formatDate(detailGig.updated_at)}</span>
                            </div>

                            {detailGig.rejection_reason && (
                                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                    Rejection reason: {detailGig.rejection_reason}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
                        {detailGig && detailGig.approval_status !== 'approved' && (
                            <Button onClick={() => { approveGig(detailGig); setDetailGig(null); }}>Approve</Button>
                        )}
                        {detailGig && detailGig.approval_status !== 'rejected' && (
                            <Button variant="destructive" onClick={() => { openRejectDialog(detailGig); setDetailGig(null); }}>
                                Reject
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Image preview ── */}
            <Dialog open={Boolean(previewImage)} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
                <DialogContent className="max-w-3xl p-2">
                    {previewImage && (
                        <img src={previewImage} alt="Preview" className="w-full rounded-lg object-contain" />
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Reject Dialog ── */}
            <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => { if (!open) { setRejectTarget(null); rejectForm.reset(); } }}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Reject Gig</DialogTitle>
                        <DialogDescription>
                            Provide a clear reason for rejection. The seller will see this reason while editing.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReject} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rejection-reason">Rejection reason</Label>
                            <textarea
                                id="rejection-reason"
                                value={rejectForm.data.rejection_reason}
                                onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                rows={5}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                placeholder="Explain what must be improved before approval."
                            />
                            <InputError message={rejectForm.errors.rejection_reason} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
                            <Button type="submit" disabled={rejectForm.processing}>
                                {rejectForm.processing ? 'Rejecting…' : 'Reject gig'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminGigModerationIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Gig Approvals', href: '/admin/gigs' },
    ] satisfies BreadcrumbItem[],
};
