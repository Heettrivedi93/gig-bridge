import { Head, useForm } from '@inertiajs/react';
import { Pencil, ShieldCheck, UserCog } from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import SellerLevelBadge from '@/components/seller-level-badge';
import type { SellerLevelBadgeData } from '@/components/seller-level-badge';
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
import admin from '@/routes/admin';

type Status = 'active' | 'banned';

type UserRow = {
    id: number;
    name: string;
    email: string;
    status: Status;
    created_at: string;
    roles: string[];
    seller_level: SellerLevelBadgeData;
    permissions: string[];
    permissions_managed_at?: string | null;
};

type Props = {
    users: UserRow[];
    permissionsByRole: Record<string, string[]>;
};

type UserUpdateForm = {
    name: string;
    email: string;
    status: Status;
    permissions: string[];
};

export default function AdminUsersIndex({ users, permissionsByRole }: Props) {
    const [editTarget, setEditTarget] = useState<UserRow | null>(null);
    const [selectedRole, setSelectedRole] = useState<
        'all' | 'seller' | 'buyer'
    >('all');
    const [search, setSearch] = useState('');

    const form = useForm<UserUpdateForm>({
        name: '',
        email: '',
        status: 'active',
        permissions: [],
    });

    const usersWithPrimaryRole = useMemo(
        () =>
            users.map((user) => ({
                ...user,
                primaryRole: user.roles[0] ?? '—',
            })),
        [users],
    );
    const filteredUsers = useMemo(
        () =>
            usersWithPrimaryRole.filter((user) => {
                const matchesRole = selectedRole === 'all' ? true : user.primaryRole === selectedRole;
                const term = search.toLowerCase().trim();
                const matchesSearch = !term ||
                    user.name.toLowerCase().includes(term) ||
                    user.email.toLowerCase().includes(term) ||
                    user.primaryRole.toLowerCase().includes(term) ||
                    user.status.toLowerCase().includes(term);
                return matchesRole && matchesSearch;
            }),
        [selectedRole, search, usersWithPrimaryRole],
    );
    const paginatedUsers = useClientPagination(filteredUsers);
    const assignablePermissions =
        permissionsByRole[editTarget?.roles?.[0] ?? ''] ?? [];
    const formatPermission = (permission: string) =>
        permission
            .split('.')
            .slice(1, -1)
            .join(' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    const roleOptions = [
        { value: 'all' as const, label: 'All Users' },
        { value: 'seller' as const, label: 'Sellers' },
        { value: 'buyer' as const, label: 'Buyers' },
    ];

    const openEdit = (user: UserRow) => {
        setEditTarget(user);
        form.clearErrors();
        form.setData({
            name: user.name,
            email: user.email,
            status: user.status,
            permissions: user.permissions ?? [],
        });
    };

    const closeEdit = () => {
        setEditTarget(null);
        form.reset();
        form.clearErrors();
    };

    const togglePermission = (permission: string) => {
        const selected = form.data.permissions;

        if (selected.includes(permission)) {
            form.setData(
                'permissions',
                selected.filter((item) => item !== permission),
            );

            return;
        }

        form.setData('permissions', [...selected, permission]);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editTarget) {
            return;
        }

        form.put(`/admin/users/${editTarget.id}`, {
            onSuccess: closeEdit,
            preserveScroll: true,
            preserveState: false,
        });
    };

    return (
        <>
            <Head title="Users" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Users"
                    description="Manage user name, email, role, permissions, and account status."
                />

                <section className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            placeholder="Search by name, email, or status…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                        {search && (
                            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                                Clear
                            </Button>
                        )}
                        <div className="flex flex-wrap gap-2 ml-auto">
                            {roleOptions.map((option) => (
                                <Button
                                    key={option.value}
                                    type="button"
                                    size="sm"
                                    variant={
                                        selectedRole === option.value
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setSelectedRole(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {filteredUsers.length} result{filteredUsers.length === 1 ? '' : 's'}
                    </p>
                </section>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="max-w-full overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-4 py-3 text-left font-medium">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Role
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Seller Level
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Permissions
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedUsers.paginatedItems.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="bg-background transition-colors hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">
                                                {user.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className="capitalize"
                                            >
                                                {user.primaryRole.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.primaryRole === 'seller' ? (
                                                <SellerLevelBadge
                                                    level={user.seller_level}
                                                />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.permissions.length}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    user.status === 'active'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {user.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        openEdit(user)
                                                    }
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TablePagination
                        page={paginatedUsers.page}
                        pageSize={paginatedUsers.pageSize}
                        totalItems={paginatedUsers.totalItems}
                        totalPages={paginatedUsers.totalPages}
                        startItem={paginatedUsers.startItem}
                        endItem={paginatedUsers.endItem}
                        hasPreviousPage={paginatedUsers.hasPreviousPage}
                        hasNextPage={paginatedUsers.hasNextPage}
                        onPageChange={paginatedUsers.setPage}
                        onPageSizeChange={paginatedUsers.setPageSize}
                    />
                </div>
            </div>

            <Dialog
                open={!!editTarget}
                onOpenChange={(open) => !open && closeEdit()}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="size-4" />
                            Edit User
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Update account details, status, and feature
                            permissions.
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleUpdate} className="space-y-5 pt-1">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="user-name">Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="user-name"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="user-email">Email <span className="text-destructive">*</span></Label>
                                <Input
                                    id="user-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={form.errors.email} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Role</Label>
                                <Input
                                    value={
                                        editTarget?.roles?.[0]?.replace(
                                            '_',
                                            ' ',
                                        ) ?? '—'
                                    }
                                    disabled
                                    className="capitalize"
                                />
                                {editTarget?.permissions_managed_at ? (
                                    <p className="text-xs text-muted-foreground">
                                        Custom permissions are active for this
                                        user.
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        This user is still using the default
                                        full access for their role.
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(v) =>
                                        form.setData('status', v as Status)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="banned">
                                            Banned
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.status} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <ShieldCheck className="size-4" />
                                Feature Permissions
                            </Label>

                            {assignablePermissions.length === 0 ? (
                                <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        No permissions are configured for this
                                        role yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
                                    {assignablePermissions.map((permission) => {
                                        const checked =
                                            form.data.permissions.includes(
                                                permission,
                                            );

                                        return (
                                            <label
                                                key={permission}
                                                htmlFor={`permission-${permission}`}
                                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40"
                                            >
                                                <input
                                                    id={`permission-${permission}`}
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        togglePermission(
                                                            permission,
                                                        )
                                                    }
                                                    className="size-4 accent-primary"
                                                />
                                                <span className="break-all">
                                                    {formatPermission(
                                                        permission,
                                                    )}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                            <InputError message={form.errors.permissions} />
                        </div>

                        <DialogFooter className="border-t border-border pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEdit}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminUsersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Users', href: '/admin/users' },
    ],
};
