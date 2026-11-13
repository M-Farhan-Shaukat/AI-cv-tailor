<?php

namespace App\Enums;

/**
 * Pending: created, waiting for the gateway or for the bank transfer details.
 * AwaitingReview: the payer sent bank transfer details; an admin has to check them.
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case AwaitingReview = 'awaiting_review';
    case Paid = 'paid';
    case Failed = 'failed';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::AwaitingReview => 'Awaiting review',
            self::Paid => 'Paid',
            self::Failed => 'Failed',
            self::Rejected => 'Rejected',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::AwaitingReview], true);
    }
}
