import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
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

type CouponStatus = 'active' | 'inactive';
type DiscountType = 'fixed' | 'percentage';

type Coupon = {
    id: number;
    code: string;
    description: string | null;
    discount_type: DiscountType;
    discount_value: string;
    minimum_order_amount: string;
    usage_limit: number | null;
    used_count: number;
    starts_at: string | null;
    expires_at: string | null;
    status: CouponStatus;
};

type Props = {
    coupons: Coupon[];
};

type CouponFormData = {
    code: string;
    description: string;
    discount_type: DiscountType;
    discount_value: string;
    minimum_order_amount: string;
    usage_limit: string;
    starts_at: string;
    expires_at: string;
    status: CouponStatus;
};

function toDatetimeLocal(value: string | null) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 16);
}

function CouponForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    onCancel,
}: {
    data: CouponFormData;
    setData: <K extends keyof CouponFormData>(
        key: K,
        value: CouponFormData[K],
    ) => void;
    errors: Partial<Record<keyof CouponFormData, string>>;
    processing: boolean;
    onSubmit: (event: React.FormEvent) => void;
    onCancel: () => void;
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="coupon-code">Coupon code</Label>
                    <Input
                        id="coupon-code"
                        value={data.code}
                        onChange={(event) =>
                            setData('code', event.target.value.toUpperCase())
                        }
                        placeholder="SAVE20"
                        required
                        autoFocus
                    />
                    <InputError message={errors.code} />
                </div>

                <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                        value={data.status}
                        onValueChange={(value) =>
                            setData('status', value as CouponStatus)
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
                <Label htmlFor="coupon-description">Description</Label>
                <Input
                    id="coupon-description"
                    value={data.description}
                    onChange={(event) =>
                        setData('description', event.target.value)
                    }
                    placeholder="Spring launch discount"
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Discount type</Label>
                    <Select
                        value={data.discount_type}
                        onValueChange={(value) =>
                            setData('discount_type', value as DiscountType)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fixed">Fixed amount</SelectItem>
                            <SelectItem value="percentage">
                                Percentage
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.discount_type} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="coupon-discount">Discount value</Label>
                    <Input
                        id="coupon-discount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={data.discount_value}
                        onChange={(event) =>
                            setData('discount_value', event.target.value)
                        }
                        placeholder={
                            data.discount_type === 'percentage' ? '10' : '25.00'
                        }
                        required
                    />
                    <InputError message={errors.discount_value} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="coupon-minimum">Minimum order amount</Label>
                    <Input
                        id="coupon-minimum"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.minimum_order_amount}
                        onChange={(event) =>
                            setData('minimum_order_amount', event.target.value)
                        }
                        placeholder="Optional"
                    />
                    <InputError message={errors.minimum_order_amount} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="coupon-limit">Usage limit</Label>
                    <Input
                        id="coupon-limit"
                        type="number"
                        min="1"
                        step="1"
                        value={data.usage_limit}
                        onChange={(event) =>
                            setData('usage_limit', event.target.value)
                        }
                        placeholder="Optional"
                    />
                    <InputError message={errors.usage_limit} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="coupon-starts-at">Starts at</Label>
                    <Input
                        id="coupon-starts-at"
                        type="datetime-local"
                        value={data.starts_at}
                        onChange={(event) =>
                            setData('starts_at', event.target.value)
                        }
                    />
                    <InputError message={errors.starts_at} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="coupon-expires-at">Expires at</Label>
                    <Input
                        id="coupon-expires-at"
                        type="datetime-local"
                        value={data.expires_at}
                        onChange={(event) =>
                            setData('expires_at', event.target.value)
                        }
                    />
                    <InputError message={errors.expires_at} />
                </div>
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

export default function AdminCouponsIndex({ coupons }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Coupon | null>(null);
    const confirm = useConfirm();
    const initialState: CouponFormData = {
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        minimum_order_amount: '',
        usage_limit: '',
        starts_at: '',
        expires_at: '',
        status: 'active',
    };

    const createForm = useForm<CouponFormData>(initialState);
    const editForm = useForm<CouponFormData>(initialState);
    const paginatedCoupons = useClientPagination(coupons);

    const openEdit = (coupon: Coupon) => {
        setEditTarget(coupon);
        editForm.clearErrors();
        editForm.setData({
            code: coupon.code,
            description: coupon.description ?? '',
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            minimum_order_amount: coupon.minimum_order_amount,
            usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
            starts_at: toDatetimeLocal(coupon.starts_at),
            expires_at: toDatetimeLocal(coupon.expires_at),
            status: coupon.status,
        });
    };

    const handleCreate = (event: React.FormEvent) => {
        event.preventDefault();

        createForm.post('/admin/coupons', {
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

        editForm.put(`/admin/coupons/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                editForm.reset();
                setEditTarget(null);
            },
        });
    };

    const destroyCoupon = async (coupon: Coupon) => {
        const ok = await confirm({
            title: `Delete ${coupon.code}?`,
            description: 'This action cannot be undone.',
        });

        if (!ok) {
            return;
        }

        router.delete(`/admin/coupons/${coupon.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Coupons" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Coupons"
                        description="Manage discount codes buyers can use while purchasing gigs."
                    />
                    <Button onClick={() => setShowCreate(true)} size="sm">
                        <PlusIcon className="mr-2 size-4" />
                        Add Coupon
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    {coupons.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <h2 className="text-lg font-semibold">
                                No coupons yet
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Create your first coupon to offer buyer
                                discounts.
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-full overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Code
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Discount
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Rules
                                        </th>
                                        <th className="border-b border-border bg-muted/40 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Usage
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
                                    {paginatedCoupons.paginatedItems.map(
                                        (coupon) => (
                                            <tr
                                                key={coupon.id}
                                                className="bg-background transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-foreground">
                                                        {coupon.code}
                                                    </p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        {coupon.description ||
                                                            'No description'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {coupon.discount_type ===
                                                    'percentage'
                                                        ? `${coupon.discount_value}% off`
                                                        : `USD ${coupon.discount_value} off`}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    <p>
                                                        Min order:{' '}
                                                        {coupon.minimum_order_amount
                                                            ? `USD ${coupon.minimum_order_amount}`
                                                            : 'None'}
                                                    </p>
                                                    <p className="mt-1">
                                                        Schedule:{' '}
                                                        {coupon.starts_at ||
                                                        coupon.expires_at
                                                            ? 'Timed'
                                                            : 'Always on'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    <p>
                                                        Used {coupon.used_count}{' '}
                                                        times
                                                    </p>
                                                    <p className="mt-1">
                                                        Limit:{' '}
                                                        {coupon.usage_limit ??
                                                            'Unlimited'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            coupon.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {coupon.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openEdit(coupon)
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                destroyCoupon(
                                                                    coupon,
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
                    {coupons.length > 0 && (
                        <TablePagination
                            page={paginatedCoupons.page}
                            pageSize={paginatedCoupons.pageSize}
                            totalItems={paginatedCoupons.totalItems}
                            totalPages={paginatedCoupons.totalPages}
                            startItem={paginatedCoupons.startItem}
                            endItem={paginatedCoupons.endItem}
                            hasPreviousPage={paginatedCoupons.hasPreviousPage}
                            hasNextPage={paginatedCoupons.hasNextPage}
                            onPageChange={paginatedCoupons.setPage}
                            onPageSizeChange={paginatedCoupons.setPageSize}
                        />
                    )}
                </div>
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Coupon</DialogTitle>
                    </DialogHeader>
                    <CouponForm
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
                        <DialogTitle>Edit Coupon</DialogTitle>
                    </DialogHeader>
                    <CouponForm
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

AdminCouponsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Coupons', href: '/admin/coupons' },
    ],
};
