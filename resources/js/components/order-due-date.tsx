import { AlertTriangle, Clock3 } from 'lucide-react';

type Props = {
    dueAt: string | null;
    status: string;
};

function diffFromNow(isoDate: string): { days: number; hours: number; overdue: boolean } {
    const diff = new Date(isoDate).getTime() - Date.now();
    const overdue = diff < 0;
    const abs = Math.abs(diff);
    const days = Math.floor(abs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours, overdue };
}

export default function OrderDueDate({ dueAt, status }: Props) {
    // Only show for active orders with a due date
    if (!dueAt || status !== 'active') return null;

    const { days, hours, overdue } = diffFromNow(dueAt);

    if (overdue) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                <AlertTriangle className="size-3" />
                Overdue by {days > 0 ? `${days}d ` : ''}{hours}h
            </span>
        );
    }

    const urgent = days === 0;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                urgent
                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'border-border/70 bg-muted/30 text-muted-foreground'
            }`}
        >
            <Clock3 className="size-3" />
            {days > 0 ? `${days}d ${hours}h left` : `${hours}h left`}
        </span>
    );
}
