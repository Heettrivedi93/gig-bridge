<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalRequest;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminWithdrawalController extends Controller
{
    public function __construct(private readonly WalletService $wallets)
    {
    }

    public function index(): Response
    {
        $requests = WithdrawalRequest::query()
            ->with(['seller:id,name,email', 'reviewer:id,name', 'wallet:id,user_id,currency'])
            ->latest('created_at')
            ->get();

        return Inertia::render('admin/withdrawals/index', [
            'stats' => [
                [
                    'label' => 'Total Requests',
                    'value' => $requests->count(),
                    'detail' => sprintf('%d paid', $requests->where('status', 'paid')->count()),
                ],
                [
                    'label' => 'Pending Review',
                    'value' => $requests->where('status', 'pending')->count(),
                    'detail' => sprintf('%d approved', $requests->where('status', 'approved')->count()),
                ],
                [
                    'label' => 'Paid Out',
                    'value' => number_format($requests->where('status', 'paid')->sum(fn (WithdrawalRequest $item) => (float) $item->amount), 2, '.', ''),
                    'detail' => 'Completed seller payouts',
                ],
                [
                    'label' => 'Rejected',
                    'value' => $requests->where('status', 'rejected')->count(),
                    'detail' => 'Returned to seller available balance',
                ],
            ],
            'requests' => $requests->map(fn (WithdrawalRequest $withdrawal) => [
                'id' => $withdrawal->id,
                'amount' => (string) $withdrawal->amount,
                'status' => $withdrawal->status,
                'method' => $withdrawal->method,
                'details' => $withdrawal->details,
                'note' => $withdrawal->note,
                'created_at' => $withdrawal->created_at?->toIso8601String(),
                'reviewed_at' => $withdrawal->reviewed_at?->toIso8601String(),
                'seller' => $withdrawal->seller ? [
                    'name' => $withdrawal->seller->name,
                    'email' => $withdrawal->seller->email,
                ] : null,
                'reviewer' => $withdrawal->reviewer ? [
                    'name' => $withdrawal->reviewer->name,
                ] : null,
                'wallet_currency' => $withdrawal->wallet?->currency ?? 'USD',
            ])->values(),
            'statusOptions' => ['pending', 'approved', 'rejected', 'paid'],
        ]);
    }

    public function update(Request $request, WithdrawalRequest $withdrawal): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected', 'paid'])],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $withdrawal, $data) {
            /** @var WithdrawalRequest $locked */
            $locked = WithdrawalRequest::query()
                ->with('wallet')
                ->lockForUpdate()
                ->findOrFail($withdrawal->id);

            if ($locked->status === 'paid' || $locked->status === 'rejected') {
                return;
            }

            if ($data['status'] === 'approved') {
                $locked->update([
                    'status' => 'approved',
                    'note' => $data['note'] ?: $locked->note,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

                return;
            }

            if ($data['status'] === 'rejected') {
                $wallet = $locked->wallet;
                $amount = (float) $locked->amount;

                $wallet = $this->wallets->debitPending(
                    $wallet,
                    $amount,
                    'withdrawal_rejected',
                    null,
                    ['withdrawal_request_id' => $locked->id],
                    sprintf('Withdrawal request #%d rejected', $locked->id),
                );

                $this->wallets->creditAvailable(
                    $wallet,
                    $amount,
                    'withdrawal_rejected',
                    null,
                    ['withdrawal_request_id' => $locked->id],
                    sprintf('Rejected withdrawal returned for request #%d', $locked->id),
                );

                $locked->update([
                    'status' => 'rejected',
                    'note' => $data['note'] ?: $locked->note,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

                return;
            }

            $this->wallets->debitPending(
                $locked->wallet,
                (float) $locked->amount,
                'withdrawal_approved',
                null,
                ['withdrawal_request_id' => $locked->id],
                sprintf('Withdrawal paid for request #%d', $locked->id),
            );

            $locked->update([
                'status' => 'paid',
                'note' => $data['note'] ?: $locked->note,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        });

        return back()->with('success', sprintf('Withdrawal request #%d updated.', $withdrawal->id));
    }
}
