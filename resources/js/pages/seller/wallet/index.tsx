import { Head, useForm } from '@inertiajs/react';
import { Wallet2 } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import EmptyState from '@/components/empty-state';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BreadcrumbItem } from '@/types';

type Props = {
    seller: {
        name: string;
        email: string;
    };
    wallet: {
        available_balance: string;
        pending_balance: string;
        escrow_balance: string;
        currency: string;
    };
    revenue: {
        gross_sales: string;
        total_refunds: string;
        net_sales: string;
        platform_fees: string;
        net_revenue: string;
        pending_release: string;
    };
    withdrawals: {
        id: number;
        amount: string;
        status: string;
        method: string | null;
        note: string | null;
        created_at: string | null;
        reviewed_at: string | null;
    }[];
};

type WithdrawalForm = {
    amount: string;
    method: string;
    details: string;
};

function formatDate(value: string | null) {
    if (!value) {
        return 'Pending';
    }

    return new Date(value).toLocaleString();
}

export default function SellerWalletIndex({
    seller,
    wallet,
    revenue,
    withdrawals,
}: Props) {
    const [showWithdrawal, setShowWithdrawal] = useState(false);
    const withdrawalForm = useForm<WithdrawalForm>({
        amount: '',
        method: 'PayPal',
        details: '',
    });

    const submitWithdrawal = (event: React.FormEvent) => {
        event.preventDefault();

        withdrawalForm.post('/seller/withdrawals', {
            preserveScroll: true,
            onSuccess: () => {
                setShowWithdrawal(false);
                withdrawalForm.reset();
                withdrawalForm.setData('method', 'PayPal');
            },
        });
    };

    return (
        <>
            <Head title="Wallet" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Heading
                    title="Wallet"
                    description={`Track released earnings and payout requests for ${seller.name}.`}
                />

                <section className="rounded-3xl border border-border/70 bg-card">
                    <div className="flex flex-col gap-4 border-b border-border/70 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Seller Wallet
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Funds released from completed orders appear here
                                and can be moved into withdrawal requests.
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowWithdrawal(true)}
                            disabled={Number(wallet.available_balance) <= 0}
                        >
                            <Wallet2 className="mr-2 size-4" />
                            Request Withdrawal
                        </Button>
                    </div>

                    <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                                Available balance
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {wallet.currency} {wallet.available_balance}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Ready to request for payout.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                                Pending withdrawals
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {wallet.currency} {wallet.pending_balance}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Held while the admin reviews or transfers funds.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                                Escrow bucket
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {wallet.currency} {wallet.escrow_balance}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Reserved for future seller-side fund states.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-border/70 bg-card">
                    <div className="border-b border-border/70 px-6 py-4">
                        <h2 className="text-lg font-semibold">Revenue</h2>
                        <p className="text-sm text-muted-foreground">
                            Revenue generated from your own sold services after
                            platform commission.
                        </p>
                    </div>

                    <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">Gross sales</p>
                            <p className="mt-2 text-2xl font-semibold">{wallet.currency} {revenue.gross_sales}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Total paid order value before any refunds.</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">Total refunds</p>
                            <p className="mt-2 text-2xl font-semibold text-amber-600">−{wallet.currency} {revenue.total_refunds}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Returned to buyers via disputes or cancellations.</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">Net sales</p>
                            <p className="mt-2 text-2xl font-semibold">{wallet.currency} {revenue.net_sales}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Gross sales minus refunds.</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">Platform fees</p>
                            <p className="mt-2 text-2xl font-semibold">{wallet.currency} {revenue.platform_fees}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Marketplace commission on net sales.</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">Net revenue</p>
                            <p className="mt-2 text-2xl font-semibold">{wallet.currency} {revenue.net_revenue}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Your earnings after commission.</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">Pending release</p>
                            <p className="mt-2 text-2xl font-semibold">{wallet.currency} {revenue.pending_release}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Paid orders still waiting to move into your wallet.</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-border/70 bg-card">
                    <div className="border-b border-border/70 px-6 py-4">
                        <h2 className="text-lg font-semibold">
                            Withdrawal Requests
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Review every payout request and its admin status in
                            one place.
                        </p>
                    </div>

                    {withdrawals.length === 0 ? (
                        <EmptyState
                            icon={Wallet2}
                            title="No withdrawal requests yet"
                            description="Once you have available balance, request a payout and it will appear here."
                        />
                    ) : (
                        <div className="divide-y divide-border/70">
                            {withdrawals.map((withdrawal) => (
                                <div
                                    key={withdrawal.id}
                                    className="flex flex-col gap-2 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {wallet.currency}{' '}
                                            {withdrawal.amount}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {withdrawal.method ??
                                                'Method pending'}{' '}
                                            • Requested{' '}
                                            {formatDate(withdrawal.created_at)}
                                        </p>
                                        {withdrawal.note && (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {withdrawal.note}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={
                                                withdrawal.status ===
                                                    'approved' ||
                                                withdrawal.status === 'paid'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {withdrawal.status}
                                        </Badge>
                                        {withdrawal.reviewed_at && (
                                            <span className="text-xs text-muted-foreground">
                                                Reviewed{' '}
                                                {formatDate(
                                                    withdrawal.reviewed_at,
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Request Withdrawal</DialogTitle>
                        <DialogDescription>
                            Move available wallet balance into a pending payout
                            request for admin review.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitWithdrawal} className="space-y-4">
                        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
                            <p className="text-muted-foreground">
                                Available balance
                            </p>
                            <p className="mt-2 text-lg font-semibold">
                                {wallet.currency} {wallet.available_balance}
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="withdrawal-amount">Amount</Label>
                            <Input
                                id="withdrawal-amount"
                                type="number"
                                min="1"
                                step="0.01"
                                value={withdrawalForm.data.amount}
                                onChange={(e) =>
                                    withdrawalForm.setData(
                                        'amount',
                                        e.target.value,
                                    )
                                }
                                placeholder="100.00"
                                required
                            />
                            <InputError
                                message={withdrawalForm.errors.amount}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="withdrawal-method">Method</Label>
                            <Input
                                id="withdrawal-method"
                                value={withdrawalForm.data.method}
                                onChange={(e) =>
                                    withdrawalForm.setData(
                                        'method',
                                        e.target.value,
                                    )
                                }
                                placeholder="PayPal, Bank Transfer, etc."
                                required
                            />
                            <InputError
                                message={withdrawalForm.errors.method}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="withdrawal-details">Details</Label>
                            <textarea
                                id="withdrawal-details"
                                rows={4}
                                value={withdrawalForm.data.details}
                                onChange={(e) =>
                                    withdrawalForm.setData(
                                        'details',
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Add payout email, bank reference, or any note for the admin."
                            />
                            <InputError
                                message={withdrawalForm.errors.details}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowWithdrawal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={withdrawalForm.processing}
                            >
                                {withdrawalForm.processing
                                    ? 'Submitting…'
                                    : 'Submit request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

SellerWalletIndex.layout = {
    breadcrumbs: [
        {
            title: 'Wallet',
            href: '/seller/wallet',
        },
    ] satisfies BreadcrumbItem[],
};
