import { Head, router, useForm } from '@inertiajs/react';
import { ImagePlus, Eye, Lock, Pencil, PlusIcon, Power, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import SellerLevelBadge from '@/components/seller-level-badge';
import type { SellerLevelBadgeData } from '@/components/seller-level-badge';
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
import type { BreadcrumbItem } from '@/types';

type PackageTier = 'basic' | 'standard' | 'premium';
type GigStatus = 'active' | 'inactive';

type PackageForm = {
    title: string;
    description: string;
    price: string;
    delivery_days: string;
    revision_count: string;
};

type GigFormState = {
    title: string;
    description: string;
    category_id: string;
    subcategory_id: string;
    tags: string;
    status: GigStatus;
    images: File[];
    remove_image_ids: number[];
    packages: Record<PackageTier, PackageForm>;
};

type CategoryOption = {
    id: number;
    name: string;
    subcategories: { id: number; name: string }[];
};

type GigItem = {
    id: number;
    title: string;
    description: string;
    category_id: number;
    subcategory_id: number;
    category_name: string | null;
    subcategory_name: string | null;
    tags: string;
    status: GigStatus;
    approval_status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    views_count: number;
    is_locked: boolean;
    images: { id: number; url: string }[];
    packages: Record<PackageTier, PackageForm>;
};

type Props = {
    gigs: GigItem[];
    categories: CategoryOption[];
    seller_level: SellerLevelBadgeData;
    seller_is_available: boolean;
    subscription: {
        plan_name: string;
        gig_limit: number;
        active_gig_count: number;
        total_gig_count: number;
        ends_at?: string | null;
    };
};

const PACKAGE_TIERS: { key: PackageTier; label: string }[] = [
    { key: 'basic', label: 'Basic' },
    { key: 'standard', label: 'Standard' },
    { key: 'premium', label: 'Premium' },
];

const emptyPackage = (): PackageForm => ({
    title: '',
    description: '',
    price: '',
    delivery_days: '',
    revision_count: '0',
});

const emptyGigForm = (): GigFormState => ({
    title: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    tags: '',
    status: 'inactive',
    images: [],
    remove_image_ids: [],
    packages: {
        basic: emptyPackage(),
        standard: emptyPackage(),
        premium: emptyPackage(),
    },
});

function formatDisplayDate(value: string | null | undefined) {
    if (!value) {
        return 'No expiry date';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

function buildGigFormState(gig?: GigItem | null): GigFormState {
    if (!gig) {
        return emptyGigForm();
    }

    return {
        title: gig.title,
        description: gig.description,
        category_id: String(gig.category_id),
        subcategory_id: String(gig.subcategory_id),
        tags: gig.tags,
        status: gig.status,
        images: [],
        remove_image_ids: [],
        packages: {
            basic: { ...gig.packages.basic },
            standard: { ...gig.packages.standard },
            premium: { ...gig.packages.premium },
        },
    };
}

function GigForm({
    form,
    categories,
    existingImages = [],
    onSubmit,
    onCancel,
    submitLabel,
}: {
    form: ReturnType<typeof useForm<GigFormState>>;
    categories: CategoryOption[];
    existingImages?: GigItem['images'];
    onSubmit: (event: React.FormEvent) => void;
    onCancel: () => void;
    submitLabel: string;
}) {
    const selectedCategory = categories.find(
        (category) => String(category.id) === form.data.category_id,
    );

    const updatePackage = (
        tier: PackageTier,
        field: keyof PackageForm,
        value: string,
    ) => {
        form.setData('packages', {
            ...form.data.packages,
            [tier]: {
                ...form.data.packages[tier],
                [field]: value,
            },
        });
    };

    const toggleImageRemoval = (imageId: number) => {
        const imageIds = form.data.remove_image_ids.includes(imageId)
            ? form.data.remove_image_ids.filter((id) => id !== imageId)
            : [...form.data.remove_image_ids, imageId];

        form.setData('remove_image_ids', imageIds);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="gig-title">Gig title</Label>
                    <Input
                        id="gig-title"
                        value={form.data.title}
                        onChange={(event) =>
                            form.setData('title', event.target.value)
                        }
                        placeholder="I will design a modern landing page"
                        required
                        autoFocus
                    />
                    <InputError message={form.errors.title} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="gig-tags">Tags</Label>
                    <Input
                        id="gig-tags"
                        value={form.data.tags}
                        onChange={(event) =>
                            form.setData('tags', event.target.value)
                        }
                        placeholder="Laravel, React, UI Design"
                    />
                    <p className="text-xs text-muted-foreground">
                        Optional comma-separated tags.
                    </p>
                    <InputError message={form.errors.tags} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="gig-description">Description</Label>
                <textarea
                    id="gig-description"
                    rows={5}
                    value={form.data.description}
                    onChange={(event) =>
                        form.setData('description', event.target.value)
                    }
                    className="min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="Describe what you will deliver, what is included, and who this service is for."
                />
                <InputError message={form.errors.description} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select
                        value={form.data.category_id}
                        onValueChange={(value) => {
                            form.setData('category_id', value);
                            form.setData('subcategory_id', '');
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={String(category.id)}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.category_id} />
                </div>

                <div className="grid gap-2">
                    <Label>Subcategory</Label>
                    <Select
                        value={form.data.subcategory_id}
                        onValueChange={(value) =>
                            form.setData('subcategory_id', value)
                        }
                        disabled={!selectedCategory}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                            {(selectedCategory?.subcategories ?? []).map(
                                (subcategory) => (
                                    <SelectItem
                                        key={subcategory.id}
                                        value={String(subcategory.id)}
                                    >
                                        {subcategory.name}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.subcategory_id} />
                </div>

                <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                        value={form.data.status}
                        onValueChange={(value) =>
                            form.setData('status', value as GigStatus)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.status} />
                </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4">
                <div>
                    <h3 className="font-semibold">Gig images</h3>
                    <p className="text-sm text-muted-foreground">
                        Upload multiple images to showcase this gig.
                    </p>
                </div>

                {existingImages.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {existingImages.map((image) => {
                            const markedForRemoval =
                                form.data.remove_image_ids.includes(image.id);

                            return (
                                <label
                                    key={image.id}
                                    className={`rounded-xl border p-2 transition ${
                                        markedForRemoval
                                            ? 'border-destructive bg-destructive/5'
                                            : 'border-border'
                                    }`}
                                >
                                    <img
                                        src={image.url}
                                        alt="Gig"
                                        className="h-28 w-full rounded-lg object-cover"
                                    />
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={markedForRemoval}
                                            onChange={() =>
                                                toggleImageRemoval(image.id)
                                            }
                                        />
                                        Remove this image
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="gig-images">Add images</Label>
                    <Input
                        id="gig-images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(event) =>
                            form.setData(
                                'images',
                                Array.from(event.target.files ?? []),
                            )
                        }
                    />
                    <p className="text-xs text-muted-foreground">
                        {form.data.images.length > 0
                            ? `${form.data.images.length} new image(s) selected.`
                            : 'You can upload up to 8 images.'}
                    </p>
                    <InputError message={form.errors.images} />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold">Packages</h3>
                    <p className="text-sm text-muted-foreground">
                        Every gig must include Basic, Standard, and Premium
                        packages.
                    </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    {PACKAGE_TIERS.map((tier) => (
                        <div
                            key={tier.key}
                            className="rounded-2xl border border-border/70 bg-card p-4"
                        >
                            <div className="mb-4">
                                <h4 className="font-semibold">{tier.label}</h4>
                                <p className="text-sm text-muted-foreground">
                                    Define pricing and delivery expectations.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={`${tier.key}-title`}>
                                        Title
                                    </Label>
                                    <Input
                                        id={`${tier.key}-title`}
                                        value={
                                            form.data.packages[tier.key].title
                                        }
                                        onChange={(event) =>
                                            updatePackage(
                                                tier.key,
                                                'title',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={`${tier.label} package title`}
                                    />
                                    <InputError
                                        message={
                                            form.errors[
                                                `packages.${tier.key}.title`
                                            ]
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`${tier.key}-description`}>
                                        Description
                                    </Label>
                                    <textarea
                                        id={`${tier.key}-description`}
                                        rows={4}
                                        value={
                                            form.data.packages[tier.key]
                                                .description
                                        }
                                        onChange={(event) =>
                                            updatePackage(
                                                tier.key,
                                                'description',
                                                event.target.value,
                                            )
                                        }
                                        className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        placeholder="What is included in this package?"
                                    />
                                    <InputError
                                        message={
                                            form.errors[
                                                `packages.${tier.key}.description`
                                            ]
                                        }
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor={`${tier.key}-price`}>
                                            Price
                                        </Label>
                                        <Input
                                            id={`${tier.key}-price`}
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={
                                                form.data.packages[tier.key]
                                                    .price
                                            }
                                            onChange={(event) =>
                                                updatePackage(
                                                    tier.key,
                                                    'price',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                form.errors[
                                                    `packages.${tier.key}.price`
                                                ]
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor={`${tier.key}-delivery`}>
                                            Delivery days
                                        </Label>
                                        <Input
                                            id={`${tier.key}-delivery`}
                                            type="number"
                                            min="1"
                                            value={
                                                form.data.packages[tier.key]
                                                    .delivery_days
                                            }
                                            onChange={(event) =>
                                                updatePackage(
                                                    tier.key,
                                                    'delivery_days',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                form.errors[
                                                    `packages.${tier.key}.delivery_days`
                                                ]
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor={`${tier.key}-revisions`}
                                        >
                                            Revisions
                                        </Label>
                                        <Input
                                            id={`${tier.key}-revisions`}
                                            type="number"
                                            min="0"
                                            value={
                                                form.data.packages[tier.key]
                                                    .revision_count
                                            }
                                            onChange={(event) =>
                                                updatePackage(
                                                    tier.key,
                                                    'revision_count',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={
                                                form.errors[
                                                    `packages.${tier.key}.revision_count`
                                                ]
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving…' : submitLabel}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function SellerGigsIndex({
    gigs,
    categories,
    seller_level,
    seller_is_available,
    subscription,
}: Props) {
    const confirm = useConfirm();
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<GigItem | null>(null);
    const [isAvailable, setIsAvailable] = useState(seller_is_available);
    const [isAvailabilityUpdating, setIsAvailabilityUpdating] = useState(false);

    const createForm = useForm<GigFormState>(emptyGigForm());
    const editForm = useForm<GigFormState>(emptyGigForm());

    const remainingSlots = Math.max(
        subscription.gig_limit - subscription.active_gig_count,
        0,
    );
    const canCreateGig = subscription.total_gig_count < subscription.gig_limit;

    const subscriptionEndsText = useMemo(() => {
        return formatDisplayDate(subscription.ends_at);
    }, [subscription.ends_at]);

    useEffect(() => {
        setIsAvailable(seller_is_available);
    }, [seller_is_available]);

    const toggleAvailability = () => {
        if (isAvailabilityUpdating) {
            return;
        }

        const previous = isAvailable;
        const next = !isAvailable;
        setIsAvailable(next);
        setIsAvailabilityUpdating(true);

        router.put(
            '/seller/availability',
            { is_available: next },
            {
                preserveScroll: true,
                onError: () => {
                    setIsAvailable(previous);
                },
                onFinish: () => {
                    setIsAvailabilityUpdating(false);
                },
            },
        );
    };

    const openEdit = (gig: GigItem) => {
        setEditTarget(gig);
        editForm.setData(buildGigFormState(gig));
        editForm.clearErrors();
    };

    const handleCreate = (event: React.FormEvent) => {
        event.preventDefault();

        createForm.post('/seller/gigs', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                createForm.setData(emptyGigForm());
                createForm.clearErrors();
                setShowCreate(false);
            },
        });
    };

    const handleEdit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!editTarget) {
            return;
        }

        editForm.post(`/seller/gigs/${editTarget.id}?_method=PUT`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                editForm.clearErrors();
                setEditTarget(null);
            },
        });
    };

    const handleDelete = async (gig: GigItem) => {
        const ok = await confirm({
            title: `Delete "${gig.title}"?`,
            description:
                'This will permanently remove the gig, packages, and images.',
        });

        if (ok) {
            router.delete(`/seller/gigs/${gig.id}`, { preserveScroll: true });
        }
    };

    const handleStatusToggle = (gig: GigItem) => {
        router.post(
            `/seller/gigs/${gig.id}?_method=PUT`,
            {
                ...buildGigFormState(gig),
                status: gig.status === 'active' ? 'inactive' : 'active',
            },
            {
                preserveScroll: true,
                forceFormData: true,
            },
        );
    };

    return (
        <>
            <Head title="My Gigs" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Heading
                        title="My Gigs"
                        description="Create, price, activate, and maintain the services you sell."
                    />

                    <div className="flex flex-wrap items-center gap-3">
                        <SellerLevelBadge level={seller_level} />
                        <Button onClick={() => setShowCreate(true)} size="sm" disabled={!canCreateGig} title={!canCreateGig ? 'Gig limit reached. Upgrade your plan to create more gigs.' : undefined}>
                            <PlusIcon />
                            Create Gig
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <p className="text-sm text-muted-foreground">
                            Active plan
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {subscription.plan_name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Renews or expires on {subscriptionEndsText}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <p className="text-sm text-muted-foreground">
                            Active gigs
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {subscription.active_gig_count} /{' '}
                            {subscription.gig_limit}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your current plan controls how many gigs can stay
                            live.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <p className="text-sm text-muted-foreground">
                            Remaining slots
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {remainingSlots}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Activate more gigs after freeing slots or upgrading
                            plans.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">
                                Availability
                            </p>
                            <Badge
                                variant={
                                    isAvailable
                                        ? 'default'
                                        : 'destructive'
                                }
                            >
                                {isAvailable
                                    ? 'Accepting orders'
                                    : 'On a break'}
                            </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Toggle this when you are away. Buyers can still view
                            your gigs, but new orders will be blocked.
                        </p>
                        <Button
                            type="button"
                            variant={isAvailable ? 'outline' : 'default'}
                            className="mt-4 w-full"
                            onClick={toggleAvailability}
                            disabled={isAvailabilityUpdating}
                        >
                            {isAvailabilityUpdating
                                ? 'Updating...'
                                : isAvailable
                                ? 'Pause new orders'
                                : 'Resume new orders'}
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card">
                    <div className="border-b border-border/70 px-5 py-4">
                        <h2 className="font-semibold">Gig library</h2>
                        <p className="text-sm text-muted-foreground">
                            All of your gigs, including draft or inactive
                            listings.
                        </p>
                    </div>

                    {gigs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <div className="rounded-full bg-muted p-3">
                                <ImagePlus className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">No gigs yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Create your first gig with three packages
                                    and gallery images.
                                </p>
                            </div>
                            <Button onClick={() => setShowCreate(true)} disabled={!canCreateGig}>
                                <PlusIcon />
                                Create your first gig
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
                            {gigs.map((gig) => (
                                <article
                                    key={gig.id}
                                    className={`relative overflow-hidden rounded-2xl border bg-background ${
                                        gig.is_locked
                                            ? 'border-destructive/40 opacity-60'
                                            : 'border-border/70'
                                    }`}
                                >
                                    {gig.is_locked && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/20">
                                            <Lock className="size-6 text-destructive" />
                                            <p className="px-4 text-center text-sm font-medium text-destructive">
                                                Locked — upgrade your plan to manage this gig
                                            </p>
                                        </div>
                                    )}
                                    <div className="aspect-[16/9] bg-muted">
                                        {gig.images[0] ? (
                                            <img
                                                src={gig.images[0].url}
                                                alt={gig.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                                No image uploaded
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold">
                                                    {gig.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {gig.category_name} /{' '}
                                                    {gig.subcategory_name}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    gig.status === 'active'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {gig.status}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Badge
                                                variant={
                                                    gig.approval_status ===
                                                    'approved'
                                                        ? 'default'
                                                        : gig.approval_status ===
                                                            'rejected'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {gig.approval_status}
                                            </Badge>
                                        </div>

                                        {gig.rejection_reason ? (
                                            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                                Rejected: {gig.rejection_reason}
                                            </p>
                                        ) : gig.approval_status ===
                                          'pending' ? (
                                            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                                Pending admin review. This gig
                                                is not visible to buyers until
                                                approved.
                                            </p>
                                        ) : null}

                                        <p className="line-clamp-3 text-sm text-muted-foreground">
                                            {gig.description}
                                        </p>

                                        <div className="grid gap-2 rounded-xl bg-muted/40 p-3">
                                            {PACKAGE_TIERS.map((tier) => (
                                                <div
                                                    key={tier.key}
                                                    className="flex items-center justify-between text-sm"
                                                >
                                                    <span>{tier.label}</span>
                                                    <span className="font-medium">
                                                        $
                                                        {gig.packages[tier.key]
                                                            .price || '0.00'}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm">
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Eye className="size-3.5" />
                                                    Views
                                                </span>
                                                <span className="font-medium">
                                                    {gig.views_count.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(gig)}
                                            >
                                                <Pencil className="size-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleStatusToggle(gig)
                                                }
                                            >
                                                <Power className="size-4" />
                                                {gig.status === 'active'
                                                    ? 'Deactivate'
                                                    : 'Activate'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(gig)
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Create a seller gig</DialogTitle>
                    </DialogHeader>

                    <GigForm
                        form={createForm}
                        categories={categories}
                        onSubmit={handleCreate}
                        onCancel={() => setShowCreate(false)}
                        submitLabel="Create gig"
                    />
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(editTarget)}
                onOpenChange={(open) => !open && setEditTarget(null)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Edit gig</DialogTitle>
                    </DialogHeader>

                    <GigForm
                        form={editForm}
                        categories={categories}
                        existingImages={editTarget?.images ?? []}
                        onSubmit={handleEdit}
                        onCancel={() => setEditTarget(null)}
                        submitLabel="Update gig"
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

SellerGigsIndex.layout = {
    breadcrumbs: [
        {
            title: 'My Gigs',
            href: '/seller/gigs',
        },
    ] satisfies BreadcrumbItem[],
};
