import { Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { formatDate, Pagination } from '../../../Components/AdminUi';
import AdminLayout from '../../../Layouts/AdminLayout';

const STATUS_BADGES = {
    pending: 'text-bg-light border',
    awaiting_review: 'text-bg-warning',
    paid: 'text-bg-success',
    failed: 'text-bg-danger',
    rejected: 'text-bg-danger',
};

export default function PaymentsIndex({ payments, filters, awaitingReview, channels, statuses, seo }) {
    const [form, setForm] = useState({
        search: filters.search ?? '',
        status: filters.status ?? '',
        channel: filters.channel ?? '',
    });

    const apply = (next) => {
        const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== ''));
        router.get('/admin/payments', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const change = (field, value) => {
        const next = { ...form, [field]: value };
        setForm(next);
        if (field !== 'search') {
            apply(next);
        }
    };

    const approve = (payment) => {
        if (window.confirm(`Approve ${payment.amount_label} from ${payment.user?.name ?? 'this user'}? Only approve once you see the money in your account.`)) {
            router.post(`/admin/payments/${payment.id}/approve`, {}, { preserveScroll: true });
        }
    };

    const reject = (payment) => {
        const note = window.prompt('Why is this payment rejected? The user sees this note.');
        if (note) {
            router.post(`/admin/payments/${payment.id}/reject`, { note }, { preserveScroll: true });
        }
    };

    const offline = channels.filter((channel) => !channel.available);

    return (
        <AdminLayout title="Payments" subtitle={`${payments.total.toLocaleString()} rupee payment${payments.total === 1 ? '' : 's'}${awaitingReview ? ` · ${awaitingReview} waiting for review` : ''}`} seo={seo}>
            {offline.length > 0 && (
                <div className="alert alert-light border small">
                    <i className="bi bi-info-circle me-1"></i>
                    Not offered to users yet: {offline.map((channel) => channel.label).join(', ')}. Switch them on and fill in their details in <Link href="/admin/settings">Settings</Link>.
                </div>
            )}

            <form className="rt-card p-3 mb-3" onSubmit={(event) => { event.preventDefault(); apply(form); }}>
                <div className="row g-2 align-items-end">
                    <div className="col-md-5">
                        <label htmlFor="search" className="rt-filter-label">Search</label>
                        <div className="input-group">
                            <input id="search" type="search" className="form-control rt-input" placeholder="Reference, TID, name or email" value={form.search} onChange={(event) => change('search', event.target.value)} />
                            <button className="btn rt-btn-soft" type="submit" aria-label="Search"><i className="bi bi-search"></i></button>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <label htmlFor="status" className="rt-filter-label">Status</label>
                        <select id="status" className="form-select" value={form.status} onChange={(event) => change('status', event.target.value)}>
                            <option value="">Any</option>
                            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                    </div>
                    <div className="col-6 col-md-2">
                        <label htmlFor="channel" className="rt-filter-label">Channel</label>
                        <select id="channel" className="form-select" value={form.channel} onChange={(event) => change('channel', event.target.value)}>
                            <option value="">Any</option>
                            {channels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <button type="button" className="btn btn-link text-muted w-100" onClick={() => { const empty = { search: '', status: '', channel: '' }; setForm(empty); apply(empty); }}>
                            Clear filters
                        </button>
                    </div>
                </div>
            </form>

            <section className="rt-card">
                <div className="table-responsive">
                    <table className="table rt-admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Payment</th>
                                <th>Details</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.data.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-4">No payments found.</td></tr>}
                            {payments.data.map((payment) => (
                                <tr key={payment.id}>
                                    <td>
                                        {payment.user ? (
                                            <>
                                                <Link href={`/admin/users/${payment.user.id}`} className="fw-semibold">{payment.user.name}</Link>
                                                <div className="small text-muted">{payment.user.email}</div>
                                            </>
                                        ) : <span className="text-muted">Deleted user</span>}
                                    </td>
                                    <td>
                                        <div className="fw-semibold">{payment.amount_label}</div>
                                        <div className="small text-muted">{payment.channel_label} · {payment.interval === 'yearly' ? '1 year' : '1 month'}</div>
                                    </td>
                                    <td className="small">
                                        <div>Ref <code>{payment.reference}</code></div>
                                        {payment.payer_reference && <div>TID <code>{payment.payer_reference}</code></div>}
                                        {payment.gateway_transaction_id && <div>Gateway <code>{payment.gateway_transaction_id}</code></div>}
                                        {payment.has_proof && <a href={`/admin/payments/${payment.id}/proof`} target="_blank" rel="noreferrer"><i className="bi bi-paperclip me-1"></i>Receipt</a>}
                                        {payment.admin_note && <div className="text-muted">Note: {payment.admin_note}</div>}
                                    </td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGES[payment.status] ?? 'text-bg-light'}`}>{payment.status_label}</span>
                                        {payment.reviewer && <div className="small text-muted mt-1">by {payment.reviewer}</div>}
                                    </td>
                                    <td className="small text-muted text-nowrap">{formatDate(payment.created_at, true)}</td>
                                    <td className="text-end text-nowrap">
                                        {['pending', 'awaiting_review'].includes(payment.status) && (
                                            <>
                                                <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => approve(payment)}><i className="bi bi-check-lg me-1"></i>Approve</button>
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => reject(payment)}>Reject</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination paginator={payments} />
            </section>
        </AdminLayout>
    );
}
