import { Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { describeTrialLimit, formatDate, Pagination, PlanBadge, ProTrialForm } from '../../../Components/AdminUi';
import AdminLayout from '../../../Layouts/AdminLayout';

function SiteTrialCard({ siteTrial, trialLimits, canManage }) {
    const stop = () => {
        if (window.confirm('End the Pro trial for everyone now? Accounts go back to their own plan.')) {
            router.delete('/admin/pro-trial', { preserveScroll: true });
        }
    };

    return (
        <section className="rt-card p-3 p-lg-4 mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <h2 className="rt-card-title mb-0"><i className="bi bi-gift"></i>Pro trial for everyone</h2>
                {siteTrial
                    ? <span className="badge text-bg-success">Running until {formatDate(siteTrial.ends_at, true)}</span>
                    : <span className="badge text-bg-light border">Off</span>}
            </div>
            <p className="small text-muted mb-3">
                {siteTrial
                    ? `Every signed-in account, including new sign-ups, has Pro since ${formatDate(siteTrial.starts_at)}. Limit: ${describeTrialLimit(siteTrial.tailor_limit)}${siteTrial.tailor_limit ? ' per account for the whole trial' : ''}. Subscribers and accounts with their own trial keep their plan.`
                    : 'Give every signed-in account Pro for a number of days, with your own limit on tailored CVs. Guests stay on Free.'}
            </p>
            {canManage ? (
                <>
                    <ProTrialForm key={siteTrial?.ends_at ?? 'none'} url="/admin/pro-trial" limits={trialLimits} submitLabel={siteTrial ? 'Restart trial for everyone' : 'Start trial for everyone'} idPrefix="site-trial" />
                    {siteTrial && <button type="button" className="btn btn-sm btn-link text-danger px-0 mt-1" onClick={stop}>End trial now</button>}
                </>
            ) : <p className="small text-muted mb-0">Only super admins can start or end it.</p>}
        </section>
    );
}

export default function UsersIndex({ users, filters, roles, siteTrial, trialLimits, canManageSiteTrial, seo }) {
    const [form, setForm] = useState({
        search: filters.search ?? '',
        role: filters.role ?? '',
        status: filters.status ?? '',
        plan: filters.plan ?? '',
    });

    const apply = (next) => {
        const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== ''));
        router.get('/admin/users', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const change = (field, value) => {
        const next = { ...form, [field]: value };
        setForm(next);
        if (field !== 'search') {
            apply(next);
        }
    };

    return (
        <AdminLayout title="Users" subtitle={`${users.total.toLocaleString()} account${users.total === 1 ? '' : 's'}`} seo={seo}>
            <SiteTrialCard siteTrial={siteTrial} trialLimits={trialLimits} canManage={canManageSiteTrial} />
            <form className="rt-card p-3 mb-3" onSubmit={(event) => { event.preventDefault(); apply(form); }}>
                <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                        <label htmlFor="search" className="rt-filter-label">Search</label>
                        <div className="input-group">
                            <input id="search" type="search" className="form-control rt-input" placeholder="Name or email" value={form.search} onChange={(event) => change('search', event.target.value)} />
                            <button className="btn rt-btn-soft" type="submit" aria-label="Search"><i className="bi bi-search"></i></button>
                        </div>
                    </div>
                    <div className="col-6 col-md-2">
                        <label htmlFor="role" className="rt-filter-label">Role</label>
                        <select id="role" className="form-select" value={form.role} onChange={(event) => change('role', event.target.value)}>
                            <option value="">Any</option>
                            {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                    </div>
                    <div className="col-6 col-md-2">
                        <label htmlFor="plan" className="rt-filter-label">Plan</label>
                        <select id="plan" className="form-select" value={form.plan} onChange={(event) => change('plan', event.target.value)}>
                            <option value="">Any</option>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                        </select>
                    </div>
                    <div className="col-6 col-md-2">
                        <label htmlFor="status" className="rt-filter-label">Status</label>
                        <select id="status" className="form-select" value={form.status} onChange={(event) => change('status', event.target.value)}>
                            <option value="">Any</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="unverified">Email not verified</option>
                        </select>
                    </div>
                    <div className="col-6 col-md-2">
                        <button type="button" className="btn btn-link text-muted w-100" onClick={() => { const empty = { search: '', role: '', status: '', plan: '' }; setForm(empty); apply(empty); }}>
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
                                <th>Role</th>
                                <th>Plan</th>
                                <th className="text-center">Tailored</th>
                                <th className="text-center">Uploaded CVs</th>
                                <th>Joined</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.length === 0 && (
                                <tr><td colSpan="7" className="text-center text-muted py-5">No users match these filters.</td></tr>
                            )}
                            {users.data.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <Link href={`/admin/users/${user.id}`} className="fw-semibold text-decoration-none">{user.name}</Link>
                                        <div className="small text-muted">{user.email}</div>
                                        <div className="d-flex gap-1 mt-1">
                                            {user.suspended && <span className="badge text-bg-danger">Suspended</span>}
                                            {!user.email_verified && <span className="badge text-bg-warning">Unverified</span>}
                                        </div>
                                    </td>
                                    <td className="small">{user.role_label}</td>
                                    <td><PlanBadge plan={user.plan} source={user.plan_source} /></td>
                                    <td className="text-center">{user.tailored_resumes_count}</td>
                                    <td className="text-center">{user.resumes_count}</td>
                                    <td className="small text-muted text-nowrap">{formatDate(user.created_at)}</td>
                                    <td className="text-end"><Link href={`/admin/users/${user.id}`} className="btn btn-sm rt-btn-soft">Manage</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <Pagination paginator={users} />
        </AdminLayout>
    );
}
