import { Head, router } from '@inertiajs/react';
import { Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { BreadcrumbItem } from '@/types';

type Plan = {
    id: number;
    name: string;
    price: string;
    duration_days: number;
    gig_limit: number;
    features: string[];
    status: 'active' | 'inactive';
    is_current: boolean;
    is_upcoming: boolean;
};

type CurrentSubscription = {
    id: number;
    plan_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
    gig_limit: number;
} | null;

type NextSubscription = {
    id: number;
    plan_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
    gig_limit: number;
} | null;

type PaypalConfig = {
    mode: 'sandbox' | 'live';
    client_id: string;
    currency: string;
    enabled: boolean;
    message: string | null;
};

type Props = {
    plans: Plan[];
    currentSubscription: CurrentSubscription;
    nextSubscription: NextSubscription;
    planActivation: {
        active_gig_count: number;
        can_activate_next_now: boolean;
    };
    paypal: PaypalConfig;
};

type PaypalButtonsProps = {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID?: string }) => Promise<void>;
    onError: (error: Error) => void;
};

declare global {
    interface Window {
        paypal?: {
            Buttons: (props: PaypalButtonsProps) => {
                render: (selector: string | HTMLElement) => Promise<void>;
                close?: () => Promise<void>;
            };
        };
    }
}

const PAYPAL_SCRIPT_ID = 'paypal-js-sdk';

function formatDisplayDate(value: string | null) {
    if (!value) {
        return 'No active subscription';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

function getCsrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.content;
}

async function requestJson<T>(
    url: string,
    body?: Record<string, unknown>,
): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(getCsrfToken() ? { 'X-CSRF-TOKEN': getCsrfToken()! } : {}),
        },
        body: JSON.stringify(body ?? {}),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = payload?.errors
            ? Object.values(payload.errors).flat().join(' ')
            : payload?.message || 'Request failed.';

        throw new Error(message);
    }

    return payload as T;
}

