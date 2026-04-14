import { Award, Gem, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type SellerLevelBadgeData = {
    value: 'level_1' | 'level_2' | 'top_rated';
    label: string;
    tone: 'level_1' | 'level_2' | 'top_rated';
} | null;

const sellerLevelStyles = {
    level_1:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
    level_2:
        'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200',
    top_rated:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
} as const;

const sellerLevelIcons = {
    level_1: ShieldCheck,
    level_2: Gem,
    top_rated: Award,
} as const;

export default function SellerLevelBadge({
    level,
    className = '',
}: {
    level: SellerLevelBadgeData;
    className?: string;
}) {
    if (!level) {
        return null;
    }

    const Icon = sellerLevelIcons[level.tone];

    return (
        <Badge
            variant="outline"
            className={`${sellerLevelStyles[level.tone]} ${className}`.trim()}
        >
            <Icon className="mr-1 size-3.5" />
            {level.label}
        </Badge>
    );
}
