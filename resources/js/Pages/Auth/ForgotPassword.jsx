import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit = (event) => {
        event.preventDefault();
        post('/forgot-password');
    };

    return (
        <AuthLayout
            title="Forgot your password?"
            subtitle="Enter your email and we will send you a link to reset it."
        >
            <Head title="Forgot password" />

            {status && <div className="alert alert-success py-2 small">{status}</div>}

            <form onSubmit={submit} noValidate>
                <div className="mb-4">
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

                <button type="submit" className="btn btn-primary w-100" disabled={processing}>
                    {processing ? 'Sending...' : 'Email password reset link'}
                </button>
            </form>

            <p className="text-center text-muted small mt-4 mb-0">
                <Link href="/login">Back to log in</Link>
            </p>
        </AuthLayout>
    );
}
