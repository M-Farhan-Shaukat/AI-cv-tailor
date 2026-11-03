# Requirements — Job Scan & Match Update

**Project:** AI Resume Tailor & ATS
**Document version:** 1.0
**Status:** Draft for implementation
**Last updated:** 2026-11-03

---

## 1. Purpose

This document defines the requirements for extending the current single-JD resume tailor into a **job-scanning product**: a user uploads a CV once, the system continuously discovers relevant job postings from external sources, ranks them against the CV, and lets the user tailor their resume for any match.

The existing resume-tailoring and ATS-scoring engine is reused as-is. This update adds the missing layers around it: job ingestion, matching/ranking, user accounts, saved jobs, and alerts.

---

## 2. Baseline (what already exists)

| Capability | Status |
|---|---|
| PDF/DOCX CV text extraction | Done |
| Groq-based JD keyword extraction | Done |
| Deterministic ATS scoring (before/after) | Done |
| AI resume rewrite with truthfulness checks | Done |
| ATS-safe HTML resume + PDF download | Done |
| Session/access-token ownership checks | Done |
| Rate limiting (20 req/min per session) | Done |
| User accounts, job postings, background matching | **Missing** |

The job-scan update builds on this baseline and must not regress existing behaviour.

---

## 3. Goals and success metrics

### Goals
1. A user uploads a CV once and sees a ranked list of relevant jobs.
2. Each job shows a match score computed with the same deterministic scorer used by the tailor.
3. A user can tailor their resume for any scanned job in one click.
4. New matching jobs are surfaced to the user without them re-running a search.

### Success metrics
- Median time from CV upload to first ranked job list: **< 30 seconds** (cached sources) / **< 2 minutes** (cold fetch).
- Match score is reproducible for the same CV + job (no LLM in the scoring path).
- Duplicate postings across sources are collapsed to one result.
- Zero cross-user data leaks (resumes, emails, saved jobs).
- Background scan job failure rate **< 2%** per provider per day.

---

## 4. Personas

| Persona | Need |
|---|---|
| **Job seeker (guest)** | Try the tailor without an account; scan a few jobs. |
| **Registered job seeker** | Save CV, saved searches, tracked jobs, email alerts. |
| **Admin / operator** | Monitor provider health, job counts, AI usage and cost. |

---

## 5. Functional requirements

Priority: **M** = must have, **S** = should have, **C** = could have.

### FR-1 — Job source integration (M)

- **FR-1.1** Support at least **three** external job providers via server-side HTTP clients. Recommended free-tier sources:
  - Adzuna API (keyword + location search)
  - Jooble API (keyword search)
  - Remotive / Arbeitnow (remote-focused feeds)
  - Greenhouse / Lever public job-board endpoints for company-specific boards (phase 2)
- **FR-1.2** Each provider is implemented behind a common `JobSource` contract:
  ```php
  interface JobSource {
      public function search(JobSearchCriteria $criteria): Collection; // Collection<JobPostingData>
      public function name(): string;
  }
  ```
- **FR-1.3** Provider credentials and base URLs live in `config/services.php` + `.env`, never in code.
- **FR-1.4** Every provider call has connect/response timeouts, retry with backoff on `429/5xx`, and a per-provider circuit breaker or cooldown.
- **FR-1.5** Provider failures are logged and must not fail the whole scan; partial results are returned.
- **FR-1.6** Respect each provider's terms of service and rate limits. **No HTML scraping** of sites that prohibit it.

### FR-2 — Job normalization and deduplication (M)

- **FR-2.1** Normalize every posting into a single `job_postings` shape (see §7).
- **FR-2.2** Deduplicate by a stable fingerprint: `hash(provider-agnostic key: normalized title + company + location + external id/url)`.
- **FR-2.3** If a posting is seen again, update `last_seen_at` and `is_active`; do not create a duplicate row.
- **FR-2.4** Mark postings as inactive when they are no longer returned by the provider after a configurable window (default 14 days).
- **FR-2.5** Clean and ATS-normalize text fields (reuse `toAtsSafeText` conventions: plain ASCII, single spaces).

