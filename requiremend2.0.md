# Requirements — AI Resume Tailor & Career Platform

**Version:** 1.0  
**Status:** Proposed  
**Last Updated:** 4 November 2026

---

## 1. Product Overview

An AI-powered Resume Tailoring and Career Platform that helps job seekers analyze their resumes against job descriptions, improve resume content, discover relevant jobs, and manage their job applications.

The platform must prioritize accuracy, explainability, privacy, and truthful representation of candidate experience.

### 1.1 Product Goals

- Help users create job-specific, ATS-friendly resumes.
- Provide explainable resume-to-job compatibility scores.
- Improve resume content without inventing candidate experience.
- Support PDF and DOCX resume exports.
- Provide job discovery and personalized recommendations.
- Help users organize and track job applications.
- Provide reliable AI processing with controlled API usage and costs.

### 1.2 Core Principles

1. Never invent skills, experience, achievements, certifications, or metrics.
2. Every important recommendation should be supported by resume evidence.
3. ATS scores must be presented as internal compatibility estimates, not guaranteed hiring outcomes.
4. Users must remain in control of all AI-generated resume changes.
5. Personal information and uploaded documents must remain secure.

---

## 2. Resume Management

### 2.1 Resume Upload and Parsing

**Priority: P0**

- Allow users to upload PDF and DOCX resumes.
- Extract text and relevant document structure.
- Identify common sections:
  - Contact Information
  - Professional Summary
  - Work Experience
  - Education
  - Technical Skills
  - Certifications
  - Projects
  - Achievements
- Validate file types and file sizes.
- Display extracted content for user review.
- Allow users to edit incorrectly extracted information.
- Handle malformed, password-protected, and unsupported documents gracefully.

### 2.2 OCR Support

**Priority: P0**

- Support scanned and image-based PDF resumes.
- Detect when normal text extraction produces insufficient content.
- Use OCR as a fallback.
- Allow users to review OCR-extracted content before using it.

### 2.3 Resume Library

**Priority: P1**

- Allow users to maintain multiple resumes.
- Organize resumes by job role, industry, or career path.
- Allow users to rename, edit, duplicate, and delete resumes.
- Maintain resume version history.
- Allow users to restore previous versions.
- Compare two resume versions and highlight changes.
- Associate tailored resume versions with specific job applications.

---

## 3. Job Description Analysis

**Priority: P0**

Allow users to paste or enter a job description.

The system should extract:

- Job title
- Company name, when available
- Job responsibilities
- Required technical skills
- Preferred technical skills
- Soft skills
- Education requirements
- Experience requirements
- Certifications
- Important keywords

### Additional Requirements

- Distinguish mandatory and preferred qualifications.
- Identify technical synonyms and related terminology.
- Detect ambiguous or incomplete job descriptions.
- Allow users to edit extracted job requirements.
- Preserve the original job description for reference.

---

## 4. Advanced ATS Compatibility Analysis

**Priority: P0 / P1**

Develop an explainable resume-to-job matching engine.

### 4.1 Compatibility Score

The system should calculate a compatibility score between a resume and a job description using documented and testable rules.

**Proposed scoring dimensions:**

| Category | Weight |
|---|---:|
| Keyword and Skill Alignment | 35% |
| Relevant Experience Alignment | 25% |
| Job Title Alignment | 15% |
| Resume Structure and Readability | 15% |
| Contact and Profile Completeness | 10% |
| **Total** | **100%** |

These weights are proposed starting values, not an industry-standard ATS formula. They must be validated against a representative dataset.

### 4.2 Keyword Matching

- Identify exact keyword matches.
- Identify partial keyword matches.
- Identify missing keywords.
- Support semantic keyword matching.
- Recognize equivalent technical terminology.

Example:

- REST API
- RESTful Services
- REST API Development

The system should recognize relevant equivalence without treating unrelated terms as matches.

### 4.3 Experience Matching

- Analyze relevant work experience.
- Identify experience related to job responsibilities.
- Evaluate job-title alignment.
- Identify missing experience requirements.
- Distinguish missing experience from experience that is present but poorly described.

### 4.4 Advanced ATS Diagnostics

**Priority: P1**

- Identify missing qualifications.
- Identify weak resume sections.
- Detect formatting problems.
- Analyze bullet-point quality.
- Detect excessive keyword repetition.
- Identify missing measurable achievements where relevant.
- Provide recommendations for improving resume readability.
- Generate a parser-oriented preview showing how resume content may be extracted.
- Explain why points were awarded or deducted.

