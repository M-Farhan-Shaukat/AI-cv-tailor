import { Link, router, useForm } from '@inertiajs/react';
import React from 'react';
import { describeTrialLimit, formatDate, formatNumber, PlanBadge, ProTrialForm, ScoreChange, StatCard } from '../../../Components/AdminUi';
import AdminLayout from '../../../Layouts/AdminLayout';

function EditUserForm({ user, roles, permissions }) {
    const form = useForm({
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
    });
    const canEditRole = permissions.manage_roles && !permissions.is_self && !user.is_configured_admin;

    const submit = (event) => {
        event.preventDefault();
        form.patch(`/admin/users/${user.id}`, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} noValidate>
            <div className="row g-3">
                <div className="col-md-6">
                    <label htmlFor="name" className="form-label fw-semibold small">Name</label>
                    <input id="name" className={`form-control ${form.errors.name ? 'is-invalid' : ''}`} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} disabled={!permissions.manage} />
                    {form.errors.name && <div className="invalid-feedback">{form.errors.name}</div>}
                </div>
                <div className="col-md-6">
                    <label htmlFor="email" className="form-label fw-semibold small">Email</label>
                    <input id="email" type="email" className={`form-control ${form.errors.email ? 'is-invalid' : ''}`} value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} disabled={!permissions.manage} />
                    {form.errors.email && <div className="invalid-feedback">{form.errors.email}</div>}
                </div>
                <div className="col-md-6">
                    <label htmlFor="role" className="form-label fw-semibold small">Role</label>
                    <select id="role" className={`form-select ${form.errors.role ? 'is-invalid' : ''}`} value={form.data.role} onChange={(event) => form.setData('role', event.target.value)} disabled={!permissions.manage || !canEditRole}>
                        {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    {form.errors.role && <div className="invalid-feedback">{form.errors.role}</div>}
                    {!canEditRole && <div className="form-text">{user.is_configured_admin ? 'Set by JOB_ADMIN_EMAILS in .env.' : permissions.is_self ? 'You cannot change your own role.' : 'Only super admins can change roles.'}</div>}
                </div>
                <div className="col-md-6 d-flex align-items-end">
                    <div className="form-check form-switch mb-2">
                        <input id="email_verified" className="form-check-input" type="checkbox" role="switch" checked={form.data.email_verified} onChange={(event) => form.setData('email_verified', event.target.checked)} disabled={!permissions.manage} />
                        <label htmlFor="email_verified" className="form-check-label small">Email verified</label>
                    </div>
                </div>
            </div>
            {permissions.manage && (
                <button type="submit" className="btn rt-btn-primary px-4 py-2 mt-3" disabled={form.processing || !form.isDirty}>
                    {form.processing ? 'Saving...' : 'Save changes'}
                </button>
            )}
        </form>
    );
}

