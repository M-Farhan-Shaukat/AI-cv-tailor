import { Link, router, useForm, usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';

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
    if (!provider.configured) {
        return { label: 'Not configured', className: 'text-bg-light border' };
    }
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

const RESULT_LABELS = {
    ok: 'Synced',
    unconfigured: 'Not configured',
    cooling_down: 'Paused after failures',
    failed: 'Failed',
};

/**
 * Search terms, location and the auto-sync schedule, plus the result of the last sync.
 */
function SyncPanel({ sync, isSyncing, onSyncAll }) {
    const { errors } = usePage().props;
    const settings = sync.settings;
    const form = useForm({
        queries: settings.queries.join('\n'),
        location: settings.location ?? '',
        country: settings.country ?? '',
        remote_only: settings.remote_only,
        per_page: settings.per_page,
        auto_sync: settings.auto_sync,
        interval_hours: settings.interval_hours,
    });

    const submit = (event) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            queries: data.queries.split(/[\n,]/).map((query) => query.trim()).filter(Boolean),
            country: data.country.trim() || null,
            location: data.location.trim() || null,
        }));
        form.put('/admin/jobs/sync-settings', { preserveScroll: true });
    };

    const lastRun = sync.last_run;

    return (
        <div className="row g-4 mb-4">
            <div className="col-xl-7">
                <form className="rt-card p-3 p-lg-4 h-100" onSubmit={submit} noValidate>
                    <h2 className="rt-card-title mb-1"><i className="bi bi-sliders"></i>Sync settings</h2>
                    <p className="text-muted small mb-3">What to fetch from the providers. Each search term is fetched from every configured provider.</p>
                    <div className="row g-3">
                        <div className="col-12">
                            <label htmlFor="queries" className="form-label fw-semibold small">Search terms <span className="text-muted fw-normal">(one per line, up to {sync.max_queries})</span></label>
                            <textarea id="queries" rows="3" className={`form-control ${form.errors.queries || errors.queries ? 'is-invalid' : ''}`} placeholder={'Laravel developer\nReact developer\nData analyst'} value={form.data.queries} onChange={(event) => form.setData('queries', event.target.value)} />
                            {(form.errors.queries || errors.queries) && <div className="invalid-feedback">{form.errors.queries || errors.queries}</div>}
                        </div>
                        <div className="col-md-5">
                            <label htmlFor="location" className="form-label fw-semibold small">Location</label>
                            <input id="location" className="form-control" placeholder="e.g. Lahore or London" value={form.data.location} onChange={(event) => form.setData('location', event.target.value)} />
                        </div>
                        <div className="col-6 col-md-3">
                            <label htmlFor="country" className="form-label fw-semibold small">Country code</label>
                            <input id="country" className={`form-control text-uppercase ${form.errors.country ? 'is-invalid' : ''}`} maxLength={2} placeholder="gb" value={form.data.country} onChange={(event) => form.setData('country', event.target.value)} />
                            {form.errors.country && <div className="invalid-feedback">{form.errors.country}</div>}
                        </div>
                        <div className="col-6 col-md-4">
                            <label htmlFor="per_page" className="form-label fw-semibold small">Results per provider</label>
                            <select id="per_page" className="form-select" value={form.data.per_page} onChange={(event) => form.setData('per_page', Number(event.target.value))}>
                                {[10, 25, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </div>
                        <div className="col-md-5 d-flex align-items-center">
                            <div className="form-check form-switch">
                                <input id="remote_only" type="checkbox" role="switch" className="form-check-input" checked={form.data.remote_only} onChange={(event) => form.setData('remote_only', event.target.checked)} />
                                <label htmlFor="remote_only" className="form-check-label small">Remote jobs only</label>
                            </div>
                        </div>
                        <div className="col-md-7">
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <div className="form-check form-switch mb-0">
                                    <input id="auto_sync" type="checkbox" role="switch" className="form-check-input" checked={form.data.auto_sync} onChange={(event) => form.setData('auto_sync', event.target.checked)} />
                                    <label htmlFor="auto_sync" className="form-check-label small fw-semibold">Auto-sync every</label>
                                </div>
                                <select className="form-select form-select-sm w-auto" aria-label="Auto-sync interval" value={form.data.interval_hours} onChange={(event) => form.setData('interval_hours', Number(event.target.value))} disabled={!form.data.auto_sync}>
                                    {sync.intervals.map((hours) => <option key={hours} value={hours}>{hours === 24 ? 'day' : `${hours} hour${hours === 1 ? '' : 's'}`}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-4">
                        <button type="submit" className="btn rt-btn-primary px-4 py-2" disabled={form.processing || !form.isDirty}>
                            {form.processing ? 'Saving...' : 'Save settings'}
                        </button>
                        <button type="button" className="btn btn-light border" onClick={onSyncAll} disabled={isSyncing || form.isDirty}>
                            {isSyncing ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Syncing...</> : <><i className="bi bi-arrow-repeat me-1"></i>Sync all now</>}
                        </button>
                        {form.isDirty && <small className="text-muted align-self-center">Save your changes before syncing.</small>}
                    </div>
                </form>
            </div>

            <div className="col-xl-5">
                <section className="rt-card p-3 p-lg-4 h-100">
                    <h2 className="rt-card-title mb-3"><i className="bi bi-clock-history"></i>Schedule</h2>

                    {sync.scheduler_running ? (
                        <div className="alert alert-success py-2 small d-flex gap-2 align-items-start">
                            <i className="bi bi-check-circle-fill mt-1"></i><span>The scheduler is running, so auto-sync will run on time.</span>
                        </div>
                    ) : (
                        <div className="alert alert-warning py-2 small">
                            <div className="fw-semibold mb-1"><i className="bi bi-exclamation-triangle me-1"></i>The scheduler is not running</div>
                            Auto-sync only runs when Laravel's scheduler does. Locally, keep <code>php artisan schedule:work</code> running.
                            On the server, add this cron entry:
                            <code className="d-block mt-1 text-break">* * * * * cd /path/to/app &amp;&amp; php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1</code>
                        </div>
                    )}

                    <dl className="row small mb-3">
                        <dt className="col-5 text-muted fw-normal">Auto-sync</dt>
                        <dd className="col-7">{settings.auto_sync ? `Every ${settings.interval_hours === 24 ? 'day' : `${settings.interval_hours} h`}` : 'Off'}</dd>
                        <dt className="col-5 text-muted fw-normal">Next auto-sync</dt>
                        <dd className="col-7">{sync.next_auto_sync_at ? formatDateTime(sync.next_auto_sync_at) : '—'}</dd>
                        <dt className="col-5 text-muted fw-normal">Last sync</dt>
                        <dd className="col-7">{lastRun ? `${formatDateTime(lastRun.finished_at)} (${lastRun.trigger === 'auto' ? 'automatic' : 'manual'})` : 'Never'}</dd>
                    </dl>

                    {lastRun && Object.keys(lastRun.providers ?? {}).length > 0 && (
                        <ul className="list-unstyled small mb-0 d-grid gap-2">
                            {Object.entries(lastRun.providers).map(([name, row]) => (
                                <li key={name} className="d-flex justify-content-between gap-2 border rounded-3 px-3 py-2">
                                    <span className="text-capitalize fw-semibold">{name}</span>
                                    <span className={row.status === 'ok' ? 'text-success' : 'text-muted'}>
                                        {row.status === 'ok' ? `${number(row.fetched)} fetched · ${number(row.created)} new` : RESULT_LABELS[row.status] ?? row.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

export default function JobMetrics({ providers, sourceEvents, usage, budgets, generatedAt, sync, seo }) {
    const today = usage?.today ?? {};
    const { errors } = usePage().props;
    const [syncingProvider, setSyncingProvider] = useState(null);
    const isSyncing = syncingProvider !== null;

    const runSync = (provider = null) => {
        setSyncingProvider(provider ?? 'all');
        router.post('/admin/jobs/sync', provider ? { provider } : {}, {
            preserveScroll: true,
            onFinish: () => setSyncingProvider(null),
        });
    };

    return (
        <AdminLayout
            title="Job feeds"
            subtitle={<>Provider health, feed sync history and AI usage.{generatedAt && <span> Updated {formatDateTime(generatedAt)}.</span>}</>}
            seo={seo}
            actions={(
                <>
                    <button type="button" className="btn btn-light border" onClick={() => router.reload({ only: ['providers', 'sourceEvents', 'usage', 'generatedAt', 'sync'] })}>
                        <i className="bi bi-arrow-clockwise me-2"></i>Refresh
                    </button>
                    <Link href="/jobs" className="btn btn-light border">View jobs</Link>
                    <button type="button" className="btn rt-btn-primary px-3" onClick={() => runSync()} disabled={isSyncing}>
                        {syncingProvider === 'all'
                            ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Syncing...</>
                            : <><i className="bi bi-arrow-repeat me-2"></i>Sync all now</>}
                    </button>
                </>
            )}
        >
                {errors.sync && (
                    <div className="alert alert-danger d-flex gap-2 align-items-start" role="alert">
                        <i className="bi bi-exclamation-octagon mt-1"></i><span>{errors.sync}</span>
                    </div>
                )}

                <SyncPanel sync={sync} isSyncing={isSyncing} onSyncAll={() => runSync()} />

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
                                    <th scope="col" className="text-end">Sync</th>
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
                                                {!provider.configured && provider.setup_hint && (
                                                    <div className="text-muted small mt-1">{provider.setup_hint}</div>
                                                )}
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
                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-light border"
                                                    disabled={!provider.configured || isSyncing}
                                                    title={provider.configured ? `Sync ${provider.name} now` : 'Add its API keys to .env first'}
                                                    onClick={() => runSync(provider.name)}
                                                >
                                                    {syncingProvider === provider.name
                                                        ? <span className="spinner-border spinner-border-sm" aria-label="Syncing"></span>
                                                        : <><i className="bi bi-arrow-repeat me-1"></i>Sync</>}
                                                </button>
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
        </AdminLayout>
    );
}