### 4.5 Score Transparency

- Explain every scoring category.
- Show matched and missing requirements.
- Link matches to supporting resume content.
- Show the impact of accepted changes on the compatibility estimate.
- Version the scoring model.

**Important:** The compatibility score must never be marketed as a guarantee of passing an employer's ATS or getting an interview.

---

## 5. AI Resume Tailoring

**Priority: P0**

Allow users to tailor their resumes against specific job descriptions.

### 5.1 Intelligent Resume Rewriting

- Rewrite professional summaries.
- Improve work experience descriptions.
- Improve bullet points.
- Use relevant action verbs.
- Improve sentence clarity and professionalism.
- Prioritize relevant experience.
- Align resume terminology with the job description.
- Maintain a professional and consistent writing style.

### 5.2 Evidence-Based AI Generation

**Critical Requirement**

The AI must not fabricate:

- Skills
- Employment history
- Company names
- Job titles
- Employment dates
- Responsibilities
- Certifications
- Achievements
- Performance metrics
- Project details

If a suggested achievement or metric is not supported by the source resume, the system must ask the user to confirm it.

### 5.3 Before and After Comparison

**Priority: P0**

- Show original and AI-generated content side by side.
- Highlight modified sentences and bullet points.
- Allow users to accept individual suggestions.
- Allow users to reject individual suggestions.
- Allow users to manually edit suggestions.
- Preserve the original resume.
- Recalculate the compatibility score after accepted changes.

### 5.4 Bullet Point Optimizer

**Priority: P1**

Analyze and improve individual resume bullet points.

Evaluate:

- Action verbs
- Technical relevance
- Clarity
- Conciseness
- Business impact
- Measurable results, when supported by evidence

Example:

Original:

"Worked on APIs using Laravel."

Improved:

"Developed and maintained RESTful APIs using Laravel to support application functionality and system integrations."

The system must not add unsupported metrics or achievements.

### 5.5 Skill Gap Analysis

**Priority: P1**

- Identify skills required by the job but not demonstrated in the resume.
- Separate missing skills from skills that may be present under different terminology.
- Suggest relevant learning areas.
- Allow users to confirm additional skills supported by their actual experience.
- Never automatically insert unverified skills.

### 5.6 Additional AI Features

**Priority: P1 / P2**

- Professional summary generator.
- Multiple resume writing styles.
- Job-specific cover letter generator.
- Achievement description improvement.
- Resume language and grammar improvement.
- Resume tone adjustment.
- Job-specific keyword recommendations.
- Resume comparison.
- Career skill gap recommendations.

---

## 6. Resume Templates and Export

### 6.1 ATS-Friendly Templates

**Priority: P1**

- Provide multiple professional resume templates.
- Support different industries and job roles.
- Prioritize simple, readable layouts.
- Avoid unnecessary graphical elements that may affect parsing.
- Maintain consistent spacing and typography.

### 6.2 PDF Export

**Priority: P0**

- Generate downloadable PDF resumes.
- Preserve formatting and layout.
- Ensure text remains selectable.
- Support multiple pages.
- Validate generated PDF files.
- Provide a final preview before downloading.

### 6.3 DOCX Export

**Priority: P0**

- Generate editable Microsoft Word documents.
- Preserve headings, bullet points, spacing, and formatting.
- Ensure compatibility with common Word processors.
- Allow users to edit the document after downloading.

### 6.4 Export Quality Assurance

- Test different resume lengths.
- Test long job titles and company names.
- Test multi-page resumes.
- Test special characters.
- Test different template configurations.
- Maintain PDF and DOCX regression tests.

---

## 7. Job Discovery and Recommendations

**Priority: P0 / P1**

Develop a job discovery module using configured external job providers.

### 7.1 Job Search

Allow users to search by:

- Job title
- Technical skills
- Keywords
- Company
- Location
- Experience level
- Remote, hybrid, and onsite preferences

### 7.2 Job Aggregation

- Integrate configured job APIs.
- Normalize job data from different providers.
- Display original job source.
- Provide links to original job listings.
- Respect provider API limits and terms.
- Handle unavailable providers gracefully.
- Deduplicate identical job listings.

### 7.3 Job Freshness

**Priority: P1**

- Show publication date.
- Show last verification date.
- Identify potentially expired listings.
- Identify unavailable job links where possible.
- Display job freshness indicators.
- Avoid presenting old jobs as newly published.

### 7.4 Job Matching

**Priority: P1**

