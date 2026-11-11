import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

const formatDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null);

/**
 * The account's plan, this month's usage and the way to upgrade or manage billing.
 */
function PlanCard({ billing, hasBillingAccount, subscriptionEndsAt }) {
    if (!billing) {
        return null;
    }

    const isPro = billing.plan === 'pro';
    const used = billing.limit > 0 ? Math.min(billing.used, billing.limit) : billing.used;

    return (
        <section className={`rt-usage mb-4 ${!isPro && billing.remaining === 0 ? 'is-empty' : ''}`}>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <h2 className="h6 fw-bold mb-0">Plan &amp; billing</h2>
                {isPro ? <span className="rt-plan-pill"><i className="bi bi-stars"></i>Pro</span> : <span className="badge text-bg-light border">Free</span>}
            </div>

            {billing.limit > 0 ? (
                <>
                    <div className="d-flex justify-content-between small mb-1">
                        <span>Tailored CVs this month</span>
                        <span className="fw-semibold">{used} / {billing.limit}</span>
                    </div>
                    <div className="rt-usage-bar mb-2" role="progressbar" aria-valuemin={0} aria-valuemax={billing.limit} aria-valuenow={used} aria-label="Tailored CVs used this month">
                        <span style={{ width: `${(used / billing.limit) * 100}%` }}></span>
                    </div>
                </>
            ) : (
                <p className="small mb-2">Unlimited tailored CVs · {billing.used} this month</p>
            )}

            <p className="small text-muted mb-3">
                {subscriptionEndsAt
                    ? `Your Pro subscription is cancelled and ends on ${formatDate(subscriptionEndsAt)}.`
                    : `Usage resets on ${formatDate(billing.resets_at)}. ATS score checks are always free.`}
            </p>

            <div className="d-flex flex-wrap gap-2">
                {isPro ? (
                    hasBillingAccount && <a href="/billing/portal" className="btn btn-sm rt-btn-soft"><i className="bi bi-credit-card me-1"></i>Manage billing &amp; invoices</a>
                ) : (
                    <Link href="/pricing" className="btn btn-sm rt-btn-primary px-3 py-1"><i className="bi bi-lightning-charge-fill me-1"></i>Upgrade to Pro</Link>
                )}
                {!isPro && hasBillingAccount && <a href="/billing/portal" className="btn btn-sm btn-link text-muted">Billing history</a>}
            </div>
        </section>
    );
}

export default function Edit({ mustVerifyEmail, status, hasBillingAccount = false, subscriptionEndsAt = null }) {
    const { auth, billing } = usePage().props;
    const user = auth.user;

    const profileForm = useForm({ name: user.name, email: user.email });
    const passwordForm = useForm({ current_password: '', password: '', password_confirmation: '' });
    const deleteForm = useForm({ password: '' });

    const updateProfile = (event) => {
        event.preventDefault();
        profileForm.patch('/profile', { preserveScroll: true });
    };

    const updatePassword = (event) => {
        event.preventDefault();
        passwordForm.put('/password', {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    };

    const deleteAccount = (event) => {
        event.preventDefault();
        if (window.confirm('Delete your account permanently? This cannot be undone.')) {
            deleteForm.delete('/profile');
        }
    };

    return (
        <AuthLayout title="Your profile" subtitle="Update your account details and password.">
            <Head title="Profile" />

            {status && <div className="alert alert-success py-2 small">{status}</div>}

            <div className="d-flex flex-wrap gap-2 mb-4">
                <Link href="/resumes" className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-file-earmark-text me-1"></i> Manage resumes
                </Link>
                {mustVerifyEmail && !user.email_verified && (
                    <span className="badge text-bg-warning align-self-center">Email not verified</span>
                )}
            </div>

            <PlanCard billing={billing} hasBillingAccount={hasBillingAccount} subscriptionEndsAt={subscriptionEndsAt} />

            <form onSubmit={updateProfile} noValidate className="mb-4">
                <h2 className="h6 fw-bold mb-3">Profile information</h2>

                <div className="mb-3">
                    <label htmlFor="name" className="form-label fw-semibold">Name</label>
                    <input
                        id="name"
                        type="text"
                        className={`form-control ${profileForm.errors.name ? 'is-invalid' : ''}`}
                        value={profileForm.data.name}
                        onChange={(event) => profileForm.setData('name', event.target.value)}
                    />
                    {profileForm.errors.name && <div className="invalid-feedback">{profileForm.errors.name}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">Email</label>
                    <input
                        id="email"
                        type="email"
                        className={`form-control ${profileForm.errors.email ? 'is-invalid' : ''}`}
                        value={profileForm.data.email}
                        onChange={(event) => profileForm.setData('email', event.target.value)}
                    />
                    {profileForm.errors.email && <div className="invalid-feedback">{profileForm.errors.email}</div>}
                </div>

                <button type="submit" className="btn btn-primary" disabled={profileForm.processing}>
                    Save profile
                </button>
            </form>

            <hr className="my-4" />

            <form onSubmit={updatePassword} noValidate className="mb-4">
                <h2 className="h6 fw-bold mb-3">Update password</h2>

                <div className="mb-3">
                    <label htmlFor="current_password" className="form-label fw-semibold">Current password</label>
                    <input
                        id="current_password"
                        type="password"
                        className={`form-control ${passwordForm.errors.current_password ? 'is-invalid' : ''}`}
                        value={passwordForm.data.current_password}
                        autoComplete="current-password"
                        onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                    />
                    {passwordForm.errors.current_password && (
                        <div className="invalid-feedback">{passwordForm.errors.current_password}</div>
                    )}
                </div>

                <div className="mb-3">
                    <label htmlFor="new_password" className="form-label fw-semibold">New password</label>
                    <input
                        id="new_password"
                        type="password"
                        className={`form-control ${passwordForm.errors.password ? 'is-invalid' : ''}`}
                        value={passwordForm.data.password}
                        autoComplete="new-password"
                        onChange={(event) => passwordForm.setData('password', event.target.value)}
                    />
                    {passwordForm.errors.password && <div className="invalid-feedback">{passwordForm.errors.password}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="password_confirmation" className="form-label fw-semibold">Confirm new password</label>
                    <input
                        id="password_confirmation"
                        type="password"
                        className="form-control"
                        value={passwordForm.data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)}
                    />
                </div>

                <button type="submit" className="btn btn-primary" disabled={passwordForm.processing}>
                    Update password
                </button>
            </form>

            <hr className="my-4" />

            <form onSubmit={deleteAccount} noValidate>
                <h2 className="h6 fw-bold mb-2">Delete account</h2>
                <p className="text-muted small">
                    This removes your account, saved resumes, and matches. Download any tailored resumes you need first.
                    {billing?.plan === 'pro' && !subscriptionEndsAt && ' Cancel your Pro subscription from the billing page first.'}
                </p>

                <div className="mb-3">
                    <label htmlFor="delete_password" className="form-label fw-semibold">Password</label>
                    <input
                        id="delete_password"
                        type="password"
                        className={`form-control ${deleteForm.errors.password ? 'is-invalid' : ''}`}
                        value={deleteForm.data.password}
                        onChange={(event) => deleteForm.setData('password', event.target.value)}
                    />
                    {deleteForm.errors.password && <div className="invalid-feedback">{deleteForm.errors.password}</div>}
                </div>

                <button type="submit" className="btn btn-outline-danger" disabled={deleteForm.processing}>
                    Delete account
                </button>
            </form>
        </AuthLayout>
    );
}
