import { Link } from '@inertiajs/react';
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

export function PlanBadge({ plan, complimentary = false }) {
    return plan === 'pro'
        ? <span className="rt-plan-pill"><i className="bi bi-stars"></i>Pro{complimentary ? ' (gift)' : ''}</span>
        : <span className="badge text-bg-light border">Free</span>;
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