- Compare job requirements against the user's selected resume.
- Calculate a job compatibility estimate.
- Explain matching skills.
- Identify missing requirements.
- Recommend relevant jobs.
- Allow users to select which resume to use for matching.

### 7.5 Additional Job Features

**Priority: P2**

- Salary normalization.
- Company profiles.
- Remote-job classification.
- Job quality indicators.
- Saved job searches.
- Job alerts.
- Personalized recommendations.
- Job recommendations based on previous searches.

---

## 8. Job Application Management

**Priority: P0 / P1**

Develop an application tracking system.

### 8.1 Application Tracking

Users should be able to:

- Save jobs.
- Mark jobs as applied.
- Track interview stages.
- Mark applications as rejected.
- Record job offers.

Supported statuses:

1. Saved
2. Applied
3. Interviewing
4. Rejected
5. Offer

### 8.2 Application Information

Store:

- Company name
- Job title
- Job URL
- Application date
- Recruiter information
- Contact details
- Resume version used
- Application status
- Personal notes

### 8.3 Interview Management

**Priority: P1 / P2**

- Add interview notes.
- Store interview dates.
- Add follow-up notes.
- Set reminders.
- Track interview stages.
- Prepare interview questions using the job description.
- Generate role-specific interview preparation material.

### 8.4 Application Analytics

**Priority: P2**

Provide an application dashboard showing:

- Total applications.
- Applications by status.
- Interview conversion rate.
- Rejection count.
- Offers received.
- Applications over time.
- Response rate.

The platform must not automatically submit applications without explicit user authorization.

---

## 9. Asynchronous AI Processing

**Priority: P0**

Long-running AI operations and document generation should run through background queues.

### 9.1 Processing Workflow

1. User submits a tailoring request.
2. Server validates the request.
3. Server creates a unique request ID.
4. Server dispatches a background job.
5. Worker extracts and analyzes resume content.
6. Worker analyzes the job description.
7. Worker performs keyword matching.
8. AI generates proposed resume improvements.
9. Evidence validation checks generated content.
10. The system calculates the compatibility estimate.
11. The system generates PDF/DOCX documents.
12. Results are saved.
13. Frontend retrieves the final result.

### 9.2 Request States

Use explicit processing states:

- `queued`
- `processing`
- `completed`
- `failed`
- `cancelled`

### 9.3 Reliability Requirements

- Generate a unique ID for each tailoring request.
- Prevent duplicate submissions using idempotency controls.
- Use bounded retries with backoff.
- Handle AI-provider timeouts.
- Handle API rate limits.
- Record permanent failures.
- Provide actionable error messages.
- Support controlled recovery of failed jobs.
- Provide an admin view for failed jobs.
- Use provider circuit breakers where appropriate.

### 9.4 Frontend Processing Experience

- Display request status.
- Show progress stages where practical.
- Allow users to leave the page and return later.
- Retrieve completed results.
- Display retry options for recoverable failures.
- Prevent accidental duplicate submissions.

---

## 10. Privacy and Security

**Priority: P0**

### 10.1 File Security

- Validate uploaded file types.
- Enforce file-size limits.
- Store private files securely.
- Prevent direct public access to uploaded resumes.
- Authorize every file download.
- Reject suspicious or malformed documents.

### 10.2 Data Privacy

- Disclose when resume content is sent to external AI providers such as Groq.
- Explain what data is shared and why.
- Document applicable third-party data retention terms.
- Define retention periods for uploaded files and generated results.
- Allow users to delete resumes.
- Allow users to request account deletion.
- Remove associated personal data according to the documented deletion policy.

### 10.3 Application Security

- Enforce server-side authorization.
- Protect against SQL injection.
- Protect against XSS and CSRF.
- Apply API rate limits.
- Secure password handling.
- Store API keys in environment configuration.
- Use HTTPS in production.
- Avoid storing sensitive resume content in application logs.

### 10.4 Backup and Recovery

**Priority: P1**

- Maintain protected database backups.
- Define backup retention.
- Test restoration procedures.
- Protect backups using access controls.
- Document recovery procedures.

---

## 11. Performance and Scalability

**Priority: P0 / P1**

- Use queues for long-running operations.
- Scale queue workers independently.
- Review database indexes.
- Use Redis for queues and caching where appropriate.
- Cache safe and repeatable AI operations.
- Monitor AI-provider latency.
- Monitor queue wait times.
- Monitor PDF/DOCX generation duration.
- Prevent cross-user data leakage through caching.
- Handle provider failures without taking down unrelated application features.

---

## 12. Admin Dashboard and Monitoring

