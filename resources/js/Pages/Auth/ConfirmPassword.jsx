import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const submit = (event) => {
        event.preventDefault();
        post('/confirm-password', { onFinish: () => reset('password') });
    };

    return (
        <AuthLayout
            title="Confirm your password"
            subtitle="This is a secure area. Please confirm your password before continuing."
        >
            <Head title="Confirm password" />

            <form onSubmit={submit} noValidate>
                <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">Password</label>
                    <input
                        id="password"
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={data.password}
                        autoComplete="current-password"
                        autoFocus
                        onChange={(event) => setData('password', event.target.value)}
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={processing}>
                    {processing ? 'Confirming...' : 'Confirm'}
                </button>
            </form>
        </AuthLayout>
    );
}
