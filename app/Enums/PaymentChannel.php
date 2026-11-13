<?php

namespace App\Enums;

/**
 * Pakistani payment channels for one-off Pro payments. JazzCash and Easypaisa are hosted checkouts
 * confirmed by the gateway; a bank transfer is confirmed by an admin after checking the account.
 */
enum PaymentChannel: string
{
    case JazzCash = 'jazzcash';
    case Easypaisa = 'easypaisa';
    case BankTransfer = 'bank_transfer';

    public function label(): string
    {
        return match ($this) {
            self::JazzCash => 'JazzCash',
            self::Easypaisa => 'Easypaisa',
            self::BankTransfer => 'Bank transfer',
        };
    }

    public function isGateway(): bool
    {
        return $this !== self::BankTransfer;
    }
}
