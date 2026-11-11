import { Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { formatDate, Pagination, PlanBadge } from '../../../Components/AdminUi';
import AdminLayout from '../../../Layouts/AdminLayout';

export default function UsersIndex({ users, filters, roles, seo }) {
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
                                    <td><PlanBadge plan={user.plan} complimentary={user.complimentary_pro} /></td>
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
