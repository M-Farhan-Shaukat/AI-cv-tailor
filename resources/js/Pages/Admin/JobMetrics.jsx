import { Link, router } from '@inertiajs/react';
import React from 'react';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';

const number = (value) => Number(value || 0).toLocaleString();

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? null
        : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const providerTone = (provider) => {
    if (provider.cooling_down_until && new Date(provider.cooling_down_until) > new Date()) {
        return { label: 'Cooling down', className: 'text-bg-danger' };
    }
    if (provider.consecutive_failures > 0) {
        return { label: 'Degraded', className: 'text-bg-warning' };
    }
    if (provider.last_success_at) {
        return { label: 'Healthy', className: 'text-bg-success' };
    }
    return { label: 'Never synced', className: 'text-bg-secondary' };
};

function UsageCard({ label, value, hint }) {
    return (
        <div className="rt-card p-3 h-100">
            <div className="rt-filter-label mb-1">{label}</div>
            <div className="h4 fw-bold mb-1">{value}</div>
            <div className="text-muted small">{hint}</div>
        </div>
    );
}

export default function JobMetrics({ providers, sourceEvents, usage, budgets, generatedAt, seo }) {
    const today = usage?.today ?? {};

    return (
        <MainLayout seo={seo}>
            <NavBar />

            <div className="container py-4 py-lg-5">
                <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
                    <div>
                        <h1 className="h4 fw-bold mb-1"><i className="bi bi-activity me-2" style={{ color: 'var(--rt-primary)' }}></i>Job scan operations</h1>
                        <p className="text-muted small mb-0">
                            Provider health, feed sync history and AI usage.
                            {generatedAt && <span> Updated {formatDateTime(generatedAt)}.</span>}
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <button type="button" className="btn rt-btn-soft" onClick={() => router.reload({ only: ['providers', 'sourceEvents', 'usage', 'generatedAt'] })}>
                            <i className="bi bi-arrow-clockwise me-2"></i>Refresh
                        </button>
                        <Link href="/jobs" className="btn rt-btn-soft">View jobs</Link>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    <div className="col-6 col-lg-3">
                        <UsageCard label="AI requests today" value={number(today.requests)} hint="Across all users" />
                    </div>
                    <div className="col-6 col-lg-3">
                        <UsageCard label="Tokens today" value={number(today.tokens)} hint={`Limit ${number(budgets.daily_token_limit)}`} />
                    </div>
                    <div className="col-6 col-lg-3">
                        <UsageCard label="AI failures today" value={number(today.failures)} hint="Provider or response errors" />
                    </div>
                    <div className="col-6 col-lg-3">
                        <UsageCard label="Estimated cost today" value={`$${Number(today.estimated_cost || 0).toFixed(4)}`} hint="Configured token rates" />
                    </div>
                </div>

                <section className="rt-card p-3 p-lg-4 mb-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
                        <div>
                            <h2 className="h6 fw-bold mb-1">Providers</h2>
                            <p className="text-muted small mb-0">Active postings and the last successful sync for each source.</p>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                            <thead>
                                <tr className="text-muted small">
                                    <th scope="col">Provider</th>
                                    <th scope="col">Status</th>
                                    <th scope="col" className="text-end">Active postings</th>
                                    <th scope="col">Last sync</th>
                                    <th scope="col">Last error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {providers.map((provider) => {
                                    const tone = providerTone(provider);
                                    return (
                                        <tr key={provider.name}>
                                            <td className="fw-semibold text-capitalize">{provider.name}</td>
                                            <td>
                                                <span className={`badge ${tone.className}`}>{tone.label}</span>
                                                {provider.cooling_down_until && (
                                                    <div className="text-muted small mt-1">Until {formatDateTime(provider.cooling_down_until)}</div>
                                                )}
                                            </td>
                                            <td className="text-end">{number(provider.active_postings)}</td>
                                            <td className="small">
                                                {formatDateTime(provider.last_success_at) || <span className="text-muted">Never</span>}
                                            </td>
                                            <td className="small">
                                                {provider.last_error_message ? (
                                                    <>
                                                        <div>
                                                            {provider.last_status_code && <span className="badge text-bg-light border me-1">{provider.last_status_code}</span>}
                                                            <span className="text-danger">{provider.last_error_message}</span>
                                                        </div>
                                                        <div className="text-muted">{formatDateTime(provider.last_error_at)}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-muted">None</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="row g-4">
                    <div className="col-12 col-xl-7">
                        <section className="rt-card p-3 p-lg-4 h-100">
                            <h2 className="h6 fw-bold mb-1">AI usage by day</h2>
                            <p className="text-muted small mb-3">Requests, tokens and failures recorded by the LLM tracker.</p>

                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead>
                                        <tr className="text-muted small">
                                            <th scope="col">Date</th>
                                            <th scope="col" className="text-end">Requests</th>
                                            <th scope="col" className="text-end">Failures</th>
                                            <th scope="col" className="text-end">Tokens</th>
                                            <th scope="col" className="text-end">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usage.daily.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center text-muted small py-4">No AI usage recorded yet.</td>
                                            </tr>
                                        )}
                                        {usage.daily.map((day) => (
                                            <tr key={day.date}>
                                                <td className="small">{day.date}</td>
                                                <td className="text-end">{number(day.requests)}</td>
                                                <td className="text-end">{number(day.failures)}</td>
                                                <td className="text-end">{number(day.tokens)}</td>
                                                <td className="text-end">${Number(day.estimated_cost || 0).toFixed(4)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    <div className="col-12 col-xl-5">
                        <section className="rt-card p-3 p-lg-4 h-100">
                            <h2 className="h6 fw-bold mb-1">Top users today</h2>
                            <p className="text-muted small mb-3">Per-user daily token budget: {number(budgets.daily_user_token_limit)}.</p>

                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead>
                                        <tr className="text-muted small">
                                            <th scope="col">User</th>
                                            <th scope="col" className="text-end">Requests</th>
                                            <th scope="col" className="text-end">Tokens</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usage.topUsers.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="text-center text-muted small py-4">No user AI usage today.</td>
                                            </tr>
                                        )}
                                        {usage.topUsers.map((row) => (
                                            <tr key={row.user_id}>
                                                <td className="small">
                                                    <div className="fw-semibold">{row.name || `User #${row.user_id}`}</div>
                                                    <div className="text-muted">{row.email}</div>
                                                </td>
                                                <td className="text-end">{number(row.requests)}</td>
                                                <td className="text-end">
                                                    {number(row.tokens)}
                                                    {budgets.daily_user_token_limit > 0 && (
                                                        <div className="text-muted small">
                                                            {Math.min(100, Math.round((row.tokens / budgets.daily_user_token_limit) * 100))}%
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>

                <section className="rt-card p-3 p-lg-4 mt-4">
                    <h2 className="h6 fw-bold mb-1">Provider error log</h2>
                    <p className="text-muted small mb-3">Latest failures with provider status codes.</p>

                    <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                            <thead>
                                <tr className="text-muted small">
                                    <th scope="col">When</th>
                                    <th scope="col">Provider</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sourceEvents.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted small py-4">No provider errors recorded.</td>
                                    </tr>
                                )}
                                {sourceEvents.map((event) => (
                                    <tr key={event.id}>
                                        <td className="small text-nowrap">{formatDateTime(event.created_at)}</td>
                                        <td className="small text-capitalize">{event.provider}</td>
                                        <td className="small">{event.status_code ? <span className="badge text-bg-light border">{event.status_code}</span> : <span className="text-muted">n/a</span>}</td>
                                        <td className="small text-danger">{event.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </MainLayout>
    );
}
