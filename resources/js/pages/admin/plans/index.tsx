import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, PlusIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { useConfirm } from '@/hooks/use-confirm';
import admin from '@/routes/admin';

type PlanStatus = 'active' | 'inactive';

interface Plan {
    id: number;
    name: string;
    price: string;
    duration_days: number;
    gig_limit: number;
    features: string[];
    status: PlanStatus;
}

interface Props {
    plans: Plan[];
}

type PlanFormData = {
    name: string;
    price: string;
    duration_days: string;
    gig_limit: string;
    features_text: string;
    status: PlanStatus;
};

function PlanForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    onCancel,
}: {
    data: PlanFormData;
    setData: (key: keyof PlanFormData, value: string) => void;
    errors: Partial<Record<keyof PlanFormData, string>>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="plan-name">Plan Name</Label>
                    <Input
                        id="plan-name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Basic, Pro, etc."
                        required
                        autoFocus
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="plan-price">Price</Label>
                    <Input
                        id="plan-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.price}
                        onChange={(e) => setData('price', e.target.value)}
                        placeholder="0.00"
                        required
                    />
                    <InputError message={errors.price} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="plan-duration">Duration (days)</Label>
                    <Input
                        id="plan-duration"
                        type="number"
                        min="1"
                        value={data.duration_days}
                        onChange={(e) =>
                            setData('duration_days', e.target.value)
                        }
                        placeholder="30"
                        required
                    />
                    <InputError message={errors.duration_days} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="plan-limit">Gig Limit</Label>
                    <Input
                        id="plan-limit"
                        type="number"
                        min="1"
                        value={data.gig_limit}
                        onChange={(e) => setData('gig_limit', e.target.value)}
                        placeholder="10"
                        required
                    />
                    <InputError message={errors.gig_limit} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="plan-features">Features (one per line)</Label>
                <textarea
                    id="plan-features"
                    rows={4}
                    value={data.features_text}
                    onChange={(e) => setData('features_text', e.target.value)}
                    placeholder={
                        'Priority listing\nCustom support\nMore revisions'
                    }
                    className="min-h-[112px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <InputError message={errors.features_text} />
            </div>

            <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                    value={data.status}
                    onValueChange={(v) => setData('status', v as PlanStatus)}
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

export default function AdminPlansIndex({ plans }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Plan | null>(null);
    const confirm = useConfirm();

    const createForm = useForm<PlanFormData>({
        name: '',
        price: '',
        duration_days: '30',
        gig_limit: '10',
        features_text: '',
        status: 'active',
    });

    const editForm = useForm<PlanFormData>({
        name: '',
        price: '',
        duration_days: '',
        gig_limit: '',
        features_text: '',
        status: 'active',
    });

    const openEdit = (plan: Plan) => {
        setEditTarget(plan);
        editForm.setData({
            name: plan.name,
            price: plan.price,
            duration_days: String(plan.duration_days),
            gig_limit: String(plan.gig_limit),
            features_text: (plan.features ?? []).join('\n'),
            status: plan.status,
        });
        editForm.clearErrors();
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/plans', {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreate(false);
                createForm.reset();
                createForm.setData('duration_days', '30');
                createForm.setData('gig_limit', '10');
                createForm.setData('status', 'active');
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editTarget) {
            return;
        }

        editForm.put(`/admin/plans/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditTarget(null);
                editForm.clearErrors();
            },
        });
    };

    const handleDelete = async (plan: Plan) => {
        const ok = await confirm({
            title: `Delete "${plan.name}"?`,
            description: 'This action cannot be undone.',
        });

        if (ok) {
            router.delete(`/admin/plans/${plan.id}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Subscription Plans" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Subscription Plans"
                        description="Manage seller subscription packages and limits."
                    />
                    <Button onClick={() => setShowCreate(true)} size="sm">
                        <PlusIcon />
                        Add Plan
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                                <th className="px-4 py-3 text-left font-medium">
                                    Name
                                </th>
                                <th className="px-4 py-3 text-left font-medium">
                                    Price
                                </th>
                                <th className="px-4 py-3 text-left font-medium">
                                    Duration
                                </th>
                                <th className="px-4 py-3 text-left font-medium">
                                    Gig Limit
                                </th>
                                <th className="px-4 py-3 text-left font-medium">
                                    Features
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
                            {plans.map((plan) => (
                                <tr
                                    key={plan.id}
                                    className="bg-background transition-colors hover:bg-muted/30"
                                >
                                    <td className="px-4 py-3 font-medium text-foreground">
                                        {plan.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        ${plan.price}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {plan.duration_days} days
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {plan.gig_limit}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {plan.features.length}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                plan.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {plan.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(plan)}
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleDelete(plan)
                                                }
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Subscription Plan</DialogTitle>
                    </DialogHeader>
                    <PlanForm
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
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subscription Plan</DialogTitle>
                    </DialogHeader>
                    <PlanForm
                        data={editForm.data}
                        setData={editForm.setData}
                        errors={editForm.errors}
                        processing={editForm.processing}
                        onSubmit={handleEdit}
                        onCancel={() => setEditTarget(null)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminPlansIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Plans', href: '/admin/plans' },
    ],
};
