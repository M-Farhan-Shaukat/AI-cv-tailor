<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\GroqApiKey;
use App\Models\Post;
use App\Models\Setting;
use App\Models\User;
use App\Services\AdSense;
use App\Services\GroqKeyPool;
use App\Services\JobFeedSync;
use App\Services\SiteSettings;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

#[Signature('app:export-setup {--path= : Where to write the file (default storage/app/private/setup/site-setup.json)}')]
#[Description('Export the site configuration (Groq keys, admin settings, guides and super admins) to move it to a new installation')]
class ExportSetup extends Command
{
    public const VERSION = 1;

    public function handle(GroqKeyPool $keys, SiteSettings $settings): int
    {
        $path = $this->option('path') ?: storage_path('app/private/setup/site-setup.json');

        $panelKeys = GroqApiKey::query()->oldest('id')->get();
        $groqKeys = collect($keys->entries())
            ->values()
            ->map(fn (array $entry, int $index): array => [
                'name' => $entry['model']?->name ?? 'Groq key '.($index + 1),
                'key' => $entry['key'],
                'is_active' => true,
            ])
            ->concat($panelKeys->where('is_active', false)->map(fn (GroqApiKey $key): array => [
                'name' => $key->name,
                'key' => (string) $key->key,
                'is_active' => false,
            ]))
            ->values();

        $superAdmins = User::query()
            ->where('role', UserRole::SuperAdmin->value)
            ->get()
            ->concat(User::query()->whereIn('email', (array) config('job_scan.admin_emails', []))->get())
            ->unique('id')
            ->map(fn (User $user): array => [
                'name' => $user->name,
                'email' => $user->email,
                'password_hash' => $user->getAuthPassword(),
            ])
            ->values();

        $data = [
            'version' => self::VERSION,
            'exported_at' => now()->toIso8601String(),
            'super_admins' => $superAdmins,
            'groq_keys' => $groqKeys,
            'site_settings' => $settings->export(),
            'settings' => collect([JobFeedSync::SETTINGS_KEY, AdSense::SETTINGS_KEY])
                ->mapWithKeys(fn (string $key): array => [$key => Setting::get($key)])
                ->filter()
                ->all(),
            'posts' => Post::query()->oldest('id')->get()->map(fn (Post $post): array => [
                ...$post->only(['title', 'slug', 'category', 'excerpt', 'meta_description', 'body', 'status']),
                'published_at' => $post->published_at?->toIso8601String(),
            ]),
        ];

        File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        @chmod($path, 0600);

        $this->components->info('Setup exported to '.$path);
        $this->components->twoColumnDetail('Super admins', (string) $superAdmins->count());
        $this->components->twoColumnDetail('Groq keys', (string) $groqKeys->count());
        $this->components->twoColumnDetail('Settings groups', implode(', ', array_keys($data['site_settings'])) ?: 'none');
        $this->components->twoColumnDetail('Other settings', implode(', ', array_keys($data['settings'])) ?: 'none');
        $this->components->twoColumnDetail('Blog posts', (string) count($data['posts']));
        $this->components->warn('This file contains API keys and secrets in plain text. Copy it privately (USB, password manager) and never commit or email it.');

        return self::SUCCESS;
    }
}
