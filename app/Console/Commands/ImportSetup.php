<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\GroqApiKey;
use App\Models\Post;
use App\Models\Setting;
use App\Models\User;
use App\Services\GroqKeyPool;
use App\Services\SiteSettings;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

#[Signature('app:import-setup {--path= : The file from app:export-setup (default storage/app/private/setup/site-setup.json)} {--reset-password : Give each super admin a new random password}')]
#[Description('Import a site configuration exported with app:export-setup: super admins, Groq keys, settings and guides')]
class ImportSetup extends Command
{
    public function handle(GroqKeyPool $keys, SiteSettings $settings): int
    {
        $path = $this->option('path') ?: storage_path('app/private/setup/site-setup.json');

        if (! is_file($path)) {
            $this->components->error("Setup file not found: {$path}");

            return self::FAILURE;
        }

        $data = json_decode((string) file_get_contents($path), true);

        if (! is_array($data) || ($data['version'] ?? null) !== ExportSetup::VERSION) {
            $this->components->error('This is not a setup file from app:export-setup (or it is from another version).');

            return self::FAILURE;
        }

        $passwords = [];

        DB::transaction(function () use ($data, $keys, &$passwords): void {
            foreach ((array) ($data['super_admins'] ?? []) as $admin) {
                $user = User::query()->firstOrNew(['email' => $admin['email']]);
                $password = $this->option('reset-password') || blank($admin['password_hash'] ?? null) ? Str::password(16, symbols: false) : null;

                $user->forceFill([
                    'name' => $admin['name'],
                    'role' => UserRole::SuperAdmin,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'suspended_at' => null,
                ]);

                if (! $user->exists || $password !== null) {
                    $user->forceFill(['password' => $password !== null ? Hash::make($password) : $admin['password_hash']]);
                }

                $user->save();

                if ($password !== null) {
                    $passwords[$user->email] = $password;
                }
            }

            $addedBy = User::query()->where('role', UserRole::SuperAdmin->value)->value('id');

            foreach ((array) ($data['groq_keys'] ?? []) as $groqKey) {
                $key = trim((string) ($groqKey['key'] ?? ''));

                if ($key === '' || $keys->contains($key)) {
                    continue;
                }

                GroqApiKey::query()->create([
                    'name' => mb_substr((string) ($groqKey['name'] ?? 'Groq key'), 0, 80),
                    'key' => $key,
                    'fingerprint' => GroqApiKey::fingerprintOf($key),
                    'last_four' => substr($key, -4),
                    'is_active' => (bool) ($groqKey['is_active'] ?? true),
                    'added_by' => $addedBy,
                ]);
            }

            foreach ((array) ($data['settings'] ?? []) as $key => $value) {
                Setting::put($key, $value);
            }

            foreach ((array) ($data['posts'] ?? []) as $post) {
                Post::query()->firstOrCreate(['slug' => $post['slug']], [
                    ...collect($post)->only(['title', 'category', 'excerpt', 'meta_description', 'body', 'status'])->all(),
                    'published_at' => filled($post['published_at'] ?? null) ? Carbon::parse($post['published_at']) : null,
                    'author_id' => $addedBy,
                ]);
            }
        });

        foreach ((array) ($data['site_settings'] ?? []) as $group => $values) {
            if (array_key_exists($group, SiteSettings::GROUPS) && is_array($values)) {
                $settings->save($group, $values);
            }
        }

        Cache::forget(SiteSettings::CACHE_KEY);

        $this->components->info('Setup imported from '.$path);
        $this->components->twoColumnDetail('Super admins', (string) count((array) ($data['super_admins'] ?? [])));
        $this->components->twoColumnDetail('Groq keys in rotation', (string) count($keys->keys()));
        $this->components->twoColumnDetail('Settings groups', implode(', ', array_keys((array) ($data['site_settings'] ?? []))) ?: 'none');
        $this->components->twoColumnDetail('Blog posts', (string) Post::query()->count());

        foreach ($passwords as $email => $password) {
            $this->components->warn("New password for {$email}: {$password} (change it after signing in)");
        }

        if ($passwords === []) {
            $this->components->info('Super admins keep the same password as on the old installation.');
        }

        return self::SUCCESS;
    }
}
