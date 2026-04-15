import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { brand_logo_url, brand_site_name } = usePage<{
        brand_logo_url?: string | null;
        brand_site_name?: string | null;
    }>().props;

    const displayName = brand_site_name || 'GigBridge';

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                {brand_logo_url ? (
                    <img src={brand_logo_url} alt={displayName} className="size-full object-contain" />
                ) : (
                    <AppLogoIcon className="size-5 text-white dark:text-black" />
                )}
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {displayName}
                </span>
            </div>
        </>
    );
}
