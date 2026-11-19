import { Link } from '@inertiajs/react';
import React from 'react';
import { formatDate, formatNumber, Pagination } from '../../Components/AdminUi';
import AdminLayout from '../../Layouts/AdminLayout';

const TABS = [
    { key: 'all', label: 'All' },
    { key: 'failed', label: 'Failed' },
    { key: 'succeeded', label: 'Succeeded' },
    { key: 'unfinished', label: 'Killed mid-request' },
    { key: 'browser', label: 'No response (browser)' },
];

const STATES = {
    success: { label: 'OK', className: 'text-bg-success' },
    client_error: { label: 'Rejected', className: 'text-bg-warning' },
    server_error: { label: 'Server error', className: 'text-bg-danger' },
    killed: { label: 'Killed', className: 'text-bg-danger' },
    running: { label: 'Running', className: 'text-bg-secondary' },
    no_response: { label: 'No response', className: 'text-bg-dark' },
};

/** What each state usually means, shown when a row is expanded. */
const EXPLANATIONS = {
    killed: 'PHP received this request but never finished it: the process was stopped mid-request (edge timeout, memory limit or crash). No response was sent.',
    no_response: 'The browser got no response at all, so the server never logged this call itself. If there is no matching server row at the same time, the request never reached PHP. "File readable: no" means the phone revoked access to the picked file.',
    server_error: 'Laravel threw an exception while handling this request.',
    client_error: 'The server answered but refused the request (validation, quota, rate limit, expired session…).',
};

const formatDuration = (ms) => (ms === null || ms === undefined ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);
const formatBytes = (bytes) => (bytes === null || bytes === undefined ? '—' : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

const describeDevice = (userAgent = '') => {
    const os = /Android/i.test(userAgent) ? 'Android' : /iPhone|iPad/i.test(userAgent) ? 'iOS' : /Windows/i.test(userAgent) ? 'Windows' : /Mac OS/i.test(userAgent) ? 'Mac' : /Linux/i.test(userAgent) ? 'Linux' : 'Unknown';
    const browser = /Edg\//.test(userAgent) ? 'Edge' : /SamsungBrowser/.test(userAgent) ? 'Samsung' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : '';
    return [os, browser].filter(Boolean).join(' · ');
};

function Detail({ label, children }) {
    return (
        <div className="col-sm-6 col-lg-4">
            <div className="small text-muted">{label}</div>
            <div className="text-break">{children}</div>
        </div>
    );
}

export default function RequestLogs({ logs, filter, counts, retentionDays, seo }) {
    return (
        <AdminLayout title="Request logs" subtitle={`Every form/API call and every failure, kept for ${retentionDays} days. Counts are for the last 24 hours.`} seo={seo}>
            <div className="rt-tabs mb-3" role="tablist">
                {TABS.map((tab) => (
                    <Link key={tab.key} href={tab.key === 'all' ? '/admin/request-logs' : `/admin/request-logs?filter=${tab.key}`} className={`rt-tab ${filter === tab.key ? 'is-active' : ''}`} preserveScroll>
                        {tab.label}<span className="rt-count">{formatNumber(counts[tab.key])}</span>
                    </Link>
                ))}
            </div>

            {logs.data.length === 0 && (
                <div className="rt-card p-5 text-center text-muted">
                    <i className="bi bi-journal-code" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">No requests logged here yet.</p>
                </div>
            )}

            <div className="d-grid gap-2">
                {logs.data.map((log) => {
                    const state = STATES[log.state] || STATES.success;
                    return (
                        <details key={log.id} className="rt-card rt-message">
                            <summary className="d-flex flex-wrap align-items-center gap-2 p-3">
                                <span className={`badge ${state.className}`}>{state.label}{log.status_code ? ` ${log.status_code}` : ''}</span>
                                <code className="text-body">{log.method} {log.path}</code>
                                <span className="small text-muted">{formatDuration(log.source === 'browser' ? log.context?.elapsed_ms : log.duration_ms)}</span>
                                <span className="small text-muted">{log.user ? log.user.name : 'Guest'} · {describeDevice(log.user_agent)}</span>
                                {log.error && <span className="small text-danger text-truncate" style={{ maxWidth: '28rem' }}>{log.error}</span>}
                                <span className="ms-auto small text-muted text-nowrap">{formatDate(log.created_at, true)}</span>
                            </summary>
                            <div className="px-3 pb-3">
                                {EXPLANATIONS[log.state] && <div className="alert alert-light border small py-2">{EXPLANATIONS[log.state]}</div>}
                                <div className="row g-3 small">
                                    <Detail label="Logged by">{log.source === 'browser' ? 'Browser report' : 'Server'}</Detail>
                                    <Detail label="User">{log.user ? <Link href={`/admin/users/${log.user.id}`}>{log.user.name}</Link> : 'Guest'}</Detail>
                                    <Detail label="IP">{log.ip || '—'}</Detail>
                                    {log.upload && (
                                        <Detail label="Uploaded file">
                                            {log.upload.name || 'file'} · {formatBytes(log.upload.size)} · {log.upload.type || 'unknown type'}
                                            {log.upload.readable === false && <span className="text-danger fw-semibold"> · File readable: no</span>}
                                            {log.upload.valid === false && <span className="text-danger fw-semibold"> · Upload invalid</span>}
                                        </Detail>
                                    )}
                                    {log.source === 'browser' && (
                                        <>
                                            <Detail label="Browser error code">{log.context?.code || '—'}</Detail>
                                            <Detail label="Failed after">{formatDuration(log.context?.elapsed_ms)}</Detail>
                                            <Detail label="Phone online">{log.context?.online === false ? 'No' : log.context?.online ? 'Yes' : '—'}{log.context?.connection ? ` · ${log.context.connection}` : ''}</Detail>
                                            <Detail label="Page">{log.context?.page || '—'}</Detail>
                                        </>
                                    )}
                                    <div className="col-12">
                                        <div className="small text-muted">Device</div>
                                        <div className="text-break"><code className="small">{log.user_agent || '—'}</code></div>
                                    </div>
                                    {log.error && (
                                        <div className="col-12">
                                            <div className="small text-muted">Error</div>
                                            <pre className="rt-plain small mb-0" style={{ whiteSpace: 'pre-wrap' }}>{log.error}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </details>
                    );
                })}
            </div>
            <Pagination paginator={logs} />
        </AdminLayout>
    );
}
