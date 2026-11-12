import { router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { formatDate, formatNumber, StatCard } from '../../Components/AdminUi';
import AdminLayout from '../../Layouts/AdminLayout';

const formatWait = (seconds) => (seconds >= 120 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`);

function AddKeyForm() {
    const form = useForm({ name: '', key: '' });
    const [isVisible, setIsVisible] = useState(false);

    const submit = (event) => {
        event.preventDefault();
        form.post('/admin/ai-keys', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={submit} noValidate className="rt-card p-3 p-lg-4 mb-4">
            <div className="d-flex align-items-center gap-2 mb-1">
                <span className="rt-stat-icon rt-tone-indigo" style={{ width: '2.1rem', height: '2.1rem', fontSize: '1rem' }}><i className="bi bi-plus-lg"></i></span>
                <h2 className="rt-card-title">Add a Groq API key</h2>
            </div>
            <p className="text-muted small mb-3">
                The key is checked with Groq before it is saved, stored encrypted, and joins the rotation straight away.
                Create keys at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>.
            </p>
            <div className="row g-3 align-items-start">
                <div className="col-md-4">
                    <label htmlFor="key-name" className="form-label fw-semibold small">Name</label>
                    <input id="key-name" className={`form-control ${form.errors.name ? 'is-invalid' : ''}`} placeholder="e.g. Team account 2" maxLength={80} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                    {form.errors.name && <div className="invalid-feedback">{form.errors.name}</div>}
                </div>
                <div className="col-md-6">
                    <label htmlFor="key-value" className="form-label fw-semibold small">API key</label>
                    <div className="input-group has-validation">
                        <input
                            id="key-value"
                            type={isVisible ? 'text' : 'password'}
                            autoComplete="off"
                            spellCheck="false"
                            className={`form-control rt-key-mono ${form.errors.key ? 'is-invalid' : ''}`}
                            placeholder="gsk_..."
                            value={form.data.key}
                            onChange={(event) => form.setData('key', event.target.value)}
                        />
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setIsVisible((visible) => !visible)} aria-label={isVisible ? 'Hide key' : 'Show key'}>
                            <i className={`bi ${isVisible ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                        {form.errors.key && <div className="invalid-feedback">{form.errors.key}</div>}
                    </div>
                </div>
                <div className="col-md-2">
                    <label className="form-label small d-none d-md-block">&nbsp;</label>
                    <button type="submit" className="btn rt-btn-primary w-100 py-2" disabled={form.processing || !form.data.key.trim() || !form.data.name.trim()}>
                        {form.processing ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Checking</> : 'Add key'}
                    </button>
                </div>
            </div>
        </form>
    );
}

function KeyStatus({ row }) {
    if (!row.is_active) {
        return <span className="badge text-bg-secondary">Disabled</span>;
    }
    if (row.paused_seconds > 0) {
        return <span className="badge text-bg-warning">Paused · {formatWait(row.paused_seconds)}</span>;
    }
    return <span className="badge text-bg-success">In rotation</span>;
}

export default function AiKeys({ keys, today, model, budgets, canManage, seo }) {
    const active = keys.filter((row) => row.is_active);
    const accounts = [...new Set(active.map((row) => row.organization).filter(Boolean))];
    const sharedAccount = accounts.find((organization) => active.filter((row) => row.organization === organization).length > 1);
    const paused = active.filter((row) => row.paused_seconds > 0).length;

    const send = (method, url, data = {}, question = null) => {
        if (question && !window.confirm(question)) {
            return;
        }
        router[method](url, data, { preserveScroll: true });
    };

    const rename = (row) => {
        const name = window.prompt('New name for this key', row.name ?? '');
        if (name && name.trim() && name.trim() !== row.name) {
            send('patch', `/admin/ai-keys/${row.id}`, { name: name.trim() });
        }
    };

    return (
        <AdminLayout
            title="AI keys"
            subtitle="Groq keys rotate automatically. A rate-limited or rejected key is paused and requests move to the next one."
            seo={seo}
            actions={<button type="button" className="btn btn-light border" onClick={() => router.reload({ only: ['keys', 'today'] })}><i className="bi bi-arrow-clockwise me-1"></i>Refresh</button>}
        >
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-xl-3"><StatCard icon="bi-key" tone="indigo" label="In rotation" value={`${active.length - paused} / ${keys.length}`} hint={paused > 0 ? `${paused} paused right now` : 'No paused keys'} /></div>
                <div className="col-sm-6 col-xl-3"><StatCard icon="bi-arrow-repeat" tone="sky" label="Requests today" value={formatNumber(today.requests)} hint={budgets.daily_request_limit > 0 ? `Limit ${formatNumber(budgets.daily_request_limit)} a day` : 'No daily limit'} /></div>
                <div className="col-sm-6 col-xl-3"><StatCard icon="bi-lightning-charge" tone="amber" label="Tokens today" value={formatNumber(today.tokens)} hint={budgets.daily_token_limit > 0 ? `Limit ${formatNumber(budgets.daily_token_limit)} a day` : 'No daily limit'} /></div>
                <div className="col-sm-6 col-xl-3"><StatCard icon="bi-cpu" tone="violet" label="Model" value={<span className="fs-6 text-break">{model}</span>} hint={`${formatNumber(today.failures)} failed requests today`} /></div>
            </div>

            {sharedAccount && (
                <div className="alert alert-warning d-flex gap-2 align-items-start">
                    <i className="bi bi-exclamation-triangle mt-1"></i>
                    <div>
                        <div className="fw-semibold">Several keys belong to the same Groq account</div>
                        <div className="small">
                            Groq's rate limit (tokens per minute) applies to the whole account, not to each key, so keys from one account
                            share a single limit and do not add capacity. {accounts.length === 1 ? 'All known keys are in one account.' : `Known keys are spread over ${accounts.length} accounts.`}{' '}
                            For more capacity, upgrade the Groq account to the paid Developer tier, or add keys from separate accounts that you are allowed to use.
                            Accounts are detected the first time a key is rate limited.
                        </div>
                    </div>
                </div>
            )}

            {canManage ? <AddKeyForm /> : (
                <div className="alert alert-light border small"><i className="bi bi-lock me-2"></i>Only super admins can add, disable or delete keys.</div>
            )}

            <section className="rt-card">
                <div className="d-flex justify-content-between align-items-center p-3 p-lg-4 pb-3">
                    <h2 className="rt-card-title"><i className="bi bi-list-ul"></i>All keys</h2>
                    <small className="text-muted">Only the last four characters are ever shown.</small>
                </div>
                <div className="table-responsive">
                    <table className="table rt-admin-table">
                        <thead>
                            <tr><th>Key</th><th>Source</th><th>Status</th><th>Added</th><th className="text-end">Actions</th></tr>
                        </thead>
                        <tbody>
                            {keys.length === 0 && (
                                <tr><td colSpan="5" className="text-center text-muted py-5">No keys yet. Add one above, or set GROQ_API_KEYS in .env.</td></tr>
                            )}
                            {keys.map((row) => (
                                <tr key={row.id ? `panel-${row.id}` : `env-${row.position}`} className={row.is_active ? '' : 'text-muted'}>
                                    <td>
                                        <div className="fw-semibold">{row.name || (row.source === 'env' ? 'From .env' : 'Unnamed key')}</div>
                                        <div className="rt-key-mono text-muted">{row.label}</div>
                                        {row.organization && <div className="small text-muted">Groq account …{row.organization.slice(-6)}</div>}
                                    </td>
                                    <td>
                                        {row.source === 'env'
                                            ? <span className="badge text-bg-light border"><i className="bi bi-file-earmark-code me-1"></i>.env</span>
                                            : <span className="badge text-bg-light border"><i className="bi bi-window me-1"></i>Panel</span>}
                                    </td>
                                    <td><KeyStatus row={row} /></td>
                                    <td className="small text-muted">
                                        {row.source === 'env' ? '—' : <>{formatDate(row.created_at)}{row.added_by && <div>by {row.added_by}</div>}</>}
                                    </td>
                                    <td className="text-end text-nowrap">
                                        {row.is_active && row.paused_seconds > 0 && row.position && (
                                            <button type="button" className="btn btn-sm btn-light border me-1" onClick={() => send('delete', `/admin/ai-keys/${row.position}/pause`)}>Resume now</button>
                                        )}
                                        {canManage && row.source === 'panel' && (
                                            <div className="btn-group btn-group-sm">
                                                <button type="button" className="btn btn-light border" onClick={() => rename(row)} title="Rename"><i className="bi bi-pencil"></i></button>
                                                <button
                                                    type="button"
                                                    className="btn btn-light border"
                                                    onClick={() => send('patch', `/admin/ai-keys/${row.id}`, { is_active: !row.is_active })}
                                                    title={row.is_active ? 'Disable' : 'Enable'}
                                                >
                                                    <i className={`bi ${row.is_active ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                                                </button>
                                                <button type="button" className="btn btn-light border text-danger" onClick={() => send('delete', `/admin/ai-keys/${row.id}`, {}, `Delete "${row.name}"? This cannot be undone.`)} title="Delete">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                        {row.source === 'env' && <small className="text-muted">Edit in .env</small>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AdminLayout>
    );
}
