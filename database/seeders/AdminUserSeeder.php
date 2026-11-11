<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates the site's super admin. Safe to run again: an existing account only gets the super admin
 * role back, its password is never changed.
 *
 * php artisan db:seed --class=AdminUserSeeder
 */
class AdminUserSeeder extends Seeder
{
    public const EMAIL = 'mfarhanshaukatali786@gmail.com';

    public const NAME = 'M. Farhan Shaukat';

    public function run(): void
    {
        $user = User::query()->where('email', self::EMAIL)->first();

        if ($user !== null) {
            $user->forceFill([
                'role' => UserRole::SuperAdmin,
                'email_verified_at' => $user->email_verified_at ?? now(),
                'suspended_at' => null,
            ])->save();

            $this->command?->info('Existing account '.self::EMAIL.' is now a super admin. Its password was not changed.');

            return;
        }

        $password = Str::password(16, symbols: false);

        User::query()->forceCreate([
            'name' => self::NAME,
            'email' => self::EMAIL,
            'password' => Hash::make($password),
            'role' => UserRole::SuperAdmin,
            'email_verified_at' => now(),
        ]);

        $this->command?->info('Super admin created: '.self::EMAIL);
        $this->command?->warn('Password (shown once, change it after signing in): '.$password);
    }
}
