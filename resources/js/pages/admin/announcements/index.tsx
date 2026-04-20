import { Head, router, useForm } from '@inertiajs/react';
import { Megaphone, Pencil, PlusIcon, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import TablePagination from '@/components/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
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
import { useClientPagination } from '@/hooks/use-client-pagination';
import { useConfirm } from '@/hooks/use-confirm';
import admin from '@/routes/admin';

type AnnouncementAudience = 'all' | 'buyers' | 'sellers';
type AnnouncementStatus = 'active' | 'inactive';

type Announcement = {
    id: number;
    message: string;
    audience: AnnouncementAudience;
    status: AnnouncementStatus;
    expires_at: string | null;
    created_at: string | null;
    created_by_name: string;
};

type Props = {
    announcements: Announcement[];
};

type AnnouncementFormData = {
    message: string;
    audience: AnnouncementAudience;
    status: AnnouncementStatus;
    expires_on: string;
    expires_time: string;
};

function toExpiryFields(value: string | null) {
    if (!value) {
        return {
            expires_on: '',
            expires_time: '',
        };
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);
    const iso = localDate.toISOString();

    return {
        expires_on: iso.slice(0, 10),
        expires_time: iso.slice(11, 16),
    };
}

function currentDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 10);
}

function combineExpiry(date: string, time: string) {
    if (!date || !time) {
        return '';
    }

    return `${date} ${time}`;
}

function formatDate(value: string | null) {
    if (!value) {
        return 'Never';
    }

    return new Date(value).toLocaleString();
}

function audienceLabel(value: AnnouncementAudience) {
    if (value === 'buyers') {
        return 'Buyers';
    }

    if (value === 'sellers') {
        return 'Sellers';
    }

    return 'All users';
}

function AnnouncementForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    onCancel,
}: {
    data: AnnouncementFormData;
    setData: <K extends keyof AnnouncementFormData>(
        key: K,
        value: AnnouncementFormData[K],
    ) => void;
    errors: Partial<Record<keyof AnnouncementFormData, string>>;
    processing: boolean;
    onSubmit: (event: React.FormEvent) => void;
    onCancel: () => void;
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="announcement-message">Message <span className="text-destructive">*</span></Label>
                <textarea
                    id="announcement-message"
                    value={data.message}
                    onChange={(event) => setData('message', event.target.value)}
                    placeholder="Scheduled maintenance starts at 11:00 PM UTC tonight."
                    className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    maxLength={2000}
                    required
                    autoFocus
                />
                <InputError message={errors.message} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Audience <span className="text-destructive">*</span></Label>
                    <Select
                        value={data.audience}
                        onValueChange={(value) =>
                            setData('audience', value as AnnouncementAudience)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All users</SelectItem>
                            <SelectItem value="buyers">Buyers</SelectItem>
                            <SelectItem value="sellers">Sellers</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.audience} />
                </div>

                <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                        value={data.status}
                        onValueChange={(value) =>
                            setData('status', value as AnnouncementStatus)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.status} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Expires at</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                        id="announcement-expires-on"
                        type="date"
                        min={currentDate()}
                        value={data.expires_on}
                        onChange={(event) =>
                            setData('expires_on', event.target.value)
                        }
                    />
                    <Input
                        id="announcement-expires-time"
                        type="time"
                        step="60"
                        value={data.expires_time}
                        onChange={(event) =>
                            setData('expires_time', event.target.value)
                        }
                    />
                </div>
                <InputError
                    message={errors.expires_on ?? errors.expires_time}
                />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving…' : 'Save'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminAnnouncementsIndex({ announcements }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Announcement | null>(null);
    const [search, setSearch] = useState('');
    const confirm = useConfirm();
    const initialState: AnnouncementFormData = {
        message: '',
        audience: 'all',
        status: 'active',
        expires_on: '',
        expires_time: '',
    };

    const createForm = useForm<AnnouncementFormData>(initialState);
    const editForm = useForm<AnnouncementFormData>(initialState);
    const filteredAnnouncements = useMemo(() => {
        const term = search.toLowerCase().trim();
        if (!term) return announcements;
        return announcements.filter(a => 
            a.message.toLowerCase().includes(term) ||
            a.audience.toLowerCase().includes(term) ||
            a.created_by_name.toLowerCase().includes(term)
        );
    }, [announcements, search]);
    const paginatedAnnouncements = useClientPagination(filteredAnnouncements);

    const openEdit = (announcement: Announcement) => {
        setEditTarget(announcement);
        editForm.clearErrors();
        editForm.setData({
            message: announcement.message,
            audience: announcement.audience,
            status: announcement.status,
            ...toExpiryFields(announcement.expires_at),
        });
    };

    const handleCreate = (event: React.FormEvent) => {
        event.preventDefault();

        createForm.transform((data) => ({
            message: data.message,
            audience: data.audience,
            status: data.status,
            expires_at: combineExpiry(data.expires_on, data.expires_time),
        }));

        createForm.post('/admin/announcements', {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setShowCreate(false);
            },
        });
    };

    const handleUpdate = (event: React.FormEvent) => {
        event.preventDefault();

        if (!editTarget) {
            return;
        }

        editForm.transform((data) => ({
            message: data.message,
            audience: data.audience,
            status: data.status,
            expires_at: combineExpiry(data.expires_on, data.expires_time),
        }));

        editForm.put(`/admin/announcements/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                editForm.reset();
                setEditTarget(null);
            },
        });
    };

    const destroyAnnouncement = async (announcement: Announcement) => {
        const ok = await confirm({
            title: 'Delete announcement?',
            description: 'This broadcast will be removed for everyone.',
        });

        if (!ok) {
            return;
        }

        router.delete(`/admin/announcements/${announcement.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Announcements" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between gap-4">
                    <Heading
                        title="Announcements"
                        description="Broadcast maintenance notices, feature launches, and policy updates to buyers, sellers, or everyone."
                    />
                    <Button onClick={() => setShowCreate(true)} size="sm">
                        <PlusIcon className="mr-2 size-4" />
                        New Announcement
                    </Button>
                </div>

                <section className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Search by message, audience, or creator…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                        {search && (
                            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                                Clear
                            </Button>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {filteredAnnouncements.length} result{filteredAnnouncements.length === 1 ? '' : 's'}
                    </p>
                </section>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    {announcements.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <Megaphone className="mx-auto size-10 text-muted-foreground" />
                            <h2 className="mt-4 text-lg font-semibold">
                                No announcements yet
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Create a broadcast to surface important updates
                                on user dashboards.
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Message
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Audience
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Schedule
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Status
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedAnnouncements.paginatedItems.map(
                                        (announcement) => (
                                            <tr
                                                key={announcement.id}
                                                className="bg-background transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="line-clamp-3 max-w-xl font-medium text-foreground">
                                                        {announcement.message}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Created by{' '}
                                                        {
                                                            announcement.created_by_name
                                                        }{' '}
                                                        on{' '}
                                                        {formatDate(
                                                            announcement.created_at,
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {audienceLabel(
                                                        announcement.audience,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    Expires{' '}
                                                    {formatDate(
                                                        announcement.expires_at,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            announcement.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {announcement.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openEdit(
                                                                    announcement,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                destroyAnnouncement(
                                                                    announcement,
                                                                )
                                                            }
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {announcements.length > 0 && (
                        <TablePagination
                            page={paginatedAnnouncements.page}
                            pageSize={paginatedAnnouncements.pageSize}
                            totalItems={paginatedAnnouncements.totalItems}
                            totalPages={paginatedAnnouncements.totalPages}
                            startItem={paginatedAnnouncements.startItem}
                            endItem={paginatedAnnouncements.endItem}
                            hasPreviousPage={
                                paginatedAnnouncements.hasPreviousPage
                            }
                            hasNextPage={paginatedAnnouncements.hasNextPage}
                            onPageChange={paginatedAnnouncements.setPage}
                            onPageSizeChange={
                                paginatedAnnouncements.setPageSize
                            }
                        />
                    )}
                </div>
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Announcement</DialogTitle>
                    </DialogHeader>
                    <AnnouncementForm
                        data={createForm.data}
                        setData={createForm.setData}
                        errors={createForm.errors}
                        processing={createForm.processing}
                        onSubmit={handleCreate}
                        onCancel={() => setShowCreate(false)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(editTarget)}
                onOpenChange={(open) => !open && setEditTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Announcement</DialogTitle>
                    </DialogHeader>
                    <AnnouncementForm
                        data={editForm.data}
                        setData={editForm.setData}
                        errors={editForm.errors}
                        processing={editForm.processing}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditTarget(null)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminAnnouncementsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Announcements', href: '/admin/announcements' },
    ],
};
