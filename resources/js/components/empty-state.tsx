import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
};

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/70 bg-card px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                <Icon className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {action && (
                <Button onClick={action.onClick} className="mt-1">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
