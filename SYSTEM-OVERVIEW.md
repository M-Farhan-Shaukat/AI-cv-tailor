# AI Resume Tailor & ATS — System Overview

**Version:** 1.5
**Last updated:** 2026-11-04

---

## 1. What it is

A Laravel + React (Inertia) web application that helps a job seeker **tailor one resume to one specific job description** and see how well it will pass an Applicant Tracking System (ATS).

It also **ingests live job postings** from multiple providers, scores every posting against the candidate's CV with the same ATS engine, and links each match directly into the tailor flow.

A user uploads a CV (PDF or DOCX), pastes a job description, and the app:

1. Extracts the text from the CV.
2. Extracts the keywords an ATS would search for in the job description.
3. Scores the original CV against those keywords.
4. Rewrites the resume to align with the job — without inventing facts.
5. Re-scores the tailored resume and renders it as an ATS-safe page.
6. Offers a downloadable PDF and a refinement step.

---

## 2. Features

### 2.1 CV ingestion
- Accepts **PDF** (`smalot/pdfparser`) and **DOCX** (native ZIP/XML parsing).
- Validates type and size (`pdf,docx`, max 5 MB) and requires ≥ 100 characters of extractable text.
- Rejects image-only/scanned PDFs with a clear message (no OCR yet).
- Caps CV text at 8,000 characters before sending to the model.

### 2.2 Job description analysis
- Groq LLM extracts **15–35 ATS keywords** with aliases, category, importance, and the exact job title.
- Explicitly ignores marketing copy, benefits, EEO text, and filler verbs.
- Splits combined terms (`MySQL or PostgreSQL` → two keywords) while keeping standard ones (`CI/CD`).
- Handles oversized JDs by trimming to the most useful head/tail before the call.

### 2.3 Deterministic ATS scoring
Scoring is done in **PHP, not the LLM**, so results are reproducible and comparable before/after.

| Component | Weight | What it checks |
|---|---|---|
| Keyword match | 70% | Required (×3) and preferred (×1) keyword coverage |
| Job title match | 10% | Exact title, or 70% credit for the core title without seniority words |
| Standard sections | 10% | Summary, Experience, Skills, Education headings present |
| Contact details | 10% | Parseable email + phone (50% each) |

Additional rules:
- Keywords found only in the skills list earn **85% credit** and cap the total at **95**.
- A tailored resume whose score only rose because the tool added keywords is capped at **95**.
- Matching is whole-word/phrase-aware and alias-aware; it handles spaces, hyphens, and slashes.

### 2.4 Truthful resume rewriting
- The LLM rewrites **every** role, bullet, project, and section — it is explicitly told a light edit is a failure.
- It may only claim keywords the CV supports, by direct mention, synonym, or clear implication.
- `keyword_coverage` output is **verified against the actual CV text** (exact phrase or ≥70% word overlap) before being trusted.
- Keywords the CV verifiably had are guaranteed to appear; leftovers go under a **Core Competencies** group so the tailored score cannot drop below the original.
- Contact details, employers, dates, degrees, and metrics are never invented.
- Output is forced to plain ASCII and structurally normalized so the template never breaks.

### 2.5 Results, refinement, and export
- Before/after score gauge with a full breakdown of matched/missing keywords.
- "Changes" list explaining what was rewritten and why.
- **Refine** step: the candidate confirms skills they have that the CV missed; the resume is re-tailored without re-analyzing the JD.
- ATS-safe HTML resume rendered server-side (`resources/views/resume/ats.blade.php`).
- PDF download via `barryvdh/laravel-dompdf` (A4 portrait).

### 2.6 Access control & abuse prevention
- Guest-friendly: no account required to try the tailor or scan jobs.
- Each result gets a random 48-character **access token**; downloads/refines are allowed for the owning account, the owning session, **or** a valid token (`hash_equals` comparison).
- Accounts use Laravel Breeze (register, login, email verification, password reset). Guests keep the session/token model; logged-in users own their resumes, matches, and tailored resumes.
- Rate limiting: **20 requests/minute** per user (or IP for guests) for the tailor and **5 scans/10 minutes** for job scanning.
- Long-running requests allow up to 180 seconds but are bounded by HTTP timeouts and retries.

