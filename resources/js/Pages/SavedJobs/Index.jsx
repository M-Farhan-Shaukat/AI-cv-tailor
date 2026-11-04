import { Link, router } from '@inertiajs/react';
import React from 'react';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';

const formatDate = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const statusTone = {
    saved: 'secondary',
    applied: 'info',
    interviewing: 'warning',
    rejected: 'danger',
    offer: 'success',
};

export default function SavedJobsIndex({ savedJobs, statuses, seo }) {
    const updateStatus = (savedJob, status) => {
        router.patch(`/saved-jobs/${savedJob.id}`, { status }, { preserveScroll: true });
    };

    const remove = (savedJob) => {
        if (window.confirm(`Remove "${savedJob.job.title}" from your saved jobs?`)) {
            router.delete(`/saved-jobs/${savedJob.id}`, { preserveScroll: true });
        }
    };

    return (
        <MainLayout seo={seo}>
            <NavBar />

            <div className="container py-4 py-lg-5">
                <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
                    <div>
                        <h1 className="h4 fw-bold mb-1"><i className="bi bi-bookmark-star me-2" style={{ color: 'var(--rt-primary)' }}></i>Saved jobs</h1>
                        <p className="text-muted small mb-0">Track each application from saved through to offer.</p>
                    </div>
                    <Link href="/jobs" className="btn rt-btn-soft">
                        <i className="bi bi-search me-2"></i>Find more jobs
                    </Link>
                </div>

                {savedJobs.length === 0 ? (
                    <section className="rt-card p-5 text-center">
                        <i className="bi bi-bookmark" style={{ fontSize: '2rem', color: 'var(--rt-muted)' }}></i>
                        <h2 className="h6 fw-bold mt-3">No saved jobs yet</h2>
                        <p className="text-muted small mb-3">Save a posting from the job list to start tracking it here.</p>
                        <Link href="/jobs" className="btn rt-btn-primary">Browse jobs</Link>
                    </section>
                ) : (
                    <div className="d-grid gap-3">
                        {savedJobs.map((savedJob) => (
                            <article key={savedJob.id} className="rt-card p-3 p-sm-4">
                                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                                    <div className="flex-grow-1 min-w-0">
                                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                            <h2 className="h6 fw-bold mb-0">
                                                <Link href={savedJob.job.url} className="text-decoration-none" style={{ color: 'var(--rt-ink)' }}>
                                                    {savedJob.job.title}
                                                </Link>
                                            </h2>
                                            <span className={`badge text-bg-${statusTone[savedJob.status] || 'secondary'}`}>
                                                {statuses.find((status) => status.value === savedJob.status)?.label || savedJob.status}
                                            </span>
                                        </div>
                                        <div className="rt-job-meta">
                                            {savedJob.job.company && <span><i className="bi bi-building"></i>{savedJob.job.company}</span>}
                                            {savedJob.job.location && <span><i className="bi bi-geo-alt"></i>{savedJob.job.location}</span>}
                                            {savedJob.job.is_remote && <span><i className="bi bi-house-door"></i>Remote</span>}
                                            {savedJob.job.source && <span><i className="bi bi-broadcast"></i>{savedJob.job.source}</span>}
                                            {formatDate(savedJob.updated_at) && <span><i className="bi bi-clock"></i>Updated {formatDate(savedJob.updated_at)}</span>}
                                        </div>
                                    </div>

                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <label className="visually-hidden" htmlFor={`status-${savedJob.id}`}>Application status</label>
                                        <select
                                            id={`status-${savedJob.id}`}
                                            className="form-select form-select-sm rt-input"
                                            style={{ width: '11rem' }}
                                            value={savedJob.status}
                                            onChange={(event) => updateStatus(savedJob, event.target.value)}
                                        >
                                            {statuses.map((status) => (
                                                <option key={status.value} value={status.value}>{status.label}</option>
                                            ))}
                                        </select>
                                        <Link href={savedJob.job.url} className="btn btn-sm rt-btn-soft">View job</Link>
                                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(savedJob)}>
                                            <i className="bi bi-trash"></i>
                                            <span className="visually-hidden">Remove</span>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
