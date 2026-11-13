<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Payments\LocalPayments;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Rupee payments for Pro. Bank transfers wait here for an admin to check the account and approve
 * them; gateway payments can also be approved or rejected by hand when a gateway reply went missing.
 */
class PaymentController extends Controller
{
    protected const PER_PAGE = 25;

    public function index(Request $request, LocalPayments $payments): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'channel' => ['nullable', Rule::enum(PaymentChannel::class)],
        ]);

        $list = Payment::query()
            ->with('user:id,name,email', 'reviewer:id,name')
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->where('reference', 'like', "%{$search}%")
                    ->orWhere('payer_reference', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $query) => $query->where('email', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%")),
            ))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['channel'] ?? null, fn (Builder $query, string $channel) => $query->where('channel', $channel))
            ->latest()
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Payment $payment): array => [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'user' => $payment->user === null ? null : ['id' => $payment->user->id, 'name' => $payment->user->name, 'email' => $payment->user->email],
                'channel' => $payment->channel->value,
                'channel_label' => $payment->channel->label(),
                'interval' => $payment->interval,
                'amount_label' => LocalPayments::formatAmount($payment->amount),
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'payer_reference' => $payment->payer_reference,
                'gateway_transaction_id' => $payment->gateway_transaction_id,
                'has_proof' => $payment->proof_path !== null,
                'admin_note' => $payment->admin_note,
                'reviewer' => $payment->reviewer?->name,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'created_at' => $payment->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Payments/Index', [
            'payments' => $list,
            'filters' => $filters,
            'awaitingReview' => Payment::query()->where('status', PaymentStatus::AwaitingReview)->count(),
            'channels' => collect(PaymentChannel::cases())->map(fn (PaymentChannel $channel): array => [
                'value' => $channel->value,
                'label' => $channel->label(),
                'available' => $payments->isAvailable($channel),
            ]),
            'statuses' => collect(PaymentStatus::cases())->map(fn (PaymentStatus $status): array => ['value' => $status->value, 'label' => $status->label()]),
            'seo' => ['title' => 'Payments'],
        ]);
    }

    public function approve(Request $request, Payment $payment, LocalPayments $payments): RedirectResponse
    {
        if (! $payment->status->isOpen()) {
            throw ValidationException::withMessages(['payment' => 'Only pending payments can be approved.']);
        }

        $payments->markPaid($payment, reviewer: $request->user());

        return back()->with('status', 'Payment approved. '.$payment->user->name.' has Pro until '.$payment->user->fresh()->pro_paid_until?->toFormattedDateString().'.');
    }

    public function reject(Request $request, Payment $payment, LocalPayments $payments): RedirectResponse
    {
        $note = $request->validate(['note' => ['required', 'string', 'max:500']])['note'];

        if (! $payments->close($payment, PaymentStatus::Rejected, reviewer: $request->user(), note: $note)) {
            throw ValidationException::withMessages(['payment' => 'Only pending payments can be rejected.']);
        }

        return back()->with('status', 'Payment rejected.');
    }

    public function proof(Payment $payment): StreamedResponse
    {
        abort_if($payment->proof_path === null || ! Storage::disk('local')->exists($payment->proof_path), 404);

        return Storage::disk('local')->response($payment->proof_path, $payment->reference.'.'.pathinfo($payment->proof_path, PATHINFO_EXTENSION));
    }
}
