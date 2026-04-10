import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock3, ShieldX, Store } from 'lucide-react';
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

type ModerationGig = {
    id: number;
    title: string;
    status: 'active' | 'inactive';
    approval_status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    seller: {
        name: string | null;
        email: string | null;
    };
    category: string | null;
    subcategory: string | null;
    starting_price: string;
};

type Props = {
    stats: {
        pending: number;
        approved: number;
        rejected: number;
    };
    gigs: ModerationGig[];
};

type StatusFilter = 'pending' | 'approved' | 'rejected';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

function formatDate(value: string | null) {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
}

export default function AdminGigModerationIndex({ stats, gigs }: Props) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [search, setSearch] = useState('');
    const [rejectTarget, setRejectTarget] = useState<ModerationGig | null>(null);

    const rejectForm = useForm<{ rejection_reason: string }>({
        rejection_reason: '',
    });

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
        router.post(
            `/admin/gigs/${gig.id}/approve`,
            {},
            { preserveScroll: true, preserveState: true },
        );
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
            onSuccess: () => {
                setRejectTarget(null);
                rejectForm.reset();
            },
        });
    };

    return (
        <>
            <Head title="Gig Moderation" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Gig Moderation"
                    description="Review submitted gigs, approve quality listings, and reject with clear reasons."
                />

                <section className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Store className="size-4" />
                            Total gigs
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{total}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock3 className="size-4" />
                            Pending
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.pending}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="size-4" />
                            Approved
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.approved}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShieldX className="size-4" />
                            Rejected
                        </div>
                        <p className="mt-2 text-2xl font-semibold">{stats.rejected}</p>
                    </div>
                </section>

                <section className="rounded-2xl border border-border/70 bg-card p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
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

                        <div className="flex w-full max-w-md items-center gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search gig title, seller name, or email"
                            />
                        </div>
                    </div>
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
                        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                            No gigs found.
                        </div>
                    ) : (
                        <div className="divide-y divide-border/70">
                            {filtered.map((gig) => (
                                <div
                                    key={gig.id}
                                    className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between"
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{gig.title}</p>
                                            <Badge variant={gig.status === 'active' ? 'default' : 'secondary'}>
                                                {gig.status}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    gig.approval_status === 'approved'
                                                        ? 'default'
                                                        : gig.approval_status === 'rejected'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {gig.approval_status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Seller: {gig.seller.name ?? 'Seller'} ({gig.seller.email ?? 'N/A'})
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Category: {gig.category ?? 'N/A'} / {gig.subcategory ?? 'N/A'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Starting at USD {gig.starting_price} • Updated {formatDate(gig.updated_at)}
                                        </p>
                                        {gig.rejection_reason && (
                                            <p className="text-sm text-destructive">
                                                Rejection reason: {gig.rejection_reason}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => approveGig(gig)}
                                            disabled={gig.approval_status === 'approved'}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openRejectDialog(gig)}
                                            disabled={gig.approval_status === 'rejected'}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Dialog
                open={Boolean(rejectTarget)}
                onOpenChange={(open) => {
                    if (!open) {
                        setRejectTarget(null);
                        rejectForm.reset();
                    }
                }}
            >
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
                            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
                                Cancel
                            </Button>
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
        { title: 'Gigs', href: '/admin/gigs' },
    ] satisfies BreadcrumbItem[],
};
