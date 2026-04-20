import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import SettingsLayout from '@/layouts/settings/layout';
import { update } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const canManageExtendedProfile = !(
        auth.user.roles as string[] | undefined
    )?.includes('super_admin');
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const form = useForm<{
        name: string;
        email: string;
        bio: string;
        phone: string;
        profile_picture: File | null;
        remove_profile_picture: boolean;
        skills: string;
        location: string;
        website: string;
    }>({
        name: auth.user.name ?? '',
        email: auth.user.email ?? '',
        bio: (auth.user.bio as string | null) ?? '',
        phone: (auth.user.phone as string | null) ?? '',
        profile_picture: null,
        remove_profile_picture: false,
        skills: (auth.user.skills as string | null) ?? '',
        location: (auth.user.location as string | null) ?? '',
        website: (auth.user.website as string | null) ?? '',
    });
    const currentAvatar =
        typeof auth.user.avatar === 'string' ? auth.user.avatar : null;
    const previewUrl = form.data.remove_profile_picture
        ? null
        : (localPreviewUrl ?? currentAvatar);

    useEffect(() => {
        return () => {
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
        };
    }, [localPreviewUrl]);

    const handleProfilePictureChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;

        form.setData('profile_picture', file);
        form.setData('remove_profile_picture', false);

        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
        }

        setLocalPreviewUrl(file ? URL.createObjectURL(file) : null);
    };

    const clearProfilePicture = () => {
        form.setData('profile_picture', null);
        form.setData('remove_profile_picture', true);

        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
        }

        setLocalPreviewUrl(null);
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(update.form().action, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setData('profile_picture', null);
                form.setData('remove_profile_picture', false);
                setLocalPreviewUrl(null);
            },
        });
    };

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile information"
                    description="Update your public account details and contact information"
                />

                <form onSubmit={submit} className="space-y-6">
                    {canManageExtendedProfile && (
                        <div className="rounded-2xl border border-border/70 bg-card/70 p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Avatar className="h-20 w-20 rounded-2xl border border-border/70">
                                    <AvatarImage
                                        src={previewUrl ?? undefined}
                                        alt={auth.user.name}
                                    />
                                    <AvatarFallback className="rounded-2xl bg-muted text-lg">
                                        {getInitials(
                                            form.data.name || auth.user.name,
                                        )}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="space-y-3">
                                    <div>
                                        <p className="font-medium">
                                            Profile picture
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Upload a square image for your buyer
                                            or seller profile.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Label
                                            htmlFor="profile_picture"
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <Camera className="size-4" />
                                            Choose image
                                        </Label>

                                        {previewUrl && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={clearProfilePicture}
                                            >
                                                <Trash2 className="size-4" />
                                                Remove image
                                            </Button>
                                        )}
                                    </div>

                                    <Input
                                        id="profile_picture"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleProfilePictureChange}
                                    />

                                    <InputError
                                        message={form.errors.profile_picture}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />
                            <InputError
                                className="mt-2"
                                message={form.errors.name}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />
                            <InputError
                                className="mt-2"
                                message={form.errors.email}
                            />
                        </div>
                    </div>

                    {mustVerifyEmail &&
                        auth.user.email_verified_at === null && (
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Your email address is unverified.{' '}
                                    <Link
                                        href={send()}
                                        as="button"
                                        className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                    >
                                        Click here to resend the verification
                                        email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to
                                        your email address.
                                    </div>
                                )}
                            </div>
                        )}

                    {canManageExtendedProfile && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="bio">Bio</Label>
                                <textarea
                                    id="bio"
                                    value={form.data.bio}
                                    onChange={(event) =>
                                        form.setData('bio', event.target.value)
                                    }
                                    rows={4}
                                    className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    placeholder="Introduce yourself, your services, and the kind of work you do."
                                />
                                <InputError
                                    className="mt-2"
                                    message={form.errors.bio}
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={form.data.phone}
                                        onChange={(event) =>
                                            form.setData(
                                                'phone',
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="tel"
                                        placeholder="+1 555 123 4567"
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={form.errors.phone}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        value={form.data.location}
                                        onChange={(event) =>
                                            form.setData(
                                                'location',
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="address-level2"
                                        placeholder="City, Country"
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={form.errors.location}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        type="url"
                                        value={form.data.website}
                                        onChange={(event) =>
                                            form.setData(
                                                'website',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://yourwebsite.com"
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={form.errors.website}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="skills">Skills</Label>
                                    <Input
                                        id="skills"
                                        value={form.data.skills}
                                        onChange={(event) =>
                                            form.setData(
                                                'skills',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Laravel, React, UI Design, Copywriting"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Separate your main skills with commas.
                                    </p>
                                    <InputError
                                        className="mt-2"
                                        message={form.errors.skills}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-4">
                        <Button
                            type="submit"
                            disabled={form.processing}
                            data-test="update-profile-button"
                        >
                            Save profile
                        </Button>
                    </div>
                </form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = (page: React.ReactNode) => (
    <SettingsLayout
        breadcrumbs={
            [
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Settings', href: '/settings/profile' },
                { title: 'Profile', href: '/settings/profile' },
            ] satisfies BreadcrumbItem[]
        }
    >
        {page}
    </SettingsLayout>
);
