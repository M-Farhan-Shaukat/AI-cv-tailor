import { Head, Link, useForm } from '@inertiajs/react';
import React from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (event) => {
        event.preventDefault();
        post('/email/verification-notification');
    };

    return (
        <AuthLayout
            title="Verify your email"
            subtitle="We sent a verification link to your inbox. Click it to unlock your resume library and saved matches."
        >
            <Head title="Verify email" />

            {status === 'verification-link-sent' && (
                <div className="alert alert-success py-2 small">
                    A new verification link has been sent to your email address.
                </div>
            )}

            <form onSubmit={submit}>
                <button type="submit" className="btn btn-primary w-100" disabled={processing}>
                    {processing ? 'Sending...' : 'Resend verification email'}
                </button>
            </form>

            <p className="text-center text-muted small mt-4 mb-0">
                <Link href="/logout" method="post" as="button" className="btn btn-link btn-sm p-0">
                    Log out
                </Link>
            </p>
        </AuthLayout>
    );
}
