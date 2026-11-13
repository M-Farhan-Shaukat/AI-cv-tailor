import { Link, useForm } from '@inertiajs/react';
import React from 'react';

/*
 * Small pieces shared by the admin pages.
 */

export const formatNumber = (value) => Number(value || 0).toLocaleString();

export const formatDate = (value, withTime = false) => {
    if (!value) {
        return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString(undefined, withTime
            ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short', year: 'numeric' });
};

export function StatCard({ label, value, hint, icon, tone = 'indigo' }) {
    return (
        <div className="rt-card p-3 h-100">
            <div className="rt-stat">
                {icon && <span className={`rt-stat-icon rt-tone-${tone}`}><i className={`bi ${icon}`}></i></span>}
                <div className="min-w-0">
                    <div className="rt-stat-label">{label}</div>
                    <div className="rt-stat-value">{value}</div>
                    {hint && <div className="rt-stat-hint">{hint}</div>}
                </div>
            </div>
        </div>
    );
}

const PLAN_SOURCE_NOTES = { gift: ' (trial)', trial: ' (trial for all)' };

export function PlanBadge({ plan, source = null }) {
    return plan === 'pro'
        ? <span className="rt-plan-pill"><i className="bi bi-stars"></i>Pro{PLAN_SOURCE_NOTES[source] ?? ''}</span>
        : <span className="badge text-bg-light border">Free</span>;
}

export const describeTrialLimit = (tailorLimit) => {
    if (tailorLimit === null || tailorLimit === undefined) {
        return 'Normal Pro limit';
    }
    return tailorLimit === 0 ? 'Unlimited' : `${formatNumber(tailorLimit)} tailored CV${tailorLimit === 1 ? '' : 's'}`;
};

/**
 * Days of Pro plus an optional cap on CVs tailored during the trial. A blank cap keeps the normal
 * Pro limit; 0 means unlimited.
 */
export function ProTrialForm({ url, limits, submitLabel, idPrefix }) {
    const form = useForm({ days: 7, tailor_limit: '' });

    const submit = (event) => {
        event.preventDefault();
        form.transform((data) => ({ days: Number(data.days), tailor_limit: data.tailor_limit === '' ? null : Number(data.tailor_limit) }));
        form.post(url, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} noValidate>
            <div className="row g-2 align-items-start">
                <div className="col-sm-4">
                    <label htmlFor={`${idPrefix}-days`} className="form-label fw-semibold small mb-1">Days</label>
                    <input id={`${idPrefix}-days`} type="number" min="1" max={limits.max_days} className={`form-control form-control-sm ${form.errors.days ? 'is-invalid' : ''}`} value={form.data.days} onChange={(event) => form.setData('days', event.target.value)} />
                    {form.errors.days && <div className="invalid-feedback">{form.errors.days}</div>}
                </div>
                <div className="col-sm-8">
                    <label htmlFor={`${idPrefix}-limit`} className="form-label fw-semibold small mb-1">CV tailoring limit for the trial</label>
                    <input id={`${idPrefix}-limit`} type="number" min="0" max={limits.max_tailor_limit} placeholder="Normal Pro limit" className={`form-control form-control-sm ${form.errors.tailor_limit ? 'is-invalid' : ''}`} value={form.data.tailor_limit} onChange={(event) => form.setData('tailor_limit', event.target.value)} />
                    {form.errors.tailor_limit
                        ? <div className="invalid-feedback">{form.errors.tailor_limit}</div>
                        : <div className="form-text">Blank = normal Pro limit per month, 0 = unlimited.</div>}
                </div>
            </div>
            <button type="submit" className="btn btn-sm rt-btn-primary px-3 py-1 mt-2" disabled={form.processing}>
                <i className="bi bi-gift me-1"></i>{form.processing ? 'Saving...' : submitLabel}
            </button>
        </form>
    );
}

export function ScoreChange({ before, after }) {
    if (after === null || after === undefined) {
        return <span className="text-muted">—</span>;
    }
    const gain = before !== null && before !== undefined ? after - before : null;
    return (
        <span className="text-nowrap">
            <span className="text-muted">{before ?? '—'}</span>
            <i className="bi bi-arrow-right mx-1 text-muted small"></i>
            <strong>{after}</strong>
            {gain !== null && gain > 0 && <span className="text-success small ms-1">+{gain}</span>}
        </span>
    );
}

/**
 * Laravel paginator links ("« Previous", "1", "2", "Next »") as Inertia links.
 */
export function Pagination({ paginator }) {
    if (!paginator || paginator.last_page <= 1) {
        return null;
    }

    return (
        <nav className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" aria-label="Pages">
            <small className="text-muted">
                Showing {paginator.from}–{paginator.to} of {formatNumber(paginator.total)}
            </small>
            <ul className="pagination pagination-sm mb-0 flex-wrap">
                {paginator.links.map((link, index) => (
                    <li key={index} className={`page-item ${link.active ? 'active' : ''} ${link.url ? '' : 'disabled'}`}>
                        {link.url
                            ? <Link href={link.url} className="page-link" preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                            : <span className="page-link" dangerouslySetInnerHTML={{ __html: link.label }} />}
                    </li>
                ))}
            </ul>
        </nav>
    );
}