### 2.7 Job discovery & matching
- Providers: **Adzuna**, **Jooble**, and **Remotive** behind a `JobSource` contract, orchestrated by `JobSourceManager`.
- `jobs:refresh-feeds` normalizes postings, deduplicates by fingerprint, updates `last_seen_at`, and deactivates stale listings.
- `/jobs` filters by keyword, location, remote flag, employment type, salary range, posted-within days, and sort order (newest, company, best match).
- A guest uploads a CV once; the CV hash is stored in the session and a queued `ComputeJobMatches` job scores up to `JOB_MATCH_LIMIT` postings.
- Keyword extraction is cached per posting (`keywords_hash`), so re-scans and new CVs do not re-call the LLM for unchanged descriptions.
- Scan progress is cached and polled by the UI (`queued` → `running` → `completed`/`failed`).
- Provider HTTP failures are normalized to `JobSourceRequestException`; the feed refresher records health and honors per-provider cooldowns so one broken source cannot block the others.
- Each job detail page shows the score breakdown, matched/missing keywords, an external apply link, and a **Tailor my resume** link pre-filled with that job description.

### 2.8 Accounts & resume library
- Breeze-based authentication with email verification and password reset.
- `/resumes` lets a signed-in user upload multiple PDF/DOCX CVs, choose a primary CV, and delete old ones.
- The primary CV is reused automatically for job scans and is refreshed whenever the user uploads a CV through the tailor.
- `/profile` supports name/email updates, password changes, and account deletion.
- Email verification is required for resume, saved-item, and admin routes.
- All resume and match reads are scoped to the authenticated user; guests remain scoped by session or access token.

### 2.9 Saved jobs, searches & alerts
- Signed-in users can save/unsave a posting from `/jobs` or the job detail page and track it on `/saved-jobs`.
- Application status moves through `saved → applied → interviewing → rejected → offer`.
- `/saved-searches` stores a query plus filters and a minimum match score; the jobs page can save the current filters in one click.
- `jobs:run-saved-searches` queues `RunSavedSearch` for each due, alerts-enabled search. New matches are scored with the user's primary CV and recorded in `saved_search_notifications`, which enforces one alert per posting per search.
- `SendSavedSearchDigest` emails one digest per run with `Mail`; notification rows are marked `sent_at` so the same posting is never emailed twice.
- The scheduler refreshes feeds with the queued `RefreshJobFeeds` job and re-runs saved searches hourly.

### 2.10 Operations, budgets & security
- `/admin/jobs` (admins only) shows provider health, recent source events, LLM token/request usage today and over 14 days, top users, and configured budgets.
- Admins are configured with `JOB_ADMIN_EMAILS` (comma-separated allowlist); `EnsureUserIsAdmin` returns 403 to everyone else.
- Every provider refresh records a `job_source_statuses` row and a `job_source_events` audit row. Three consecutive failures disable a source for `JOB_CIRCUIT_BREAKER_COOLDOWN_MINUTES` (default 15); a success resets the counter.
- LLM calls are metered in `llm_usage_events` (tokens, duration, status, scope, user). Global and per-user daily token/request budgets are enforced before each call; exceeding a budget returns **429** to the tailor UI and fails queued scans with a clear message instead of crashing the worker.
- Security headers are sent on every web response: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and a CSP (configurable via `SECURITY_CSP_ENABLED`).
- A load test scores 100 postings in one queued run with a mocked LLM, and a regression test asserts the jobs page never calls a provider.

