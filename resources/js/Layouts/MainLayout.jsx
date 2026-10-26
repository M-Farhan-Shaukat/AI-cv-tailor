import { Head, usePage } from '@inertiajs/react';
import React from 'react';

export default function MainLayout({ children, seo = {} }) {
    const { props } = usePage();
    const appName = import.meta.env.VITE_APP_NAME || 'AI Resume Tailor & ATS';

    const title = seo.title ? `${seo.title} | ${appName}` : appName;
    const description = seo.description || 'AI-Powered Resume Tailor & ATS Platform.';
    const url = typeof window !== 'undefined' ? window.location.href : props?.appUrl || '/';

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={url} />
            </Head>
            <main className="position-relative min-vh-100 d-flex flex-column">
                {children}
            </main>
        </>
    );
}