### FR-3 — Resume ↔ job matching (M)

- **FR-3.1** Compute a match score for a job using the existing `AtsScorer` and the job description text.
- **FR-3.2** Keyword extraction for a job must be **cached per posting** (`job_postings.keywords`) so scanning many jobs does not re-call the LLM per user.
- **FR-3.3** Ranking score = `AtsScorer.score(cvText, jobKeywords, jobTitle).score`, optionally blended with recency and location fit (see FR-3.4).
- **FR-3.4** Filters must be applied before ranking: query, location/country, remote flag, employment type, salary range (when provided), posted-within days.
- **FR-3.5** Matching runs in a queued job per user/CV; results are persisted in `job_matches` (see §7).
- **FR-3.6** A user can re-run matching on demand, subject to rate limits.
- **FR-3.7** The job detail page shows: matched keywords, missing keywords, score breakdown, and a "Tailor resume for this job" action.

### FR-4 — Search & scan UI (M)

- **FR-4.1** A `/jobs` page (Inertia + React) with:
  - Search box (role/title/keywords)
  - Location and remote filters
  - Sort by match score / newest / company
  - Pagination or infinite scroll (Inertia v3 merged props)
- **FR-4.2** Each result card shows title, company, location, remote flag, salary (if available), posted date, source, and match score.
- **FR-4.3** Empty, loading, and error states are explicit; deferred props use skeletons.
- **FR-4.4** Job detail view at `/jobs/{jobPosting}` with description, score breakdown, and tailor CTA.
- **FR-4.5** The matched job can trigger the existing tailor flow with the job description pre-filled.

### FR-5 — User accounts & profile (M)

- **FR-5.1** Add authentication (Laravel Fortify/Breeze) with email verification and password reset.
- **FR-5.2** A user has a profile with one or more resumes (`user_resumes`), storing extracted text and original filename.
- **FR-5.3** `tailored_resumes` gains a nullable `user_id`; guest-created records keep the current session/token model.
- **FR-5.4** Migrate existing `session_id`-owned records lazily: on login, allow claim by matching session, or leave guest records accessible by token only.
- **FR-5.5** Authorization: users can only read/update/delete their own resumes, matches, and saved jobs. Policies or scoped queries, never raw `find()`.

### FR-6 — Saved jobs, tracked applications & alerts (S)

- **FR-6.1** Save/unsave a job.
- **FR-6.2** Track application status per saved job: `saved → applied → interviewing → rejected → offer`.
- **FR-6.3** Saved searches (query + filters) that re-run on a schedule.
- **FR-6.4** Email alerts when new postings match a saved search above a configurable score threshold.
- **FR-6.5** Alerts are queued and deduplicated (never email the same posting twice for the same saved search).

### FR-7 — Background processing & scheduling (M)

- **FR-7.1** Use Laravel queues (`QUEUE_CONNECTION=database`, `jobs` table already exists) for: provider fetches, keyword extraction, match computation, and alert emails.
- **FR-7.2** Add a scheduler entry (`routes/console.php`) that refreshes active job feeds and re-runs saved searches.
- **FR-7.3** Jobs must be idempotent and safe to retry (`tries`, `backoff`, `unique` job middleware).
- **FR-7.4** Failed jobs are visible via `failed_jobs` and retryable.
- **FR-7.5** A queue worker and scheduler must run in production (document in deployment notes).

### FR-8 — Admin / operational visibility (C)

- **FR-8.1** Count of active postings per provider and last successful sync time.
- **FR-8.2** AI usage/cost counters (requests, tokens, failures) per day.
- **FR-8.3** Provider error log view (status codes, last error message).

### FR-9 — Reuse of existing tailor (M)

- **FR-9.1** The job scan must call the existing `ResumeTailor` service; no duplicate LLM or scoring logic.
- **FR-9.2** Tailor output continues to expose `download_url` and `refine_url` with access tokens.
- **FR-9.3** Existing routes, rate limits, and tests must continue to pass.

---

## 6. Non-functional requirements