### 2.11 Feature coverage by milestone
| Phase | Status | Delivered features |
|---|---|---|
| **P1 — Foundation** | Complete | `job_postings` schema, `JobSource` contract + manager, Adzuna/Jooble/Remotive adapters, normalization, fingerprint dedupe, stale-listing expiry, `jobs:refresh-feeds` |
| **P2 — Matching** | Complete | Keyword extraction caching (`keywords_hash`), queued `ComputeJobMatches`, `job_matches`, ranked `/jobs` list, job detail score breakdown |
| **P3 — Accounts** | Complete | Breeze-style auth (register/login/verify/reset), profile management, `user_resumes` library + primary CV, per-user ownership scoping, guest session/token compatibility |
| **P4 — Engagement** | Complete | Saved jobs + application statuses, saved searches + filters, deduped match alerts, digest email, scheduler wiring for feeds/searches |
| **P5 — Hardening** | Complete | Admin `/admin/jobs` dashboard, LLM usage metering + daily budgets + cost estimates, provider circuit breaker/cooldowns, security headers + CSP, 100-posting load test, production runbook |
| **P6 — Not defined** | Not started | No P6 scope exists in `REQUIREMENTS-JOB-SCAN.md`; P5 was the final specified milestone |

Full implementation status is also reflected in §9 (testing), §10 (limitations), and §11 (production checklist).

---

## 3. Technology stack

| Layer | Technology |
|---|---|
| Backend | PHP 8.3+ / Laravel 13 |
| Frontend | React 19 + Inertia.js v3 |
| Styling | Bootstrap 5.3 + Bootstrap Icons, Tailwind v4 (Vite) |
| Build | Vite 8 |
| Database | MySQL (SQLite for tests) |
| LLM | Groq (`openai/gpt-oss-120b` by default) |
| PDF | barryvdh/laravel-dompdf |
| Parsing | smalot/pdfparser, native DOCX XML |
| Tests | PHPUnit 12 |
| Formatting | Laravel Pint |

---

## 4. Architecture

```text
Browser (React/Inertia)
   │  POST /tailor (multipart: cv_file + job_description)
   ▼
ResumeTailorController
   │  validate → extract text → authorize
   ▼
ResumeTailor (orchestrator)
   ├─ GroqService::extractJobKeywords(jd)      → job_title + keywords
   ├─ AtsScorer::score(cvText, keywords)       → original score
   ├─ GroqService::tailorResume(cv, jd, …)     → structured resume JSON
   ├─ verifiedEvidence() + ensureKeywordCoverage()
   ├─ render() → ATS Blade template → HTML
   ├─ AtsScorer::score(plainText, keywords)    → tailored score
   └─ apply added-keyword cap
   ▼
TailoredResume (DB)  ──►  JSON response (scores, HTML, download/refine URLs)
```

### Key files

| File | Responsibility |
|---|---|
| `app/Http/Controllers/ResumeTailorController.php` | HTTP endpoints, validation, ownership checks, persistence |
| `app/Services/ResumeTailor.php` | Pipeline orchestration, evidence verification, keyword coverage, sorting, HTML→text |
| `app/Services/AtsScorer.php` | Deterministic scoring, keyword matching, section detection |
| `app/Services/GroqService.php` | LLM prompts, JSON handling, retries, prompt shrinking, normalization |
| `app/Services/ResumeTextExtractor.php` | PDF/DOCX text extraction and cleanup |
| `app/Models/TailoredResume.php` | Persistence model (JSON casts) |
| `app/Providers/AppServiceProvider.php` | `resume-tailor` rate limiter |
| `resources/js/Pages/ResumeTailor.jsx` | Main UI, upload, progress stages, score gauges |
| `resources/views/resume/ats.blade.php` | ATS-safe resume template used for HTML and PDF |
| `app/Http/Controllers/JobScanController.php` | Job list/detail, filters, scan dispatch |
| `app/Http/Controllers/SavedJobController.php` | Saved jobs and application status |
| `app/Http/Controllers/SavedSearchController.php` | Saved searches, alerts toggle, manual run |
| `app/Services/JobSearchFilters.php` | Shared job filter normalization/query |
| `app/Services/JobPostingPresenter.php` | Shared job payloads for Inertia pages |
| `app/Services/SavedSearchRunner.php` | Scores new postings and records alert rows |
| `app/Jobs/RefreshJobFeeds.php` | Queued provider feed refresh |
| `app/Jobs/RunSavedSearch.php` | Queued saved-search scoring |
| `app/Jobs/SendSavedSearchDigest.php` | Queued alert email |
| `app/Services/LlmUsageTracker.php` | Token/request accounting and daily budget enforcement |
| `app/Services/JobSourceHealth.php` | Provider health, consecutive failures, cooldown |
| `app/Services/JobFeedRefresher.php` | Refresh orchestration shared by job and command |
| `app/Services/JobSources/JobSourceRequestException.php` | Normalized provider failure |
| `app/Http/Controllers/AdminJobMetricsController.php` | Admin operations dashboard payload |
| `app/Http/Middleware/EnsureUserIsAdmin.php` | Admin allowlist gate |
| `app/Http/Middleware/SecurityHeaders.php` | CSP and hardening headers |
| `resources/js/Pages/Admin/JobMetrics.jsx` | Admin dashboard UI |

