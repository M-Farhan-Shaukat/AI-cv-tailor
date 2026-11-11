<?php

namespace App\Enums;

/**
 * What a user may do in the admin panel. Admins manage users and resumes; super admins can also
 * change roles and manage other admins. Emails in JOB_ADMIN_EMAILS are always super admins.
 */
enum UserRole: string
{
    case User = 'user';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';

    public function label(): string
    {
        return match ($this) {
            self::User => 'User',
            self::Admin => 'Admin',
            self::SuperAdmin => 'Super admin',
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $role): array => ['value' => $role->value, 'label' => $role->label()], self::cases());
    }
}
