import { Link, router, useForm } from '@inertiajs/react';
import React from 'react';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary', 'internship'];

const label = (value) => value.replace('_', ' ');

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const filterSummary = (search) => {
    const filters = search.filters || {};
    const parts = [];

    if (search.query) {
        parts.push(`"${search.query}"`);
    }
    if (filters.location) {
        parts.push(filters.location);
    }
    if (filters.remote) {
        parts.push('Remote');
    }
    if (filters.employment_type) {
        parts.push(label(filters.employment_type));
    }
    if (filters.salary_min || filters.salary_max) {
        parts.push(`Salary ${filters.salary_min || '0'} - ${filters.salary_max || 'any'}`);
    }
    if (filters.posted_within_days) {
        parts.push(`Posted in last ${filters.posted_within_days} days`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'All active jobs';
};

export default function SavedSearchesIndex({ searches, defaultMinScore, seo }) {
    const form = useForm({
        name: '',
        query: '',
        location: '',
        remote: false,
        employment_type: '',
        salary_min: '',
        salary_max: '',
        posted_within_days: '',
        min_score: defaultMinScore,
        alerts_enabled: true,
    });

    const submit = (event) => {
        event.preventDefault();
        form.post('/saved-searches', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const toggleAlerts = (search, enabled) => {
        router.patch(`/saved-searches/${search.id}`, {
            name: search.name,
            query: search.query,
            filters: search.filters,
            min_score: search.min_score,
            alerts_enabled: enabled,
        }, { preserveScroll: true });
    };

    const runNow = (search) => {
        router.post(`/saved-searches/${search.id}/run`, {}, { preserveScroll: true });
    };

    const remove = (search) => {
        if (window.confirm(`Delete the saved search "${search.name}"?`)) {
            router.delete(`/saved-searches/${search.id}`, { preserveScroll: true });
        }
    };

    return (
        <MainLayout seo={seo}>
            <NavBar />

            <div className="container py-4 py-lg-5">
                <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
                    <div>
                        <h1 className="h4 fw-bold mb-1"><i className="bi bi-bell me-2" style={{ color: 'var(--rt-primary)' }}></i>Saved searches</h1>
                        <p className="text-muted small mb-0">We re-run these searches and email you when new jobs match.</p>
                    </div>
                    <Link href="/jobs" className="btn rt-btn-soft">
                        <i className="bi bi-search me-2"></i>Search jobs
                    </Link>
                </div>

                <div className="row g-4">
                    <div className="col-lg-5">
                        <section className="rt-card p-4">
                            <h2 className="h6 fw-bold mb-3"><i className="bi bi-plus-circle me-2"></i>New saved search</h2>
                            <form onSubmit={submit} className="d-grid gap-3">
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="saved-name">Name</label>
                                    <input id="saved-name" className="form-control rt-input" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Remote Laravel roles" />
                                    {form.errors.name && <small className="text-danger">{form.errors.name}</small>}
                                </div>
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="saved-query">Keywords</label>
                                    <input id="saved-query" className="form-control rt-input" value={form.data.query} onChange={(event) => form.setData('query', event.target.value)} placeholder="Laravel, backend..." />
                                </div>
                                <div className="row g-2">
                                    <div className="col-sm-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-location">Location</label>
                                        <input id="saved-location" className="form-control rt-input" value={form.data.location} onChange={(event) => form.setData('location', event.target.value)} placeholder="Berlin" />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-employment">Employment type</label>
                                        <select id="saved-employment" className="form-select rt-input" value={form.data.employment_type} onChange={(event) => form.setData('employment_type', event.target.value)}>
                                            <option value="">Any</option>
                                            {EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-2">
                                    <div className="col-sm-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-salary-min">Minimum salary</label>
                                        <input id="saved-salary-min" type="number" min="0" className="form-control rt-input" value={form.data.salary_min} onChange={(event) => form.setData('salary_min', event.target.value)} placeholder="50000" />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-salary-max">Maximum salary</label>
                                        <input id="saved-salary-max" type="number" min="0" className="form-control rt-input" value={form.data.salary_max} onChange={(event) => form.setData('salary_max', event.target.value)} placeholder="120000" />
                                    </div>
                                </div>
                                <div className="row g-2">
                                    <div className="col-sm-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-posted">Posted within</label>
                                        <select id="saved-posted" className="form-select rt-input" value={form.data.posted_within_days} onChange={(event) => form.setData('posted_within_days', event.target.value)}>
                                            <option value="">Any time</option>
                                            <option value="1">Last 24 hours</option>
                                            <option value="3">Last 3 days</option>
                                            <option value="7">Last 7 days</option>
                                            <option value="14">Last 14 days</option>
                                            <option value="30">Last 30 days</option>
                                        </select>
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-min-score">Minimum match</label>
                                        <div className="input-group">
                                            <input id="saved-min-score" type="number" min="0" max="100" className="form-control rt-input" value={form.data.min_score} onChange={(event) => form.setData('min_score', event.target.value)} />
                                            <span className="input-group-text">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-check">
                                    <input id="saved-remote" className="form-check-input" type="checkbox" checked={form.data.remote} onChange={(event) => form.setData('remote', event.target.checked)} />
                                    <label className="form-check-label small" htmlFor="saved-remote">Remote only</label>
                                </div>
                                <div className="form-check">
                                    <input id="saved-alerts" className="form-check-input" type="checkbox" checked={form.data.alerts_enabled} onChange={(event) => form.setData('alerts_enabled', event.target.checked)} />
                                    <label className="form-check-label small" htmlFor="saved-alerts">Email me when new jobs match</label>
                                </div>
                                <button className="btn rt-btn-primary" type="submit" disabled={form.processing}>
                                    {form.processing ? 'Saving...' : 'Save search'}
                                </button>
                            </form>
                        </section>
                    </div>

                    <div className="col-lg-7">
                        {searches.length === 0 ? (
                            <section className="rt-card p-5 text-center">
                                <i className="bi bi-bell-slash" style={{ fontSize: '2rem', color: 'var(--rt-muted)' }}></i>
                                <h2 className="h6 fw-bold mt-3">No saved searches yet</h2>
                                <p className="text-muted small mb-0">Create one here, or save your current filters from the jobs page.</p>
                            </section>
                        ) : (
                            <div className="d-grid gap-3">
                                {searches.map((search) => (
                                    <article key={search.id} className="rt-card p-3 p-sm-4">
                                        <div className="d-flex flex-wrap justify-content-between gap-2">
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                    <h2 className="h6 fw-bold mb-0">{search.name}</h2>
                                                    <span className="badge text-bg-light border">Min {search.min_score}%</span>
                                                    {!search.alerts_enabled && <span className="badge text-bg-secondary">Alerts off</span>}
                                                </div>
                                                <p className="text-muted small mb-1">{filterSummary(search)}</p>
                                                <small className="text-muted">
                                                    {search.last_run_at ? `Last run ${formatDateTime(search.last_run_at)}` : 'Never run'}
                                                </small>
                                            </div>
                                            <div className="d-flex flex-wrap align-items-start gap-2">
                                                <button type="button" className="btn btn-sm rt-btn-soft" onClick={() => runNow(search)}>
                                                    <i className="bi bi-play-fill me-1"></i>Run now
                                                </button>
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(search)}>
                                                    <i className="bi bi-trash"></i>
                                                    <span className="visually-hidden">Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-check form-switch mt-3 mb-0">
                                            <input
                                                id={`alerts-${search.id}`}
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                checked={search.alerts_enabled}
                                                onChange={(event) => toggleAlerts(search, event.target.checked)}
                                            />
                                            <label className="form-check-label small" htmlFor={`alerts-${search.id}`}>Email alerts</label>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