---

## 5. Request flow (tailor)

1. **Validate** — file type/size, JD length (50–100,000 chars).
2. **Extract** — PDF or DOCX to plain text; reject if < 100 chars.
3. **Analyze** — LLM returns the job title and weighted keyword list.
4. **Score original** — deterministic ATS score of the raw CV.
5. **Rewrite** — LLM returns structured resume JSON + `keyword_coverage` + `changes`.
6. **Verify** — every "supported" claim is checked against the CV; unverified claims are dropped.
7. **Guarantee coverage** — verified/original keywords missing after the rewrite are added to Core Competencies.
8. **Render** — structured JSON to ATS HTML, then to plain text (what an ATS sees).
9. **Re-score** — deterministic score of the tailored plain text; apply the added-keyword cap.
10. **Persist + respond** — store the record, return scores, breakdown, HTML, and tokenized URLs.

---

## 6. Routes

| Method | URI | Name | Purpose |
|---|---|---|---|
| GET | `/` | `home` | Upload/paste form |
| POST | `/tailor` | `resume.tailor` | Run the tailor pipeline |
| POST | `/tailor/{tailoredResume}/refine` | `resume.refine` | Re-tailor with confirmed skills |
| GET | `/download/{tailoredResume}` | `resume.download` | PDF download (account, session, or `?token=`) |
| GET | `/jobs` | `jobs.index` | Ranked job matches |
| GET | `/jobs/{jobPosting}` | `jobs.show` | Job detail + match report |
| POST | `/jobs/scan` | `jobs.scan` | Queue a CV scan |
| GET/POST | `/register`, `/login`, `/forgot-password`, `/reset-password/{token}` | Breeze names | Authentication |
| GET/PATCH/DELETE | `/profile` | `profile.*` | Account details, password, deletion |
| GET/POST/PATCH/DELETE | `/resumes` | `resumes.*` | Resume library and primary CV |
| GET | `/saved-jobs` | `saved-jobs.index` | Saved jobs and application pipeline |
| POST | `/jobs/{jobPosting}/save` | `saved-jobs.store` | Save a posting |
| PATCH/DELETE | `/saved-jobs/{savedJob}` | `saved-jobs.*` | Update status / unsave |
| GET/POST | `/saved-searches` | `saved-searches.*` | List / create saved searches |
| PATCH/DELETE | `/saved-searches/{savedSearch}` | `saved-searches.*` | Update / delete |
| POST | `/saved-searches/{savedSearch}/run` | `saved-searches.run` | Queue a manual run |
| GET | `/admin/jobs` | `admin.jobs.index` | Provider health, LLM usage, budgets (admin only) |

---

## 7. Data model

### `tailored_resumes`
| Column | Purpose |
|---|---|
| `session_id` | Guest ownership |
| `user_id` | Account ownership (nullable) |
| `job_posting_id` | Job this resume was tailored for (nullable) |
| `access_token` | Unguessable download/refine token (unique) |
| `original_filename` | Uploaded file name |
| `job_description` | Target JD text |
| `extracted_cv_text` | Cleaned CV text |
| `tailored_cv_json` | Structured resume (array cast) |
| `tailored_cv_html` | Rendered ATS HTML |
| `match_score` / `original_score` | Tailored / pre-tailored scores |
| `ats_keywords` | Matched keywords (array cast) |
| `score_report` | Full breakdown, job title, keywords, confirmed skills (array cast) |
| `pdf_path` | Reserved for future stored PDFs |
| timestamps | |

