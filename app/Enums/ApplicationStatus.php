<?php

namespace App\Enums;

enum ApplicationStatus: string
{
    case Saved = 'saved';
    case Applied = 'applied';
    case Interviewing = 'interviewing';
    case Rejected = 'rejected';
    case Offer = 'offer';

    public function label(): string
    {
        return match ($this) {
            self::Saved => 'Saved',
            self::Applied => 'Applied',
            self::Interviewing => 'Interviewing',
            self::Rejected => 'Rejected',
            self::Offer => 'Offer',
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $status): array => ['value' => $status->value, 'label' => $status->label()],
            self::cases(),
        );
    }
}