export default function UserShow({ user, billing, subscription, aiUsageToday, counts, uploadedResumes, tailoredResumes, permissions, roles, trialLimits, seo }) {
    const canManage = permissions.manage && !permissions.is_self;

    const post = (method, url, data = {}, confirmMessage = null) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
            return;
        }
        router[method](url, data, { preserveScroll: true });
    };

    return (
        <AdminLayout
            title={user.name}
            subtitle={`${user.email} · joined ${formatDate(user.created_at)}`}
            seo={seo}
            actions={(
                <>
                    <Link href="/admin/users" className="btn rt-btn-soft"><i className="bi bi-arrow-left me-1"></i>All users</Link>
                    {canManage && (user.suspended
                        ? <button type="button" className="btn btn-outline-success" onClick={() => post('delete', `/admin/users/${user.id}/suspend`)}><i className="bi bi-unlock me-1"></i>Unsuspend</button>
                        : <button type="button" className="btn btn-outline-warning" onClick={() => post('post', `/admin/users/${user.id}/suspend`, {}, `Suspend ${user.name}? They will be signed out and cannot sign in until unsuspended.`)}><i className="bi bi-slash-circle me-1"></i>Suspend</button>)}
                    {canManage && (
                        <button type="button" className="btn btn-outline-danger" onClick={() => post('delete', `/admin/users/${user.id}`, {}, `Delete ${user.name} and all their data permanently? This cannot be undone.`)}>
                            <i className="bi bi-trash me-1"></i>Delete
                        </button>
                    )}
                </>
            )}
        >
            <div className="d-flex flex-wrap gap-2 mb-4">
                <PlanBadge plan={billing.plan} source={billing.source} />
                <span className="badge text-bg-light border">{user.role_label}</span>
                {user.suspended && <span className="badge text-bg-danger">Suspended</span>}
                {!user.email_verified && <span className="badge text-bg-warning">Email not verified</span>}
                {!permissions.manage && <span className="badge text-bg-secondary">View only: you cannot manage this account</span>}
            </div>

            <div className="row g-3 mb-4">
                <div className="col-6 col-xl-3">
                    <StatCard icon="bi-file-earmark-check" tone="green" label={billing.limit_covers_trial ? 'Tailored in trial' : 'Tailored this month'} value={billing.limit > 0 ? `${billing.used} / ${billing.limit}` : formatNumber(billing.used)} hint={`${billing.limit_covers_trial ? 'Trial ends' : 'Resets'} ${formatDate(billing.resets_at)}`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard icon="bi-archive" tone="indigo" label="Tailored all time" value={formatNumber(counts.tailored_resumes)} hint={`${uploadedResumes.length} uploaded CV${uploadedResumes.length === 1 ? '' : 's'}`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard icon="bi-cpu" tone="amber" label="AI today" value={formatNumber(aiUsageToday.requests)} hint={`${formatNumber(aiUsageToday.tokens)} tokens`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard icon="bi-briefcase" tone="sky" label="Job tracking" value={formatNumber(counts.saved_jobs)} hint={`saved jobs · ${counts.saved_searches} searches`} />
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-xl-7">
                    <section className="rt-card p-3 p-lg-4 h-100">
                        <h2 className="rt-card-title mb-3"><i className="bi bi-person-gear"></i>Account</h2>
                        <EditUserForm key={user.id} user={user} roles={roles} permissions={permissions} />
                    </section>
                </div>
                <div className="col-xl-5">
                    <section className="rt-card p-3 p-lg-4 h-100">
                        <h2 className="rt-card-title mb-3"><i className="bi bi-credit-card"></i>Plan &amp; billing</h2>
                        <dl className="row small mb-3">
                            <dt className="col-5 text-muted fw-normal">Stripe subscription</dt>
                            <dd className="col-7">{subscription ? `${subscription.status}${subscription.ends_at ? `, ends ${formatDate(subscription.ends_at)}` : ''}` : 'None'}</dd>
                            <dt className="col-5 text-muted fw-normal">Paid Pro (PKR)</dt>
                            <dd className="col-7">{user.pro_paid_until && new Date(user.pro_paid_until) > new Date() ? `Until ${formatDate(user.pro_paid_until)}` : 'None'} · <Link href={`/admin/payments?search=${encodeURIComponent(user.email)}`}>Payments</Link></dd>
                            <dt className="col-5 text-muted fw-normal">Pro trial</dt>
                            <dd className="col-7">{user.complimentary_pro ? `${formatDate(user.pro_started_at)} – ${formatDate(user.pro_until)} · ${describeTrialLimit(user.pro_tailor_limit)}` : 'None'}</dd>
                            {billing.source === 'trial' && (
                                <>
                                    <dt className="col-5 text-muted fw-normal">Trial for everyone</dt>
                                    <dd className="col-7">Until {formatDate(billing.trial_ends_at)}</dd>
                                </>
                            )}
                            <dt className="col-5 text-muted fw-normal">Stripe customer</dt>
                            <dd className="col-7">{user.has_stripe_account ? 'Yes' : 'No'}</dd>
                        </dl>
                        {permissions.manage && (
                            <>
                                <ProTrialForm key={user.pro_until ?? 'none'} url={`/admin/users/${user.id}/pro`} limits={trialLimits} submitLabel={user.complimentary_pro ? 'Replace Pro trial' : 'Give Pro trial'} idPrefix="user-trial" />
                                {user.complimentary_pro && (
                                    <button type="button" className="btn btn-sm btn-link text-danger px-0 mt-1" onClick={() => post('post', `/admin/users/${user.id}/pro`, { days: 0 }, 'Remove this Pro trial?')}>Remove Pro trial</button>
                                )}
                            </>
                        )}
                        <p className="small text-muted mt-3 mb-0">A Pro trial needs no payment and does not touch Stripe. Giving a new trial restarts its CV count. Paid subscriptions are managed in the Stripe dashboard.</p>
                    </section>
                </div>
            </div>

            <section className="rt-card mb-4">
                <div className="d-flex justify-content-between align-items-center p-3 p-lg-4 pb-2">
                    <h2 className="rt-card-title"><i className="bi bi-file-earmark-check"></i>Tailored resumes</h2>
                    {counts.tailored_resumes > tailoredResumes.length && <Link href={`/admin/resumes?user=${user.id}`} className="small">See all {counts.tailored_resumes}</Link>}
                </div>
                <div className="table-responsive">
                    <table className="table rt-admin-table">
                        <thead><tr><th>Job</th><th>Design</th><th>Score</th><th>Created</th><th></th></tr></thead>
                        <tbody>
                            {tailoredResumes.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No tailored resumes yet.</td></tr>}
                            {tailoredResumes.map((resume) => (
                                <tr key={resume.id}>
                                    <td className="fw-semibold">{resume.job_title || `Resume #${resume.id}`}</td>
                                    <td className="small">{resume.template}</td>
                                    <td><ScoreChange before={resume.original_score} after={resume.match_score} /></td>
                                    <td className="small text-muted text-nowrap">{formatDate(resume.created_at, true)}</td>
                                    <td className="text-end text-nowrap">
                                        <Link href={`/tailor/${resume.id}`} className="btn btn-sm rt-btn-soft me-1">Open</Link>
                                        <a href={`/download/${resume.id}`} className="btn btn-sm btn-outline-secondary" aria-label="Download PDF"><i className="bi bi-download"></i></a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rt-card p-3 p-lg-4">
                <h2 className="rt-card-title mb-3"><i className="bi bi-upload"></i>Uploaded CVs</h2>
                {uploadedResumes.length === 0 && <p className="text-muted small mb-0">No CVs uploaded.</p>}
                <div className="d-grid gap-2">
                    {uploadedResumes.map((resume) => (
                        <details key={resume.id} className="border rounded-3 p-3">
                            <summary className="d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ cursor: 'pointer' }}>
                                <span>
                                    <i className="bi bi-file-earmark-text me-2 text-muted"></i>
                                    <strong>{resume.original_filename}</strong>
                                    {resume.is_primary && <span className="badge text-bg-primary ms-2">Primary</span>}
                                    <span className="small text-muted ms-2">{formatNumber(resume.characters)} characters · {formatDate(resume.created_at)}</span>
                                </span>
                                {permissions.manage && (
                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={(event) => { event.preventDefault(); post('delete', `/admin/users/${user.id}/resumes/${resume.id}`, {}, `Delete ${resume.original_filename}?`); }}>
                                        <i className="bi bi-trash"></i>
                                    </button>
                                )}
                            </summary>
                            <pre className="rt-plain mt-3 mb-0" style={{ maxHeight: '18rem' }}>{resume.preview}{resume.characters > resume.preview.length ? '\n…' : ''}</pre>
                        </details>
                    ))}
                </div>
            </section>
        </AdminLayout>
    );
}