### Performance
- **NFR-1** Job list requests serve from cache/DB; no provider calls on page load.
- **NFR-2** A cold scan of 100 postings completes within 5 minutes via queue workers.
- **NFR-3** Indexes on `job_postings.fingerprint`, `job_postings.posted_at`, `job_postings.is_active`, `job_matches.user_id`, `job_matches.score`.

### Security & privacy
- **NFR-4** Resumes and extracted text are private; all reads are scoped to the owner. Use `hash_equals` for token comparison (existing pattern).
- **NFR-5** No secrets in code or logs; provider keys and `GROQ_API_KEY` only from environment.
- **NFR-6** Validate and sanitize all provider payloads before persistence (length caps, cast to string, strip control characters).
- **NFR-7** CSP/headers appropriate for the app; never render untrusted job HTML directly — sanitize or render as text.
- **NFR-8** Rate-limit scan endpoints per user/IP.

### Reliability
- **NFR-9** Provider failure degrades gracefully; one provider down does not empty the feed.
- **NFR-10** Scans are retryable and idempotent; duplicate postings never multiply.
- **NFR-11** All new writes are transactional where they span multiple tables.

### Cost control
- **NFR-12** LLM calls are cached per posting and never repeated for the same JD text hash.
- **NFR-13** Per-user and global daily LLM budgets exist; exceeding them queues or rejects gracefully with a clear message.

### Maintainability
- **NFR-14** Follow existing conventions: services in `app/Services`, form requests for validation, PHPUnit feature tests, Pint formatting.
- **NFR-15** New provider is added by implementing the contract and registering it in a config array — no controller changes.

### Accessibility & UX
- **NFR-16** Job cards and filters are keyboard navigable and screen-reader friendly.
- **NFR-17** Loading states use animated skeletons for deferred props.

---

## 7. Data model

### `job_postings` (new)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `provider` | string, indexed | e.g. `adzuna`, `jooble`, `remotive` |
| `external_id` | string, nullable | provider id |
| `fingerprint` | string(64), unique | dedupe key |
| `title` | string | |
| `company` | string, nullable | |
| `location` | string, nullable | |
| `is_remote` | boolean, default false | |
| `employment_type` | string, nullable | |
| `salary_min`/`salary_max` | integer, nullable | normalized currency |
| `currency` | string(3), nullable | |
| `description` | longText | plain text |
| `apply_url` | text | |
| `keywords` | json, nullable | cached keyword analysis |
| `keywords_hash` | string(64), nullable | hash of description used for cache |
| `posted_at` | timestamp, nullable | |
| `last_seen_at` | timestamp | |
| `is_active` | boolean, default true, indexed | |
| timestamps | | |

### `job_matches` (new)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK users, nullable, indexed | null for guests |
| `session_id` | string, nullable, indexed | guest fallback |
| `user_resume_id` | FK user_resumes, nullable | |
| `job_posting_id` | FK job_postings, indexed | |
| `score` | integer, indexed | 0–100 |
| `breakdown` | json | AtsScorer breakdown |
| `matched_keywords` | json | |
| `missing_keywords` | json | |
| `computed_at` | timestamp | |
| unique | (`user_id`,`session_id`,`job_posting_id`) | prevent duplicates |

### `user_resumes` (new)
| Column | Type |
|---|---|
| `id` | bigint PK |
| `user_id` | FK users |
| `original_filename` | string |
| `extracted_text` | longText |
| `is_primary` | boolean |
| timestamps | |

### `saved_jobs` / `saved_searches` (new, S)
- `saved_jobs`: `user_id`, `job_posting_id`, `status` enum, timestamps, unique(`user_id`,`job_posting_id`).
- `saved_searches`: `user_id`, `name`, `query`, `filters` json, `min_score`, `alerts_enabled`, `last_run_at`.

### Changes to existing tables
- `tailored_resumes`: add nullable `user_id`, nullable `job_posting_id`.
- No destructive migrations; all new columns nullable or defaulted.

---

## 8. External integrations

