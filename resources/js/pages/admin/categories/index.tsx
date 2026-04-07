import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Pencil,
    PlusIcon,
    Trash2,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import categories from '@/routes/admin/categories';

interface Category {
    id: number;
    name: string;
    slug: string;
    status: 'active' | 'inactive';
    subcategories: Category[];
}

interface Props {
    categories: Category[];
}

type FormData = {
    name: string;
    status: 'active' | 'inactive';
    parent_id: string;
};

function CategoryForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    onCancel,
    showParent,
    parentCategories,
}: {
    data: FormData;
    setData: (key: keyof FormData, value: string) => void;
    errors: Partial<Record<keyof FormData, string>>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    showParent: boolean;
    parentCategories: Category[];
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {showParent && (
                <div className="grid gap-2">
                    <Label>Parent Category</Label>
                    <Select
                        value={data.parent_id || 'none'}
                        onValueChange={(v) =>
                            setData('parent_id', v === 'none' ? '' : v)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                None (top-level)
                            </SelectItem>
                            {parentCategories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Leave this as "None (top-level)" to create a new parent
                        category.
                    </p>
                    <InputError message={errors.parent_id} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                    id="cat-name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Category name"
                    required
                    autoFocus
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                    value={data.status}
                    onValueChange={(v) =>
                        setData('status', v as 'active' | 'inactive')
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

export default function CategoriesIndex({ categories: cats }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Category | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const createForm = useForm<FormData>({
        name: '',
        status: 'active',
        parent_id: '',
    });
    const editForm = useForm<FormData>({
        name: '',
        status: 'active',
        parent_id: '',
    });

    const confirm = useConfirm();

    const toggleExpand = (id: number) =>
        setExpandedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });

    const openEdit = (cat: Category) => {
        setEditTarget(cat);
        editForm.setData({ name: cat.name, status: cat.status, parent_id: '' });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            categories.store.url(),
            {
                ...createForm.data,
                parent_id: createForm.data.parent_id || null,
            },
            {
                onError: (errors) =>
                    createForm.setError(
                        errors as Partial<Record<keyof FormData, string>>,
                    ),
                onSuccess: () => {
                    setShowCreate(false);
                    createForm.reset();
                    createForm.clearErrors();
                },
            },
        );
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editTarget) {
            return;
        }

        editForm.put(categories.update.url(editTarget.id), {
            onSuccess: () => setEditTarget(null),
        });
    };

    const handleDelete = async (cat: Category) => {
        const ok = await confirm({
            title: `Delete "${cat.name}"?`,
            description: cat.subcategories?.length
                ? `This will also delete ${cat.subcategories.length} ${cat.subcategories.length === 1 ? 'subcategory' : 'subcategories'}.`
                : 'This action cannot be undone.',
        });

        if (ok) {
            router.delete(categories.destroy.url(cat.id));
        }
    };

    return (
        <>
            <Head title="Categories" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Categories"
                        description="Manage parent categories and subcategories."
                    />
                    <Button onClick={() => setShowCreate(true)} size="sm">
                        <PlusIcon />
                        Add Category
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
                                    Slug
                                </th>
                                <th className="px-4 py-3 text-left font-medium">
                                    Subcategories
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
                            {cats.map((cat) => (
                                <Fragment key={cat.id}>
                                    <tr className="bg-background transition-colors hover:bg-muted/30">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            <button
                                                onClick={() =>
                                                    toggleExpand(cat.id)
                                                }
                                                className="flex items-center gap-1.5 transition-colors hover:text-primary"
                                            >
                                                {expandedIds.has(cat.id) ? (
                                                    <ChevronDown className="size-3.5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                                )}
                                                {cat.name}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {cat.slug}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {cat.subcategories.length}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    cat.status === 'active'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {cat.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        openEdit(cat)
                                                    }
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleDelete(cat)
                                                    }
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>

                                    {expandedIds.has(cat.id) &&
                                        cat.subcategories.map((sub) => (
                                            <tr
                                                key={sub.id}
                                                className="bg-muted/20 transition-colors hover:bg-muted/40"
                                            >
                                                <td className="flex items-center gap-1.5 px-4 py-2.5 pl-10 text-muted-foreground">
                                                    <span className="text-muted-foreground/50">
                                                        ↳
                                                    </span>
                                                    {sub.name}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                                    {sub.slug}
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    —
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <Badge
                                                        variant={
                                                            sub.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {sub.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openEdit(sub)
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    sub,
                                                                )
                                                            }
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Category</DialogTitle>
                    </DialogHeader>
                    <CategoryForm
                        data={createForm.data}
                        setData={createForm.setData}
                        errors={createForm.errors}
                        processing={createForm.processing}
                        onSubmit={handleCreate}
                        onCancel={() => setShowCreate(false)}
                        showParent
                        parentCategories={cats}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog
                open={!!editTarget}
                onOpenChange={(open) => !open && setEditTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <CategoryForm
                        data={editForm.data}
                        setData={editForm.setData}
                        errors={editForm.errors}
                        processing={editForm.processing}
                        onSubmit={handleEdit}
                        onCancel={() => setEditTarget(null)}
                        showParent={false}
                        parentCategories={cats}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: admin.dashboard.url() },
        { title: 'Categories', href: admin.categories.index.url() },
    ],
};