### `user_resumes`
| Column | Purpose |
|---|---|
| `user_id` | Owner |
| `original_filename` | Uploaded file name |
| `extracted_text` | Cleaned CV text |
| `is_primary` | CV used automatically for scans |
| timestamps | |

### `saved_jobs`
| Column | Purpose |
|---|---|
| `user_id` | Owner |
| `job_posting_id` | Saved posting |
| `status` | `saved`, `applied`, `interviewing`, `rejected`, `offer` |
| timestamps | |

Unique on (`user_id`, `job_posting_id`).

### `saved_searches`
| Column | Purpose |
|---|---|
| `user_id` | Owner |
| `name` | Display name |
| `query` | Keywords |
| `filters` | JSON: location, remote, employment type, salary range, posted-within days |
| `min_score` | Alert threshold (0–100) |
| `alerts_enabled` | Email alerts switch |
| `last_run_at` | Scheduler bookkeeping |

### `saved_search_notifications`
| Column | Purpose |
|---|---|
| `saved_search_id` | Saved search |
| `job_posting_id` | Matched posting |
| `sent_at` | Null until the digest email is sent |

Unique on (`saved_search_id`, `job_posting_id`); this is the alert dedupe ledger.

### `llm_usage_events`
| Column | Purpose |
|---|---|
| `user_id` | Account that triggered the call (nullable for guests) |
| `scope` | `keyword`, `tailor`, or another LLM feature |
| `model` | Model id |
| `status` | `success` or `failure` |
| `status_code` | Upstream HTTP status (nullable) |
| `input_tokens` / `output_tokens` | Token accounting |
| `duration_ms` | Call latency |
| `error` | Failure message (nullable) |
| timestamps | Indexed with `user_id` for daily budget queries |

### `job_source_statuses`
| Column | Purpose |
|---|---|
| `provider` | Source key (unique) |
| `last_attempted_at` / `last_success_at` | Health bookkeeping |
| `last_error` / `last_status_code` | Most recent failure detail |
| `consecutive_failures` | Resets to 0 on success |
| `disabled_until` | Circuit-breaker cooldown window |

### `job_source_events`
| Column | Purpose |
|---|---|
| `provider` | Source key |
| `successful` | Outcome flag |
| `status_code` | Upstream status (nullable) |
| `message` | Result/error summary |
| `context` | JSON payload (counts, errors) |
| timestamps | Admin event feed |

`job_postings` and `job_matches` are documented in `REQUIREMENTS-JOB-SCAN.md`; matches are keyed by an owner+resume hash so users and sessions never share scores.

---

