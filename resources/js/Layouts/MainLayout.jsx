import { Head, usePage } from '@inertiajs/react';
import React from 'react';
import Footer from '../Components/Footer';

/**
 * Public pages: title, description, canonical URL and Open Graph tags, the flash message and the footer.
 * Everything here renders the same on the server (SSR) and in the browser.
 */
export default function MainLayout({ children, seo = {} }) {
    const { props } = usePage();
    const siteName = props.site?.name || 'ResumeTailor AI';
    const title = seo.title ? `${seo.title} | ${siteName}` : `${siteName}: ATS resume checker and CV tailoring`;
    const description = seo.description || 'Check your CV against any job description, see your ATS score and tailor your resume with the job\'s keywords.';
    const canonical = props.site?.canonical;
    const flash = props.flash?.status;

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                {canonical && <link rel="canonical" href={canonical} />}
                <meta property="og:site_name" content={siteName} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content={seo.type || 'website'} />
                {canonical && <meta property="og:url" content={canonical} />}
                <meta name="twitter:card" content="summary" />
            </Head>
            <main className="position-relative min-vh-100 d-flex flex-column">
                {flash && (
                    <div className="alert alert-success alert-dismissible fade show rounded-0 mb-0 py-2 text-center" role="status">
                        {flash}
                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                )}
                {children}
                <Footer />
            </main>
        </>
    );
}
