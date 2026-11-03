# AI Resume Tailor & ATS — System Overview

**Version:** 1.0
**Last updated:** 2026-11-03

---

## 1. What it is

A Laravel + React (Inertia) web application that helps a job seeker **tailor one resume to one specific job description** and see how well it will pass an Applicant Tracking System (ATS).

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
- Guest-friendly: no account required to try the tailor.
- Each result gets a random 48-character **access token**; downloads/refines are allowed for the owning session **or** a valid token (`hash_equals` comparison).
- Rate limiting: **20 requests/minute** per session/IP.
- Long-running requests allow up to 180 seconds but are bounded by HTTP timeouts and retries.

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
| GET | `/download/{tailoredResume}` | `resume.download` | PDF download (session or `?token=`) |

---

## 7. Data model

### `tailored_resumes`
| Column | Purpose |
|---|---|
| `session_id` | Guest ownership |
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

The default `users`, `sessions`, `jobs`, and `cache` tables exist but are currently unused by the tailor flow (no auth yet).

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
| `QUEUE_CONNECTION` | `database` (not yet used by tailor) |
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
- Run: `php artisan test --compact <path>` or `vendor/bin/phpunit`.
- Note: feature tests need the SQLite PDO driver (`pdo_sqlite`); without it they error with "could not find driver".

---

## 10. Current limitations

- **One job at a time** — no job discovery, scanning, ranking, or saved searches.
- **No accounts** — guest sessions + tokens only; no resume library.
- **Synchronous LLM calls** — requests can take up to ~3 minutes; no queue.
- **No OCR** — scanned/image PDFs are rejected.
- **Free-tier LLM budget** — long resumes/JDs may be trimmed or rate-limited.
- **No caching** — the same JD is re-analyzed on each run.
- **No admin/monitoring** for provider or AI usage.

The planned job-scanning extension is specified in `REQUIREMENTS-JOB-SCAN.md`.

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
