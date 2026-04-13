import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    CircleDollarSign,
    Clock3,
    MessageSquare,
    Search,
    ShieldCheck,
    Star,
    Store,
    Wallet,
    Zap,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';

const features = [
    {
        icon: Search,
        title: 'Discover services',
        description:
            'Browse hundreds of gigs across categories. Filter by price, delivery time, and rating to find exactly what you need.',
    },
    {
        icon: ShieldCheck,
        title: 'Secure escrow payments',
        description:
            'Funds are held in escrow until you accept the delivery. Your money is protected at every step of the order.',
    },
    {
        icon: MessageSquare,
        title: 'Built-in messaging',
        description:
            'Chat directly with buyers or sellers, share files, and keep all project communication in one place.',
    },
    {
        icon: Zap,
        title: 'Fast delivery',
        description:
            'Sellers commit to delivery timelines upfront. Track progress and request revisions if the work needs adjustments.',
    },
    {
        icon: CircleDollarSign,
        title: 'Transparent pricing',
        description:
            'Every gig has clearly defined Basic, Standard, and Premium packages. No hidden fees — you see the total before you pay.',
    },
    {
        icon: Wallet,
        title: 'Seller payouts',
        description:
            'Sellers receive earnings directly to their wallet after order completion. Request withdrawals at any time.',
    },
];

const steps = [
    {
        number: '01',
        role: 'Buyer',
        title: 'Find a gig',
        description:
            'Search the catalog, compare packages, and place an order in minutes.',
    },
    {
        number: '02',
        role: 'Buyer',
        title: 'Pay securely',
        description:
            'Complete checkout via PayPal. Funds are held in escrow until you approve the work.',
    },
    {
        number: '03',
        role: 'Seller',
        title: 'Deliver the work',
        description:
            'Seller uploads the completed files and notes. You review and accept or request a revision.',
    },
    {
        number: '04',
        role: 'Both',
        title: 'Done',
        description:
            'Order completes, funds release to the seller, and you leave a review.',
    },
];

const stats = [
    { value: '3', label: 'Package tiers per gig', suffix: '' },
    { value: '100', label: 'Escrow protection', suffix: '%' },
    { value: '24/7', label: 'Dispute resolution', suffix: '' },
    { value: '0', label: 'Hidden fees', suffix: '' },
];