**Priority: P0 / P1**

The admin dashboard should provide:

### 12.1 Usage Metrics

- Total registered users.
- Active users.
- Resume uploads.
- Resume scans.
- Completed tailoring requests.
- Failed tailoring requests.
- PDF downloads.
- DOCX downloads.
- Job searches.
- Saved jobs.

### 12.2 AI Usage Monitoring

- Total AI requests.
- Token usage.
- Estimated API costs.
- Provider response time.
- Provider errors.
- Rate-limit events.
- Failed requests.

### 12.3 Background Job Monitoring

- Queued jobs.
- Processing jobs.
- Completed jobs.
- Failed jobs.
- Retry counts.
- Failure reasons.
- Job processing duration.

### 12.4 Security

- Role-based admin access.
- Audit logs for administrative actions.
- No unnecessary exposure of users' resume content.

---

## 13. Analytics and Product Metrics

Track the following metrics to evaluate product quality:

| Metric | Definition |
|---|---|
| Resume Upload Completion | Successful uploads / valid upload attempts |
| Tailoring Success Rate | Completed requests / valid tailoring requests |
| Average Processing Time | Time from accepted request to completion or failure |
| Queue Wait Time | Time from request creation to worker start |
| Score Improvement | Difference between original and tailored compatibility estimates |
| Export Conversion | Completed tailoring sessions resulting in a document download |
| Job Search Engagement | Searches, saved jobs, and alert interactions |
| Returning User Rate | Users returning within a defined reporting period |
| AI Cost per Successful Tailoring | Estimated provider cost / completed tailoring requests |
| Provider Reliability | Error rate, timeout rate, and latency by provider |

Analytics must not imply that a higher compatibility estimate guarantees interviews or employment.

---

## 14. Monetization and Subscription Plans

**Priority: P3 — Future**

Monetization should be introduced after validating product usage, retention, and AI operating costs.

### 14.1 Free Plan

Potential features:

- Limited resume scans.
- Limited AI tailoring requests.
- Basic resume management.
- Limited job discovery.
- Standard PDF export.

### 14.2 Pro Plan

Potential features:

- Higher AI usage limits.
- Resume version history.
- Advanced ATS diagnostics.
- DOCX export.
- Premium templates.
- Cover letter generation.
- Interview preparation.
- Advanced job alerts.
- Application analytics.

### 14.3 Business / Recruiter Plan

Future features:

- Team workspaces.
- Candidate review workflows.
- Shared templates.
- Role-specific evaluation criteria.
- Administrative usage controls.

Requirements:

- Display usage limits clearly.
- Never charge users without explicit consent.
- Provide a clear subscription cancellation process.
- Define billing and payment requirements in a separate specification.

---

## 15. Non-Functional Requirements

### 15.1 Usability

- Make the main workflow understandable without ATS expertise.
- Explain scores in simple language.
- Provide clear validation and error messages.
- Support desktop and mobile layouts.
- Keep important actions easy to discover.

### 15.2 Accessibility

- Accessible form labels.
- Keyboard-accessible controls.
- Adequate color contrast.
- Clear focus indicators.
- Do not communicate status through color alone.

### 15.3 Maintainability

- Keep business logic in testable services.
- Version AI prompts.
- Version scoring rules.
- Isolate external providers behind service interfaces.
- Use environment-based configuration.
- Maintain clear API validation and error contracts.

### 15.4 Observability

- Structured application logs.
- Request and job correlation IDs.
- Queue monitoring.
- Database health monitoring.
- AI-provider monitoring.
- Alerts for sustained failures and resource exhaustion.

---

## 16. Testing Requirements

### 16.1 Unit Tests

- ATS scoring calculations.
- Keyword normalization.
- Semantic matching rules.
- Evidence validation.
- Resume section detection.
- Job deduplication.
- Application status transitions.

### 16.2 Feature Tests

- Authentication.
- Authorization.
- Resume upload.
- Resume parsing.
- Job description submission.
- ATS analysis.
- AI tailoring.
- PDF export.
- DOCX export.
- Job search.
- Saved jobs.
- Application tracking.
- Account and resume deletion.

### 16.3 Integration Tests

- AI provider success.
- Invalid AI responses.
- Provider timeouts.
- Rate-limit responses.
- Retry behavior.
- Queue processing.
- Duplicate submissions.
- Failed-job recovery.

### 16.4 Document Regression Tests

Test:

- Single-page resumes.
- Multi-page resumes.
- Long job titles.
- Long company names.
- Special characters.
- Multiple experience entries.
- Different templates.
- PDF text extraction.
- DOCX readability.

