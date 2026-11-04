import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();
        post('/reset-password', { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <AuthLayout title="Reset your password" subtitle="Choose a new password for your account.">
            <Head title="Reset password" />

            <form onSubmit={submit} noValidate>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">Email</label>
                    <input
                        id="email"
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        value={data.email}
                        autoComplete="username"
                        onChange={(event) => setData('email', event.target.value)}
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold">New password</label>
                    <input
                        id="password"
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={data.password}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(event) => setData('password', event.target.value)}
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>

                <div className="mb-4">
                    <label htmlFor="password_confirmation" className="form-label fw-semibold">Confirm password</label>
                    <input
                        id="password_confirmation"
                        type="password"
                        className="form-control"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(event) => setData('password_confirmation', event.target.value)}
                    />
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={processing}>
                    {processing ? 'Resetting...' : 'Reset password'}
                </button>
            </form>
        </AuthLayout>
    );
}
