import { Award, CheckCircle2, Circle, Gem, ShieldCheck, Trophy } from 'lucide-react';
import SellerLevelBadge from '@/components/seller-level-badge';
import type { SellerLevelBadgeData } from '@/components/seller-level-badge';

type Requirement = {
    key: string;
    label: string;
    current: number | null;
    target: number;
    unit: string;
    lower_is_better: boolean;
    met: boolean;
    progress: number;
};

type SellerProgressData = {
    current_level: string | null;
    next_level: string | null;
    next_label: string | null;
    is_top: boolean;
    requirements: Requirement[];
    blocking: string | null;
};

type Props = {
    progress: SellerProgressData;
    level: SellerLevelBadgeData;
};

const levelIcons = {
    level_1: ShieldCheck,
    level_2: Gem,
    top_rated: Award,
};

function formatValue(req: Requirement): string {
    if (req.current === null) return 'N/A';
    if (req.unit === '%') return `${req.current.toFixed(1)}%`;
    if (req.unit === '/ 5') return req.current.toFixed(1);
    if (req.unit === 'h') return `${req.current.toFixed(1)}h`;
    return String(req.current);
}

function formatTarget(req: Requirement): string {
    if (req.unit === '%') return `${req.target}%`;
    if (req.unit === '/ 5') return `${req.target} / 5`;
    if (req.unit === 'h') return `< ${req.target}h`;
    return String(req.target);
}

export default function SellerRankingProgress({ progress, level }: Props) {
    if (progress.is_top) {
        return (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40">
                        <Trophy className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="font-semibold">Top Rated Seller</p>
                        <p className="text-sm text-muted-foreground">
                            You've reached the highest seller level. Keep maintaining your quality!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const NextIcon = progress.next_level
        ? (levelIcons[progress.next_level as keyof typeof levelIcons] ?? Award)
        : Award;

    return (
        <div className="rounded-3xl border border-border/70 bg-card p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-semibold">Ranking Progress</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track what you need to reach the next level
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {level ? (
                        <SellerLevelBadge level={level} />
                    ) : (
                        <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                            New Seller
                        </span>
                    )}
                </div>
            </div>

            {/* Next level target */}
            {progress.next_label && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                    <NextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm">
                        <span className="text-muted-foreground">Next level: </span>
                        <span className="font-semibold">{progress.next_label}</span>
                    </p>
                </div>
            )}

            {/* Requirements */}
            <div className="mt-4 space-y-3">
                {progress.requirements.map((req) => (
                    <div key={req.key}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                {req.met ? (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                ) : (
                                    <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                                )}
                                <span className={req.met ? 'text-muted-foreground' : 'font-medium'}>
                                    {req.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className={req.met ? 'text-emerald-600 font-medium' : 'font-semibold'}>
                                    {formatValue(req)}
                                </span>
                                <span className="text-muted-foreground">/ {formatTarget(req)}</span>
                            </div>
                        </div>

                        {/* Progress bar — only show if not met */}
                        {!req.met && (
                            <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary/70 transition-all duration-700"
                                    style={{ width: `${req.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Blocking message */}
            {progress.blocking && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    {progress.blocking}
                </div>
            )}

            {/* All met — ready for promotion */}
            {!progress.blocking && progress.requirements.length > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    All requirements met! You qualify for {progress.next_label}.
                </div>
            )}
        </div>
    );
}
