import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Login({ canResetPassword, status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event) => {
        event.preventDefault();
        post('/login', { onFinish: () => reset('password') });
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Log in to keep your resume library and job matches in sync.">
            <Head title="Log in" />

            {status && <div className="alert alert-success py-2 small">{status}</div>}

            <form onSubmit={submit} noValidate>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">Email</label>
                    <input
                        id="email"
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(event) => setData('email', event.target.value)}
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold">Password</label>
                    <input
                        id="password"
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(event) => setData('password', event.target.value)}
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                        <input
                            id="remember"
                            type="checkbox"
                            className="form-check-input"
                            checked={data.remember}
                            onChange={(event) => setData('remember', event.target.checked)}
                        />
                        <label htmlFor="remember" className="form-check-label small">Remember me</label>
                    </div>
                    {canResetPassword && (
                        <Link href="/forgot-password" className="small">Forgot password?</Link>
                    )}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={processing}>
                    {processing ? 'Logging in...' : 'Log in'}
                </button>
            </form>

            <p className="text-center text-muted small mt-4 mb-0">
                New here? <Link href="/register">Create an account</Link>
            </p>
        </AuthLayout>
    );
}
