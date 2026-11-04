import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();
        post('/register', { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <AuthLayout title="Create your account" subtitle="Save your CV once and get ranked job matches from live postings.">
            <Head title="Sign up" />

            <form onSubmit={submit} noValidate>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label fw-semibold">Name</label>
                    <input
                        id="name"
                        type="text"
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        value={data.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(event) => setData('name', event.target.value)}
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

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
                    <label htmlFor="password" className="form-label fw-semibold">Password</label>
                    <input
                        id="password"
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={data.password}
                        autoComplete="new-password"
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
                    {processing ? 'Creating account...' : 'Create account'}
                </button>
            </form>

            <p className="text-center text-muted small mt-4 mb-0">
                Already registered? <Link href="/login">Log in</Link>
            </p>
        </AuthLayout>
    );
}