const categories = [
    'Design & Creative',
    'Web Development',
    'Copywriting',
    'Video & Animation',
    'Marketing',
    'Music & Audio',
    'Business',
    'Data & Analytics',
];

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="GigBridge — Freelance Marketplace">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-background text-foreground">
                {/* ── Nav ── */}
                <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
                                <AppLogoIcon className="size-5 text-background" />
                            </div>
                            <span className="text-base font-semibold tracking-tight">
                                GigBridge
                            </span>
                        </Link>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Button asChild size="sm">
                                    <Link href={dashboard()}>
                                        Go to dashboard
                                        <ArrowRight className="ml-1.5 size-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    {canRegister && (
                                        <Button asChild size="sm">
                                            <Link href={register()}>
                                                Get started
                                            </Link>
                                        </Button>
                                    )}
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* ── Hero ── */}
                <section className="relative overflow-hidden border-b border-border/60">
                    {/* Animated scrolling grid background */}
                    <div className="hero-grid pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]" />

                    <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
                        <div className="mx-auto max-w-3xl text-center">
                            <Badge
                                variant="secondary"
                                className="mb-6 px-4 py-1.5 text-sm"
                            >
                                Freelance marketplace for digital services
                            </Badge>

                            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                                Hire talent.
                                <br />
                                <span className="text-muted-foreground">
                                    Deliver great work.
                                </span>
                            </h1>

                            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                                GigBridge connects buyers with skilled sellers
                                across design, development, writing, and more —
                                with secure payments and built-in project tools.
                            </p>

                            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                {canRegister && !auth.user && (
                                    <Button
                                        asChild
                                        size="lg"
                                        className="h-12 px-8 text-base"
                                    >
                                        <Link href={register()}>
                                            Start for free
                                            <ArrowRight className="ml-2 size-5" />
                                        </Link>
                                    </Button>
                                )}
                                {auth.user ? (
                                    <Button
                                        asChild
                                        size="lg"
                                        className="h-12 px-8 text-base"
                                    >
                                        <Link href={dashboard()}>
                                            Go to dashboard
                                            <ArrowRight className="ml-2 size-5" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="lg"
                                        className="h-12 px-8 text-base"
                                    >
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stats row */}
                        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
                            {stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-2xl border border-border/70 bg-card p-5 text-center"
                                >
                                    <p className="text-3xl font-bold">
                                        {stat.value}
                                        <span className="text-xl">
                                            {stat.suffix}
                                        </span>
                                    </p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Categories ── */}
                <section className="border-b border-border/60 bg-muted/30 py-12">
                    <div className="mx-auto max-w-7xl px-6">
                        <p className="mb-5 text-center text-sm font-medium tracking-widest text-muted-foreground uppercase">
                            Popular categories
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {categories.map((cat) => (
                                <span
                                    key={cat}
                                    className="rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium transition hover:border-foreground/30 hover:bg-accent"
                                >
                                    {cat}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features ── */}
                <section className="border-b border-border/60 py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Everything you need to get work done
                            </h2>
                            <p className="mt-4 text-muted-foreground">
                                From discovery to delivery, GigBridge handles
                                the entire workflow so you can focus on the work
                                itself.
                            </p>
                        </div>

                        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="rounded-3xl border border-border/70 bg-card p-6"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
                                        <feature.icon className="size-5 text-foreground" />
                                    </div>
                                    <h3 className="mt-4 font-semibold">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── How it works ── */}
                <section className="border-b border-border/60 bg-muted/30 py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                How it works
                            </h2>
                            <p className="mt-4 text-muted-foreground">
                                Four steps from browsing to a completed order.
                            </p>
                        </div>

                        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((step, index) => (
                                <div key={step.number} className="relative">
                                    {/* connector line */}
                                    {index < steps.length - 1 && (
                                        <div className="absolute top-5 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] border-t border-dashed border-border/70 lg:block" />
                                    )}
                                    <div className="rounded-3xl border border-border/70 bg-card p-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-3xl font-bold text-muted-foreground/30">
                                                {step.number}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {step.role}
                                            </Badge>
                                        </div>
                                        <h3 className="mt-4 font-semibold">
                                            {step.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Roles split ── */}
                <section className="border-b border-border/60 py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Buyer card */}
                            <div className="rounded-3xl border border-border/70 bg-card p-8">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-950">
                                    <Search className="size-6 text-sky-600 dark:text-sky-400" />
                                </div>
                                <h3 className="mt-5 text-2xl font-bold">
                                    For buyers
                                </h3>
                                <p className="mt-3 text-muted-foreground">
                                    Find the right service, pay securely, and
                                    get exactly what you briefed — or your money
                                    back.
                                </p>
                                <ul className="mt-6 space-y-3 text-sm">
                                    {[
                                        'Browse and filter hundreds of gigs',
                                        'Compare Basic, Standard, and Premium packages',
                                        'Pay via PayPal with escrow protection',
                                        'Request revisions within package limits',
                                        'Leave reviews after completion',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2.5"
                                        >
                                            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                            <span className="text-muted-foreground">
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {canRegister && !auth.user && (
                                    <Button
                                        asChild
                                        className="mt-8 w-full"
                                        variant="outline"
                                    >
                                        <Link href={register()}>
                                            Sign up as buyer
                                        </Link>
                                    </Button>
                                )}
                            </div>

                            {/* Seller card */}
                            <div className="rounded-3xl border border-border/70 bg-card p-8">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950">
                                    <Store className="size-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="mt-5 text-2xl font-bold">
                                    For sellers
                                </h3>
                                <p className="mt-3 text-muted-foreground">
                                    List your services, set your own prices, and
                                    get paid reliably for every completed order.
                                </p>
                                <ul className="mt-6 space-y-3 text-sm">
                                    {[
                                        'Create gigs with up to 3 pricing tiers',
                                        'Manage orders from a dedicated dashboard',
                                        'Deliver files and notes directly in-app',
                                        'Earnings held in escrow, released on completion',
                                        'Request withdrawals to your PayPal',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2.5"
                                        >
                                            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                            <span className="text-muted-foreground">
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {canRegister && !auth.user && (
                                    <Button
                                        asChild
                                        className="mt-8 w-full"
                                        variant="outline"
                                    >
                                        <Link href={register()}>
                                            Sign up as seller
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Trust bar ── */}
                <section className="border-b border-border/60 bg-muted/30 py-16">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid gap-6 sm:grid-cols-3">
                            {[
                                {
                                    icon: ShieldCheck,
                                    title: 'Escrow protection',
                                    body: 'Buyer funds are held securely until the order is accepted. Cancellations trigger automatic refund flows.',
                                },
                                {
                                    icon: Star,
                                    title: 'Verified reviews',
                                    body: 'Only buyers who completed an order can leave a review. Ratings reflect real delivery outcomes.',
                                },
                                {
                                    icon: Clock3,
                                    title: 'Auto-release policy',
                                    body: 'If a buyer does not respond after delivery, funds auto-release to the seller after the configured window.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="flex gap-4 rounded-3xl border border-border/70 bg-card p-6"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                                        <item.icon className="size-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">
                                            {item.title}
                                        </p>
                                        <p className="mt-1.5 text-sm text-muted-foreground">
                                            {item.body}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                {!auth.user && (
                    <section className="py-24">
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="rounded-3xl border border-border/70 bg-card px-8 py-16 text-center sm:px-16">
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                    Ready to get started?
                                </h2>
                                <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                                    Join GigBridge as a buyer to find services,
                                    or as a seller to start earning. Free to
                                    sign up.
                                </p>
                                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                    {canRegister && (
                                        <Button
                                            asChild
                                            size="lg"
                                            className="h-12 px-8 text-base"
                                        >
                                            <Link href={register()}>
                                                Create free account
                                                <ArrowRight className="ml-2 size-5" />
                                            </Link>
                                        </Button>
                                    )}
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="lg"
                                        className="h-12 px-8 text-base"
                                    >
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Footer ── */}
                <footer className="border-t border-border/60 py-10">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
                                <AppLogoIcon className="size-4 text-background" />
                            </div>
                            <span className="text-sm font-semibold">
                                GigBridge
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} GigBridge. All rights
                            reserved.
                        </p>
                        <div className="flex gap-5 text-sm text-muted-foreground">
                            {!auth.user && (
                                <>
                                    <Link
                                        href={login()}
                                        className="hover:text-foreground"
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="hover:text-foreground"
                                        >
                                            Register
                                        </Link>
                                    )}
                                </>
                            )}
                            {auth.user && (
                                <Link
                                    href={dashboard()}
                                    className="hover:text-foreground"
                                >
                                    Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
