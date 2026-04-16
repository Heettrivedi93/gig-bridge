import { Head } from '@inertiajs/react';
import {
    CreditCard,
    Download,
    FileText,
    ReceiptText,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

type Payment = {
    id: number;
    invoice_number: string;
    provider: string;
    provider_order_id: string;
    provider_capture_id: string | null;
    amount: string;
    currency: string;
    status: string;
    created_at: string | null;
    captured_at: string | null;
    plan: {
        name: string;
        duration_days: number;
        gig_limit: number;
    } | null;
    subscription: {
        starts_at: string | null;
        ends_at: string | null;
        status: string;
    } | null;
};

type Props = {
    payments: Payment[];
    seller: {
        name: string;
        email: string;
    };
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

function formatMoney(currency: string, amount: string) {
    return `${currency} ${amount}`;
}

export default function SellerPaymentsIndex({ payments, seller }: Props) {
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(
        null,
    );

    const completedPayments = useMemo(
        () => payments.filter((payment) => payment.status === 'completed'),
        [payments],
    );
    const totalSpent = useMemo(
        () =>
            completedPayments.reduce(
                (sum, payment) => sum + Number(payment.amount),
                0,
            ),
        [completedPayments],
    );

    return (
        <>
            <Head title="Payment History" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Payment History"
                    description="Review your seller plan purchases and open invoice details any time."
                />

                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ReceiptText className="size-4" />
                            Total payments
                        </div>
                        <p className="mt-3 text-2xl font-semibold">
                            {payments.length}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Includes pending and completed seller subscription
                            transactions.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck className="size-4" />
                            Completed
                        </div>
                        <p className="mt-3 text-2xl font-semibold">
                            {completedPayments.length}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Successfully captured plan purchases.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="size-4" />
                            Total spent
                        </div>
                        <p className="mt-3 text-2xl font-semibold">
                            {payments[0]
                                ? formatMoney(
                                      payments[0].currency,
                                      totalSpent.toFixed(2),
                                  )
                                : 'USD 0.00'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Based on completed seller subscription purchases.
                        </p>
                    </div>
                </div>

                <section className="rounded-3xl border border-border/70 bg-card">
                    <div className="border-b border-border/70 px-6 py-4">
                        <h2 className="text-lg font-semibold">Invoices</h2>
                        <p className="text-sm text-muted-foreground">
                            Open any record to see the invoice details for that
                            payment.
                        </p>
                    </div>

                    {payments.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                            No payment history yet. Once you buy a plan, the
                            invoice will appear here.
                        </div>
                    ) : (
                        <div className="divide-y divide-border/70">
                            {payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <p className="font-medium">
                                                {payment.invoice_number}
                                            </p>
                                            <Badge variant="outline">
                                                {payment.provider}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    payment.status ===
                                                    'completed'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {payment.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {payment.plan?.name ?? 'Plan'} •{' '}
                                            {formatMoney(
                                                payment.currency,
                                                payment.amount,
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Paid at{' '}
                                            {formatDate(
                                                payment.captured_at ??
                                                    payment.created_at,
                                            )}
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setSelectedPayment(payment)
                                        }
                                    >
                                        <FileText className="mr-2 size-4" />
                                        View invoice
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Dialog
                open={Boolean(selectedPayment)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedPayment(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Invoice</DialogTitle>
                        <DialogDescription>
                            Subscription payment details for your seller plan
                            purchase.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPayment && (
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-border/70 bg-card p-6">
                                <div className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
                                            Invoice
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold">
                                            {selectedPayment.invoice_number}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Issued on{' '}
                                            {formatDate(
                                                selectedPayment.captured_at ??
                                                    selectedPayment.created_at,
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            {selectedPayment.provider}
                                        </Badge>
                                        <Badge
                                            variant={
                                                selectedPayment.status ===
                                                'completed'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {selectedPayment.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid gap-6 py-5 lg:grid-cols-2">
                                    <div>
                                        <p className="text-sm font-medium">
                                            Billed to
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {seller.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {seller.email}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium">
                                            Payment reference
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Order ID:{' '}
                                            {selectedPayment.provider_order_id}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Capture ID:{' '}
                                            {selectedPayment.provider_capture_id ??
                                                'Pending'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Plan</span>
                                        <span className="font-medium">
                                            {selectedPayment.plan?.name ??
                                                'Seller plan'}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <span>Duration</span>
                                        <span className="font-medium">
                                            {selectedPayment.plan
                                                ?.duration_days ?? 0}{' '}
                                            days
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <span>Gig limit</span>
                                        <span className="font-medium">
                                            {selectedPayment.plan?.gig_limit ??
                                                0}{' '}
                                            active gigs
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <span>Subscription period</span>
                                        <span className="text-right font-medium">
                                            {formatDate(
                                                selectedPayment.subscription
                                                    ?.starts_at ?? null,
                                            )}
                                            {' - '}
                                            {formatDate(
                                                selectedPayment.subscription
                                                    ?.ends_at ?? null,
                                            )}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-base font-semibold">
                                        <span>Total</span>
                                        <span>
                                            {formatMoney(
                                                selectedPayment.currency,
                                                selectedPayment.amount,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button asChild variant="outline">
                                    <a
                                        href={`/seller/payments/${selectedPayment.id}/invoice.pdf`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Download className="mr-2 size-4" />
                                        Download PDF
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

SellerPaymentsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Payment History',
            href: '/seller/payments',
        },
    ] satisfies BreadcrumbItem[],
};
