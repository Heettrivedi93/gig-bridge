import { Head } from '@inertiajs/react';
import { CheckCircle2, Clock3, MessageSquareText, Wallet } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';

export default function Dashboard() {
    const cards = [
        { label: 'Open Orders', value: '4', icon: Clock3 },
        { label: 'Completed Orders', value: '27', icon: CheckCircle2 },
        { label: 'Unread Messages', value: '9', icon: MessageSquareText },
        { label: 'Available Balance', value: '$480.00', icon: Wallet },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Dashboard"
                    description="Welcome back. Here is your current account overview."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">{item.label}</p>
                                <item.icon className="size-4 text-muted-foreground" />
                            </div>
                            <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">This Week</h3>
                            <Badge variant="outline">Preview</Badge>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="rounded-md border border-border/70 px-3 py-2">2 new orders received</li>
                            <li className="rounded-md border border-border/70 px-3 py-2">1 delivery submitted</li>
                            <li className="rounded-md border border-border/70 px-3 py-2">3 client messages pending</li>
                        </ul>
                    </section>

                    <section className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 font-semibold">Completion Progress</h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Orders</span>
                                    <span>72%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-[72%] rounded-full bg-sky-500" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Profile</span>
                                    <span>90%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-[90%] rounded-full bg-emerald-500" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