## 8. Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq authentication (required) |
| `GROQ_MODEL` | Model id (default `openai/gpt-oss-120b`) |
| `GROQ_API_URL` | Chat-completions endpoint |
| `GROQ_REASONING_EFFORT` | `low`/`medium`/`high` for gpt-oss models |
| `DB_*` | MySQL connection |
| `SESSION_DRIVER` | `database` |
| `QUEUE_CONNECTION` | `database` (used for scans, refreshes and alerts) |
| `JOB_SAVED_SEARCH_INTERVAL_MINUTES` | Minimum age before a search re-runs (default 60) |
| `JOB_SAVED_SEARCH_LIMIT` | Postings scored per saved search run (default 100) |
| `JOB_SAVED_SEARCH_MIN_SCORE` | Default alert threshold (default 60) |
| `MAIL_*` | Alert email transport (`MAIL_MAILER=log` in local) |
| `JOB_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Consecutive failures before a source cools down (default 3) |
| `JOB_CIRCUIT_BREAKER_COOLDOWN_MINUTES` | Cooldown length (default 15) |
| `JOB_ADMIN_EMAILS` | Comma-separated admin allowlist for `/admin/jobs` |
| `LLM_DAILY_GLOBAL_TOKEN_BUDGET` | Global daily token cap (default 1,000,000) |
| `LLM_DAILY_USER_TOKEN_BUDGET` | Per-user daily token cap (default 150,000) |
| `LLM_DAILY_GLOBAL_REQUEST_BUDGET` | Global daily request cap (default 400) |
| `LLM_DAILY_USER_REQUEST_BUDGET` | Per-user daily request cap (default 80) |
| `LLM_INPUT_COST_PER_MILLION` / `LLM_OUTPUT_COST_PER_MILLION` | Cost estimates shown in admin |
| `SECURITY_CSP_ENABLED` | Toggle the Content-Security-Policy header (default true) |
| `VITE_APP_NAME` | Branding in UI/SEO |

Prompts and token caps are tuned for Groq's free tier (~8k tokens/min):
- Keyword JD: 8,000 chars
- Rewrite JD: 3,500 chars
- Rewrite CV: 6,500 chars
- Automatic prompt shrinking on HTTP 413.

---

## 9. Testing

- `tests/Unit/AtsScorerTest.php` — scoring, aliases, weights, caps.
- `tests/Feature/ResumeTailorTest.php` — end-to-end tailor/refine/download, authorization, prompt trimming, 413 retry, error handling.
- `tests/Feature/Auth/*` — registration, login, verification, password reset, password update.
- `tests/Feature/UserResumeTest.php` — resume library, primary CV selection, ownership boundaries, account-scoped downloads.
- `tests/Feature/Job*` and `tests/Unit/JobPostingNormalizerTest.php` — ingestion, dedupe, sources, matching, scan controller, and queued feed refresh.
- `tests/Feature/SavedJobTest.php` — saving, status pipeline, ownership boundaries.
- `tests/Feature/SavedSearchTest.php` — saved-search CRUD, ownership, manual run.
- `tests/Feature/SavedSearchRunnerTest.php` — filters, score thresholds, alert dedupe, digest email, scheduler command.
- `tests/Feature/LlmUsageTest.php` — usage recording, per-user/global budgets, queued-scan budget failure.
- `tests/Feature/JobSourceHealthTest.php` — circuit opening, cooldown skipping, recovery reset.
- `tests/Feature/AdminJobMetricsTest.php`, `tests/Feature/SecurityHeadersTest.php` — admin authorization/payload and response headers.
- `tests/Feature/JobScanLoadTest.php` — 100-posting load run (mocked LLM) and no-provider-call regression.
- Run: `php artisan test --compact <path>` or `vendor/bin/phpunit`.
- Note: feature tests need the SQLite PDO driver (`pdo_sqlite`); without it they error with "could not find driver". On machines without `pdo_sqlite`, run against MySQL by passing `DB_CONNECTION=mysql DB_DATABASE=<test_db>` to the test command.

---

## 10. Current limitations

- **Tailor is synchronous** — requests can take up to ~3 minutes; job matching runs on the queue.
- **No OCR** — scanned/image PDFs are rejected.
- **Free-tier LLM budget** — long resumes/JDs may be trimmed or rate-limited.
- **Admin dashboard is read-only** — provider cooldowns clear automatically; there are no manual overrides yet.
- **Budgets are daily and process-wide per user** — there is no billing-grade cost ledger or rolling-window quota.
- **CSP allows inline styles/scripts** needed by the current UI; tightening it requires nonce/hash work.

The remaining job-scanning milestones are specified in `REQUIREMENTS-JOB-SCAN.md`.

---

## 11. Local setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run build        # or: npm run dev
php artisan serve
```

Requirements: PHP 8.3+ with `pdo_mysql` (and `pdo_sqlite` for tests), Node.js, a MySQL database, and a Groq API key.

Background workers (needed for scans, feed refreshes, saved searches and alert email):

```bash
php artisan queue:work
php artisan schedule:work
```

In production run `php artisan queue:work --tries=3` under Supervisor (or a similar process manager) and add the scheduler cron entry:

```cron
* * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1
```

Set `MAIL_MAILER=smtp` (or another transport) and the matching `MAIL_*` values so alert digests are delivered.

Production checklist:
- Set `JOB_ADMIN_EMAILS` to the operators who need `/admin/jobs`.
- Tune `LLM_*` budgets and cost rates for the Groq plan; the defaults target a small free-tier deployment.
- Leave `SECURITY_CSP_ENABLED=true` and only relax the policy if an external asset origin is added.
- Watch provider health and recent source events in `/admin/jobs` after enabling a new feed source.
