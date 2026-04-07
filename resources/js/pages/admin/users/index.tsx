import { Head, useForm } from '@inertiajs/react';
import { Pencil, ShieldCheck, UserCog } from 'lucide-react';
import { useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import admin from '@/routes/admin';

type Status = 'active' | 'banned';

type UserRow = {
    id: number;
    name: string;
    email: string;
    status: Status;
    created_at: string;
    roles: string[];
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

    const form = useForm<UserUpdateForm>({
        name: '',
        email: '',
        status: 'active',
        permissions: [],
    });

    const usersWithPrimaryRole = useMemo(
        () => users.map((user) => ({ ...user, primaryRole: user.roles[0] ?? '—' })),
        [users],
    );
    const assignablePermissions = permissionsByRole[editTarget?.roles?.[0] ?? ''] ?? [];
    const formatPermission = (permission: string) => permission.split('.').slice(1, -1).join(' ').replace(/\b\w/g, (char) => char.toUpperCase());

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

                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-4 py-3 text-left font-medium">User</th>
                                <th className="px-4 py-3 text-left font-medium">Role</th>
                                <th className="px-4 py-3 text-left font-medium">Permissions</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {usersWithPrimaryRole.map((user) => (
                                <tr key={user.id} className="bg-background transition-colors hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-foreground">{user.name}</div>
                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="capitalize">
                                            {user.primaryRole.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {user.permissions.length}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                            {user.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                                                <Pencil className="size-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={!!editTarget} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="size-4" />
                            Edit User
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Update account details, status, and feature permissions.
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleUpdate} className="space-y-5 pt-1">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="user-name">Name</Label>
                                <Input
                                    id="user-name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="user-email">Email</Label>
                                <Input
                                    id="user-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={form.errors.email} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Role</Label>
                                <Input
                                    value={editTarget?.roles?.[0]?.replace('_', ' ') ?? '—'}
                                    disabled
                                    className="capitalize"
                                />
                                {editTarget?.permissions_managed_at ? (
                                    <p className="text-xs text-muted-foreground">Custom permissions are active for this user.</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">This user is still using the default full access for their role.</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(v) => form.setData('status', v as Status)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="banned">Banned</SelectItem>
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
                                        No permissions are configured for this role yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
                                    {assignablePermissions.map((permission) => {
                                        const checked = form.data.permissions.includes(permission);

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
                                                    onChange={() => togglePermission(permission)}
                                                    className="size-4 accent-primary"
                                                />
                                                <span className="break-all">{formatPermission(permission)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                            <InputError message={form.errors.permissions} />
                        </div>

                        <DialogFooter className="border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={closeEdit}>
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