### 16.5 Security Tests

- Cross-user resource access.
- Unauthorized file downloads.
- Malicious file uploads.
- Rate-limit enforcement.
- Admin authorization.
- Sensitive information in logs.

---

## 17. Delivery Roadmap

### Phase 0 — Production Foundation (P0)

- [ ] Implement asynchronous tailoring.
- [ ] Add unique request IDs and idempotency.
- [ ] Implement explicit processing states.
- [ ] Add bounded retries and failed-job recovery.
- [ ] Implement DOCX export.
- [ ] Add resume version history.
- [ ] Add evidence validation.
- [ ] Add privacy disclosures.
- [ ] Implement data retention and deletion workflows.
- [ ] Add PDF/DOCX regression tests.
- [ ] Add queue and AI-provider monitoring.

### Phase 1 — ATS Quality and Differentiation (P1)

- [ ] Semantic keyword matching.
- [ ] Experience relevance analysis.
- [ ] Qualification gap diagnostics.
- [ ] Parser-oriented resume preview.
- [ ] Resume formatting diagnostics.
- [ ] Bullet point optimizer.
- [ ] Before/after content comparison.
- [ ] ATS-friendly templates.
- [ ] Cover letter generation.
- [ ] Job match explanations.
- [ ] Job listing freshness indicators.

### Phase 2 — Career Workflow and Engagement (P2)

- [ ] Interview preparation.
- [ ] Application notes.
- [ ] Follow-up reminders.
- [ ] Application analytics.
- [ ] Company profiles.
- [ ] Improved job recommendations.
- [ ] Saved-search alerts.
- [ ] Advanced resume comparison.
- [ ] Writing-style options.

### Phase 3 — Growth and Monetization (P3)

- [ ] Validate AI cost per successful workflow.
- [ ] Validate free-plan usage limits.
- [ ] Introduce Free and Pro plans if metrics support them.
- [ ] Add subscription and billing workflows.
- [ ] Explore recruiter/business workspaces.
- [ ] Consider a public API after core platform stability.

---

## 18. Recommended Implementation Order

The following order is recommended to reduce risk and deliver value early:

1. **DOCX export and resume version history** — improves practical usability and protects users' work.
2. **Evidence validation** — prevents fabricated content and protects product trust.
3. **Asynchronous tailoring** — improves reliability and user experience for long AI operations.
4. **Advanced ATS diagnostics** — improves product differentiation and makes scores more useful.
5. **Parser preview and formatting diagnostics** — helps users understand document readability.
6. **Cover letter and interview preparation** — expands the career workflow.
7. **Application tracking improvements** — increases repeat usage.
8. **Job freshness and recommendation improvements** — improves job discovery quality.
9. **Monetization** — only after validating usage, retention, and costs.

---

## 19. Definition of Done

A feature is considered complete when:

- Its behavior matches the approved requirement.
- Server-side validation and authorization are implemented.
- Relevant automated tests pass.
- Errors and edge cases are handled.
- Privacy and security implications are reviewed.
- Documentation and configuration examples are updated.
- Monitoring is added when background processing or external providers are involved.

---

## 20. Open Technical Decisions

The following decisions must be finalized before implementing the related features:

- OCR engine/service and its cost/privacy implications.
- PDF and DOCX generation libraries.
- Retention periods for uploaded files, extracted text, and generated results.
- Initial job providers and supported regions.
- Cross-provider job deduplication strategy.
- Representative dataset for validating ATS scoring.
- Queue and cache infrastructure for each deployment environment.
- Features included in Free versus Pro plans.
- Notification channels for job alerts and reminders.
- Monitoring and error-reporting tools.

---

## 21. Final Product Principles

1. **Truth over score:** Never add unsupported information to improve a compatibility score.
2. **Evidence first:** Important matches and recommendations must be traceable to candidate-provided information.
3. **Explainability:** Users must understand how scores and recommendations are produced.
4. **Privacy by design:** Minimize third-party data sharing and define retention/deletion behavior.
5. **Reliable processing:** Use background jobs, idempotency, bounded retries, and observable failures.
6. **Cost awareness:** Apply quotas, rate limits, caching, and provider-usage monitoring.
7. **Incremental delivery:** Stabilize core workflows before expanding into monetization or recruiter features.
"""
path = Path("/mnt/data/REQUIREMENTS.md")
path.write_text(content, encoding="utf-8")
print(f"Created {path} ({path.stat().st_size:,} bytes)")

