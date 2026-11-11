# Install ResumeTailor AI on Windows 10

This guide installs the project on a Windows 10 (or 11) PC with default settings: **SQLite** as the database (no MySQL needed) and `php artisan serve` as the web server. It brings across the configuration from the current installation (all Groq API keys, admin settings, job-feed settings and blog guides) and creates **only the super admin account**. No other users, resumes or job data are copied.

> **For Claude Code:** follow the steps in order. Run every command in **PowerShell** from the project folder unless a step says otherwise. After each step, check the "Expected" line. If a command fails, stop, show the error to the user and suggest the fix from the Troubleshooting section. Never print, log or commit the contents of `site-setup.json` or `.env`: they contain API keys.

---

## 0. On the old machine: export the setup

Run this in the existing installation:

```bash
php artisan app:export-setup
```

It writes `storage/app/private/setup/site-setup.json` with the super admin (name, email and password hash), every Groq key, every saved admin setting and the blog guides.

- Copy that file to the Windows PC privately (USB stick or a password manager). **It contains API keys in plain text.** Do not email it, upload it or commit it (git already ignores it).
- The super admin keeps the same password. If you don't remember it, use `--reset-password` in step 7 to get a new one.

---

## 1. Install the tools (once)

| Tool | Version | Where |
|---|---|---|
| Git | latest | https://git-scm.com/download/win (default options) |
| Laravel Herd | latest, free | https://herd.laravel.com/windows (gives PHP 8.4 and Composer) |
| Node.js | 22 LTS or newer | https://nodejs.org (LTS installer; tick "Add to PATH") |

Close and reopen PowerShell after installing, then check:

```powershell
php -v          # Expected: PHP 8.4.x
composer -V     # Expected: Composer version 2.x
node -v         # Expected: v22 or newer
git --version
php -m | Select-String -Pattern "bcmath|pdo_sqlite|sqlite3|zip|mbstring|intl|fileinfo|curl|openssl"
```

Expected: all nine extensions listed. If one is missing, see **Troubleshooting → Missing PHP extension**.

Allow long file paths in Git (some packages have deep folders):

```powershell
git config --global core.longpaths true
```

---

## 2. Get the code

```powershell
cd $HOME\Documents
git clone https://github.com/M-Farhan-Shaukat/AI-cv-tailor.git resume-tailor-ats
cd resume-tailor-ats
```

(If you copy the folder from the old machine instead, leave out `vendor`, `node_modules`, `.env`, `database/database.sqlite` and `public/build`.)

---

## 3. Install dependencies

```powershell
composer install
npm install
```

Expected: both finish without errors. Warnings about optional packages are fine.

---

## 4. Create the `.env` file (default settings)

```powershell
Copy-Item .env.example .env
(Get-Content .env) `
    -replace '^DB_CONNECTION=.*', 'DB_CONNECTION=sqlite' `
    -replace '^(DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD)=', '# $1=' `
    -replace '^APP_URL=.*', 'APP_URL=http://127.0.0.1:8000' |
    Set-Content .env
php artisan key:generate
```

Expected: `Application key set successfully.`

Only the essentials live in `.env`. Groq keys, Stripe, email, plans, job provider keys and AdSense are managed in the admin panel (they arrive with the setup file in step 7).

---

## 5. Create the database

```powershell
New-Item -ItemType File -Force database\database.sqlite | Out-Null
php artisan migrate --force
```

Expected: a list of migrations ending in `DONE`.

---

## 6. Build the front end

```powershell
npm run build
```

Expected: two builds finish (`vite build` and `vite build --ssr`).

---

## 7. Import the setup (super admin, Groq keys, settings, guides)

Put the file from step 0 here (create the folders if needed):

```powershell
New-Item -ItemType Directory -Force storage\app\private\setup | Out-Null
# Copy site-setup.json into storage\app\private\setup\ , then:
php artisan app:import-setup
```

Expected: a summary such as `Super admins 1`, `Groq keys in rotation 12`, `Blog posts 6`, and "Super admins keep the same password as on the old installation."

- Forgot the password? Run `php artisan app:import-setup --reset-password` and use the new password it prints.
- **No setup file?** Start clean instead:
  ```powershell
  php artisan db:seed --class=AdminUserSeeder   # prints the super admin password
  php artisan db:seed --class=BlogPostSeeder
  ```
  Then add your Groq keys in **Admin → AI keys**.

Once the import has worked, delete the setup file from the Windows PC: `Remove-Item storage\app\private\setup\site-setup.json`.

---

## 8. Run the site

Open **four** PowerShell windows in the project folder:

| Window | Command | What it does |
|---|---|---|
| 1 | `php artisan serve` | The website at http://127.0.0.1:8000 |
| 2 | `php artisan queue:work` | Job matching and email alerts |
| 3 | `php artisan schedule:work` | Auto-sync of job feeds and saved-search alerts |
| 4 | `php artisan inertia:start-ssr` | Optional: server-side rendering (for SEO); the site works without it |

Keep them open while you use the site. (With Laravel Herd you can skip window 1: Herd serves the folder at `http://resume-tailor-ats.test` if the project is inside `%USERPROFILE%\Herd`; then set `APP_URL` to that address.)

---

## 9. Check that everything works

1. Open http://127.0.0.1:8000/login and sign in with the super admin email and password.
2. Open **Admin** (top-right menu → Admin console):
   - **AI keys**: all Groq keys show **In rotation**.
   - **Job feeds**: the scheduler card turns green within a minute (window 3); click **Sync all now**.
   - **Settings → Email**: enter your email and app password, save, then **Send a test email to me**.
   - **Settings → Stripe**: add your keys if you take payments, then **Test Stripe connection**.
3. On the home page, upload a CV, paste a job description and click **Just check my ATS score (free)**.

---

## Troubleshooting

**Missing PHP extension** (`bcmath`, `pdo_sqlite`, `zip`, …)
Herd: open Herd → Settings → PHP, make sure PHP 8.4 is selected, then open its `php.ini` and remove the `;` in front of the line, e.g. `extension=bcmath`, `extension=pdo_sqlite`, `extension=sqlite3`, `extension=zip`. Restart PowerShell and run `php -m` again.

**`Unable to locate file in Vite manifest`**
Run `npm run build` again.

**`could not find driver`**
`pdo_sqlite` is not enabled; see "Missing PHP extension".

**`No application encryption key has been specified`**
Run `php artisan key:generate`.

**Settings or keys look empty after import**
Make sure `APP_KEY` was generated *before* `app:import-setup`, then run the import again (it skips anything already there). If you later change `APP_KEY`, saved secrets can no longer be decrypted: run the import again or re-enter them in Admin → Settings.

**`The scheduler is not running` on Admin → Job feeds**
Window 3 (`php artisan schedule:work`) must stay open.

**Port 8000 already in use**
`php artisan serve --port=8080` and set `APP_URL=http://127.0.0.1:8080`.

**`npm install` fails with long path errors**
Run `git config --global core.longpaths true`, move the project to a short path such as `C:\sites\resume-tailor-ats`, and try again.

---

## Moving to a production server later

Use the same export/import: run `php artisan app:export-setup` here, copy the file to the server, run `php artisan migrate --force` and `php artisan app:import-setup` there. On the server, run the queue worker, `php artisan schedule:run` from cron every minute, and `php artisan inertia:start-ssr` under a process manager.
