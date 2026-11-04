import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Edit({ mustVerifyEmail, status }) {
    const user = usePage().props.auth.user;

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