export default function SellerPlansIndex({
    plans,
    currentSubscription,
    nextSubscription,
    planActivation,
    paypal,
}: Props) {
    const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
    const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isLoadingButtons, setIsLoadingButtons] = useState(false);
    const paypalContainerRef = useRef<HTMLDivElement | null>(null);
    const [paypalContainerElement, setPaypalContainerElement] =
        useState<HTMLDivElement | null>(null);

    const sortedPlans = useMemo(
        () => [...plans].sort((a, b) => Number(a.price) - Number(b.price)),
        [plans],
    );

    const subscriptionEndText = formatDisplayDate(
        currentSubscription?.ends_at ?? null,
    );
    const nextSubscriptionStartsText = formatDisplayDate(
        nextSubscription?.starts_at ?? null,
    );
    const nextSubscriptionEndsText = formatDisplayDate(
        nextSubscription?.ends_at ?? null,
    );

    useEffect(() => {
        if (
            !checkoutPlan ||
            Number(checkoutPlan.price) <= 0 ||
            !paypal.enabled
        ) {
            return;
        }

        let cancelled = false;
        const paypalContainer = paypalContainerRef.current;

        if (!paypalContainer) {
            return;
        }

        paypalContainer.innerHTML = '';

        const loadScript = async () => {
            if (window.paypal) {
                return;
            }

            const existingScript = document.getElementById(
                PAYPAL_SCRIPT_ID,
            ) as HTMLScriptElement | null;

            if (existingScript) {
                await new Promise<void>((resolve, reject) => {
                    if (window.paypal) {
                        resolve();

                        return;
                    }

                    existingScript.addEventListener('load', () => resolve(), {
                        once: true,
                    });
                    existingScript.addEventListener(
                        'error',
                        () => reject(new Error('Unable to load PayPal SDK.')),
                        { once: true },
                    );
                });

                return;
            }

            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.id = PAYPAL_SCRIPT_ID;
                script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
                    paypal.client_id,
                )}&currency=${encodeURIComponent(paypal.currency)}&intent=capture`;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () =>
                    reject(new Error('Unable to load PayPal SDK.'));
                document.head.appendChild(script);
            });
        };

        requestJson<{ id: string }>(
            `/seller/plans/${checkoutPlan.id}/paypal/order`,
        )
            .then(async (order) => {
                if (cancelled) {
                    return;
                }

                setCheckoutOrderId(order.id);

                await loadScript();

                if (cancelled || !window.paypal || !paypalContainer) {
                    return;
                }

                const buttons = window.paypal.Buttons({
                    createOrder: async () => order.id,
                    onApprove: async (data) => {
                        if (!data.orderID) {
                            throw new Error(
                                'PayPal did not return an order ID.',
                            );
                        }

                        try {
                            await requestJson(
                                `/seller/plans/${checkoutPlan.id}/paypal/capture`,
                                { order_id: data.orderID },
                            );
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : 'PayPal capture failed.';

                            setCheckoutError(message);

                            throw error;
                        }

                        setCheckoutPlan(null);
                        setCheckoutOrderId(null);
                        router.reload({
                            only: [
                                'plans',
                                'currentSubscription',
                                'nextSubscription',
                            ],
                        });
                    },
                    onError: (error) => {
                        setCheckoutError(
                            error.message ||
                                'PayPal checkout failed unexpectedly.',
                        );
                    },
                });

                await buttons.render(paypalContainer);
            })
            .catch((error: Error) => {
                if (!cancelled) {
                    setCheckoutOrderId(null);
                    setCheckoutError(error.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingButtons(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        checkoutPlan,
        paypal.client_id,
        paypal.currency,
        paypal.enabled,
        paypalContainerElement,
    ]);

    const handlePaypalContainerRef = useCallback(
        (node: HTMLDivElement | null) => {
            paypalContainerRef.current = node;
            setPaypalContainerElement(node);
        },
        [],
    );

    const openCheckout = (plan: Plan) => {
        setCheckoutOrderId(null);
        setCheckoutError(null);
        setIsLoadingButtons(true);
        setCheckoutPlan(plan);
    };

    const activateNextPlanNow = () => {
        router.post('/seller/plans/activate-next', undefined, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Plans" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Heading
                        title="Plans"
                        description="Upgrade your seller account, expand gig limits, and purchase plans with PayPal."
                    />

                    <div className="rounded-full border border-border/70 bg-card px-4 py-2 text-sm text-muted-foreground">
                        PayPal mode:{' '}
                        <span className="font-medium text-foreground">
                            {paypal.mode}
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck className="size-4" />
                            Current subscription
                        </div>
                        <p className="mt-3 text-2xl font-semibold">
                            {currentSubscription?.plan_name ?? 'No active plan'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Active until {subscriptionEndText}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Sparkles className="size-4" />
                            Next subscription
                        </div>
                        <p className="mt-3 text-2xl font-semibold">
                            {nextSubscription?.plan_name ?? 'Nothing queued'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {nextSubscription
                                ? `Starts on ${nextSubscriptionStartsText} and runs until ${nextSubscriptionEndsText}`
                                : 'If you buy another plan during an active cycle, it will queue here.'}
                        </p>
                        {nextSubscription && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Current usage: {planActivation.active_gig_count}
                                /{currentSubscription?.gig_limit ?? 0} gigs
                            </p>
                        )}
                        {planActivation.can_activate_next_now &&
                            nextSubscription && (
                                <div className="mt-4">
                                    <Button
                                        size="sm"
                                        onClick={activateNextPlanNow}
                                    >
                                        Activate now
                                    </Button>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Available because your current gig limit
                                        is fully used and the queued plan
                                        increases capacity.
                                    </p>
                                </div>
                            )}
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="size-4" />
                            Payment gateway
                        </div>
                        <p className="mt-3 text-2xl font-semibold">
                            {paypal.enabled ? 'Ready' : 'Needs admin update'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {paypal.message ??
                                `Charged in ${paypal.currency} through PayPal testing checkout while in sandbox mode.`}
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                    {sortedPlans.map((plan) => {
                        const isFree = Number(plan.price) <= 0;

                        return (
                            <section
                                key={plan.id}
                                className={`rounded-3xl border p-6 ${
                                    plan.is_current
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border/70 bg-card'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm tracking-[0.22em] text-muted-foreground uppercase">
                                            {plan.name}
                                        </p>
                                        <p className="mt-3 text-4xl font-semibold">
                                            {isFree ? 'Free' : `$${plan.price}`}
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {plan.duration_days} days,{' '}
                                            {plan.gig_limit} gigs
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        {plan.is_current && (
                                            <Badge>Current</Badge>
                                        )}
                                        {plan.is_upcoming && (
                                            <Badge variant="outline">
                                                Queued
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {(plan.features.length > 0
                                        ? plan.features
                                        : ['Base seller access']
                                    ).map((feature) => (
                                        <div
                                            key={feature}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <Check className="mt-0.5 size-4 text-emerald-600" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    {plan.is_current ? (
                                        <Button disabled className="w-full">
                                            Current plan
                                        </Button>
                                    ) : plan.is_upcoming ? (
                                        <Button
                                            disabled
                                            variant="outline"
                                            className="w-full"
                                        >
                                            Queued next plan
                                        </Button>
                                    ) : isFree ? (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled
                                        >
                                            Auto fallback plan
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => openCheckout(plan)}
                                            disabled={!paypal.enabled}
                                        >
                                            Buy with PayPal
                                        </Button>
                                    )}

                                    {isFree && (
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            This plan is applied automatically
                                            only when no other seller plan is
                                            active.
                                        </p>
                                    )}
                                    {!isFree &&
                                        !plan.is_current &&
                                        !plan.is_upcoming &&
                                        currentSubscription && (
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                Buying this plan now will queue
                                                it for activation after your
                                                current plan expires on{' '}
                                                {subscriptionEndText}.
                                            </p>
                                        )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            <Dialog
                open={Boolean(checkoutPlan)}
                onOpenChange={(open) => {
                    if (!open) {
                        setCheckoutOrderId(null);
                        setCheckoutError(null);
                        setIsLoadingButtons(false);
                        setCheckoutPlan(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {checkoutPlan
                                ? `Checkout ${checkoutPlan.name}`
                                : 'Checkout'}
                        </DialogTitle>
                        <DialogDescription>
                            Complete the PayPal payment to activate this seller
                            plan.
                        </DialogDescription>
                    </DialogHeader>

                    {checkoutPlan && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Plan</span>
                                    <span className="font-medium">
                                        {checkoutPlan.name}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Price</span>
                                    <span className="font-medium">
                                        {paypal.currency} {checkoutPlan.price}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Duration</span>
                                    <span className="font-medium">
                                        {checkoutPlan.duration_days} days
                                    </span>
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                    {checkoutError}
                                </div>
                            )}

                            {!paypal.enabled &&
                                paypal.message &&
                                !checkoutError && (
                                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                        {paypal.message}
                                    </div>
                                )}

                            {isLoadingButtons && (
                                <p className="text-sm text-muted-foreground">
                                    Loading PayPal checkout…
                                </p>
                            )}

                            {!isLoadingButtons && checkoutOrderId && (
                                <p className="text-xs text-muted-foreground">
                                    PayPal order ready: {checkoutOrderId}
                                </p>
                            )}

                            <div ref={handlePaypalContainerRef} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

SellerPlansIndex.layout = {
    breadcrumbs: [
        {
            title: 'Plans',
            href: '/seller/plans',
        },
    ] satisfies BreadcrumbItem[],
};