| Service | Purpose | Config keys |
|---|---|---|
| Groq | Keyword extraction + resume rewrite (existing) | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_API_URL`, `GROQ_REASONING_EFFORT` |
| Adzuna | Job search | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` |
| Jooble | Job search | `JOOBLE_API_KEY` |
| Remotive / Arbeitnow | Remote job feeds | base URL config |
| Mail (existing Laravel mailer) | Alerts | `MAIL_*` |

Add all keys to `.env.example` with empty values and comments.

---

## 9. Processing flow

```text
Scheduler (hourly)
   └─ RefreshJobFeeds (queued)
        ├─ each JobSource::search(criteria)
        ├─ normalize + fingerprint + upsert job_postings
        └─ mark stale postings inactive

User saves search / logs in
   └─ ComputeJobMatches (queued)
        ├─ load user_resumes.extracted_text
        ├─ for each active posting:
        │     ├─ keywords = posting.keywords ?? GroqService.extractJobKeywords(description)  (cached)
        │     └─ AtsScorer.score(cv, keywords, title)
        ├─ upsert job_matches
        └─ dispatch SendMatchAlerts if score >= threshold
```

**Design rule:** the LLM is used for keyword extraction only; scoring stays deterministic in PHP.

---

## 10. Milestones

| Phase | Scope | Exit criteria |
|---|---|---|
| **P1 — Foundation** | `job_postings` model/migration, `JobSource` contract, one provider (Adzuna), normalization + dedupe, console command | Can fetch and store deduplicated postings |
| **P2 — Matching** | Keyword caching, `ComputeJobMatches` queued job, `job_matches`, `/jobs` list + detail | Ranked jobs view with score breakdown |
| **P3 — Accounts** | Auth, `user_resumes`, ownership policies, migrate guest flow | Registered users have private resumes/matches |
| **P4 — Engagement** | Saved jobs, saved searches, email alerts, scheduler | New-match emails delivered once |
| **P5 — Hardening** | Admin metrics, budgets, circuit breakers, load test, docs | NFRs verified; production runbook |

---

## 11. Out of scope (this update)

- Auto-applying to jobs on the user's behalf.
- Browser extension or mobile app.
- Resume parsing of scanned/image PDFs (OCR) — separate initiative.
- Paid job-board APIs beyond free tiers.
- Multi-language UI (English only for now).

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Provider API changes / removed endpoints | Contract per provider, versioned adapters, alerts on failure |
| Provider rate limits / quotas | Caching, backoff, per-provider cooldowns, multiple sources |
| LLM cost from scanning many jobs | Cache keywords per posting hash, daily budgets, deterministic scoring |
| Duplicate/low-quality postings | Fingerprint dedupe, stale-window expiry, quality filters |
| Legal/ToS issues with scraping | Use official APIs/feeds only |
| Cross-user data leakage | Policies, scoped queries, tests for 403/404 boundaries |

---

## 13. Acceptance criteria (release)

1. A user can log in, upload a CV, and see ranked jobs from at least two providers.
2. Re-running the same CV + job produces an identical score.
3. The same posting from two providers appears once.
4. "Tailor for this job" opens the existing flow with the JD pre-filled and produces a downloadable PDF.
5. A saved search with alerts emails a user once per new matching posting.
6. A second user cannot read the first user's resume, matches, or downloads (HTTP 403/404).
7. Queue worker + scheduler run in production; failed jobs are retried and logged.
8. Existing tailor tests pass; new tests cover ingestion, dedupe, matching, and authorization.
9. `vendor/bin/pint --dirty` is clean and the full PHPUnit suite passes.

---

## 14. Environment additions

```dotenv
# Job sources
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ADZUNA_COUNTRY=gb
JOOBLE_API_KEY=
JOB_FEED_CACHE_TTL=900
JOB_STALE_AFTER_DAYS=14

# Matching
JOB_MATCH_BATCH_SIZE=50
JOB_ALERT_MIN_SCORE=70
JOB_ALERT_DAILY_LIMIT=5

# Queue / scheduler
QUEUE_CONNECTION=database
```
