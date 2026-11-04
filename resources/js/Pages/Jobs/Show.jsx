import { Link, router, usePage } from '@inertiajs/react';
import React from 'react';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';

const BREAKDOWN_ORDER = ['keywords', 'job_title', 'sections', 'contact'];

const scoreTone = (score) => (score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger');
const toneColor = { success: 'var(--rt-success)', warning: 'var(--rt-warning)', danger: 'var(--rt-danger)' };

const formatDate = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatSalary = (job) => {
    if (!job.salary_min && !job.salary_max) {
        return null;
    }
    const amount = (value) => value?.toLocaleString();
    const currency = job.currency ? `${job.currency} ` : '';
    if (job.salary_min && job.salary_max) {
        return `${currency}${amount(job.salary_min)} - ${amount(job.salary_max)}`;
    }
    return `${currency}${amount(job.salary_min || job.salary_max)}`;
};

function MatchPanel({ match, backUrl }) {
    if (!match) {
        return (
            <section className="rt-card p-4 h-100">
                <h2 className="rt-card-title mb-2"><i className="bi bi-speedometer2"></i>Your match</h2>
                <p className="text-muted small mb-3">
                    Upload your CV on the jobs page to see how well you match this role before you apply.
                </p>
                <Link href={backUrl} className="btn rt-btn-primary w-100">
                    <i className="bi bi-radar me-2"></i>Scan this job
                </Link>
            </section>
        );
    }

    const tone = scoreTone(match.score);

    return (
        <section className="rt-card h-100">
            <div className="p-4 rt-card-body">
                <h2 className="rt-card-title mb-3"><i className="bi bi-speedometer2"></i>Your match</h2>

                <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="rt-match-score" style={{ color: toneColor[tone] }}>
                        {match.score}<span>%</span>
                    </div>
                    <div>
                        <div className="fw-semibold">{match.matched_count} of {match.matched_count + match.missing_count} keywords</div>
                        <div className="text-muted small">
                            {match.required_total > 0
                                ? `${match.required_matched}/${match.required_total} required keywords matched`
                                : 'No required keywords identified'}
                        </div>
                    </div>
                </div>

                {match.breakdown && Object.keys(match.breakdown).length > 0 && (
                    <div className="mb-3">
                        {BREAKDOWN_ORDER.filter((key) => match.breakdown[key]).map((key) => {
                            const metric = match.breakdown[key];
                            const metricTone = scoreTone(metric.score);
                            return (
                                <div key={key} className="rt-metric">
                                    <div className="d-flex justify-content-between align-items-center mb-1 gap-2">
                                        <span className="fw-semibold small">{metric.label} <span className="rt-weight ms-1">{metric.weight}%</span></span>
                                        <span className="small fw-semibold" style={{ color: toneColor[metricTone] }}>{metric.score}</span>
                                    </div>
                                    <div className="rt-bar">
                                        <span style={{ width: `${metric.score}%`, background: toneColor[metricTone] }}></span>
                                    </div>
                                    <small className="text-muted d-block mt-1">{metric.detail}</small>
                                </div>
                            );
                        })}
                    </div>
                )}

                {match.matched?.length > 0 && (
                    <div className="mb-3">
                        <div className="rt-filter-label mb-2">Matched keywords</div>
                        <div className="d-flex flex-wrap gap-2">
                            {match.matched.map((keyword) => (
                                <span key={keyword.term} className={`rt-chip rt-chip-success ${keyword.importance === 'required' ? 'rt-chip-required' : ''}`}>
                                    {keyword.term}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {match.missing?.length > 0 && (
                    <div>
                        <div className="rt-filter-label mb-2">Missing keywords</div>
                        <div className="d-flex flex-wrap gap-2">
                            {match.missing.map((keyword) => (
                                <span key={keyword.term} className={`rt-chip rt-chip-danger ${keyword.importance === 'required' ? 'rt-chip-required' : ''}`}>
                                    {keyword.term}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default function JobShow({ job, match, tailorUrl, backUrl, seo }) {
    const user = usePage().props.auth?.user;
    const tone = match ? scoreTone(match.score) : 'muted';
    const salary = formatSalary(job);
    const posted = formatDate(job.posted_at);

    const toggleSaved = () => {
        if (!user) {
            router.get('/login');
            return;
        }

        if (job.saved) {
            router.delete(`/saved-jobs/${job.saved.id}`, { preserveScroll: true });
        } else {
            router.post(`/jobs/${job.id}/save`, {}, { preserveScroll: true });
        }
    };

    return (
        <MainLayout seo={seo}>
<NavBar />

            <div className="container py-4 py-lg-5">
                <Link href={backUrl} className="rt-nav-link d-inline-flex align-items-center gap-1 mb-3">
                    <i className="bi bi-arrow-left"></i> All jobs
                </Link>

                <section className="rt-card p-4 p-lg-5 mb-4">
                    <div className="d-flex flex-column flex-lg-row justify-content-between gap-4">
                        <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                <span className={`rt-job-score rt-job-score-${tone} rt-job-score-inline`}>
                                    {match ? match.score : '—'}
                                    <small>{match ? 'match' : 'n/a'}</small>
                                </span>
                                <span className="badge text-bg-light border text-uppercase">{job.source}</span>
                                {job.is_remote && <span className="badge text-bg-success">Remote</span>}
                            </div>
                            <h1 className="h3 fw-bold mb-1">{job.title}</h1>
                            <div className="rt-job-meta">
                                {job.company && <span><i className="bi bi-building"></i>{job.company}</span>}
                                {job.location && <span><i className="bi bi-geo-alt"></i>{job.location}</span>}
                                {job.employment_type && <span><i className="bi bi-clock-history"></i>{job.employment_type.replace('_', ' ')}</span>}
                                {posted && <span><i className="bi bi-calendar3"></i>Posted {posted}</span>}
                                {salary && <span><i className="bi bi-cash"></i>{salary}</span>}
                            </div>
                        </div>
                        <div className="d-flex flex-column gap-2 flex-shrink-0" style={{ minWidth: '14rem' }}>
                            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-success rt-btn-success">
                                <i className="bi bi-box-arrow-up-right me-2"></i>Apply on {job.source}
                            </a>
                            <Link href={tailorUrl} className="btn rt-btn-primary">
                                <i className="bi bi-magic me-2"></i>Tailor my resume
                            </Link>
                            <button type="button" className={`btn ${job.saved ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={toggleSaved}>
                                <i className={`bi ${job.saved ? 'bi-bookmark-fill' : 'bi-bookmark'} me-2`}></i>
                                {job.saved ? 'Saved' : 'Save job'}
                            </button>
                        </div>
                    </div>
                </section>

                <div className="row g-4">
                    <div className="col-lg-7">
                        <section className="rt-card p-4 p-lg-5">
                            <h2 className="rt-card-title mb-3"><i className="bi bi-file-text"></i>Job description</h2>
                            <div className="rt-job-description">{job.description}</div>
                        </section>
                    </div>
                    <div className="col-lg-5">
                        <MatchPanel match={match} backUrl={backUrl} />
                    </div>
                </div>
            </div>

            <footer className="rt-footer mt-auto py-4">
                <div className="container d-flex flex-column flex-sm-row justify-content-between gap-2 text-center text-sm-start">
                    <span>&copy; {new Date().getFullYear()} ResumeTailor AI</span>
                    <span>Job listing sourced from {job.source}. Always verify details on the original posting.</span>
                </div>
            </footer>
        </MainLayout>
    );
}
