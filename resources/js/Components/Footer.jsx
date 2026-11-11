import { Link, usePage } from '@inertiajs/react';
import React from 'react';

/**
 * The site footer, shared by every public page through MainLayout. Links only go to pages that exist.
 */
export default function Footer() {
    const user = usePage().props.auth?.user;
    const year = new Date().getFullYear();

    const columns = [
        {
            title: 'Product',
            links: [
                { href: '/', label: 'Tailor a resume' },
                { href: '/#how-it-works', label: 'How it works' },
                { href: '/jobs', label: 'Job matches' },
                { href: '/pricing', label: 'Pricing' },
            ],
        },
        {
            title: user ? 'Your account' : 'Get started',
            links: user
                ? [
                    { href: '/resumes', label: 'My resumes' },
                    { href: '/saved-jobs', label: 'Saved jobs' },
                    { href: '/saved-searches', label: 'Saved searches' },
                    { href: '/profile', label: 'Profile & billing' },
                ]
                : [
                    { href: '/register', label: 'Create a free account' },
                    { href: '/login', label: 'Log in' },
                    { href: '/pricing', label: 'Compare plans' },
                ],
        },
        {
            title: 'Company',
            links: [
                { href: '/about', label: 'About us' },
                { href: '/blog', label: 'Guides' },
                { href: '/contact', label: 'Contact' },
                { href: '/pricing#faq', label: 'FAQ' },
            ],
        },
        {
            title: 'Legal',
            links: [
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Service' },
            ],
        },
    ];

    return (
        <footer className="rt-site-footer mt-auto">
            <div className="container">
                <div className="row g-4 g-lg-5 rt-site-footer-top">
                    <div className="col-lg-4">
                        <Link href="/" className="rt-brand rt-brand-light mb-3">
                            <span className="rt-brand-mark"><i className="bi bi-file-earmark-check"></i></span>
                            <span>ResumeTailor<span className="rt-brand-ai">AI</span></span>
                        </Link>
                        <p className="rt-site-footer-lead">
                            Score your CV against any job description, tailor it with the job's own keywords and download an
                            ATS-safe resume that applicant tracking systems can read.
                        </p>
                        <div className="rt-site-footer-badges">
                            <span><i className="bi bi-shield-check"></i>Truthful rewrites</span>
                            <span><i className="bi bi-file-earmark-check"></i>ATS-safe PDFs</span>
                            <span><i className="bi bi-lock"></i>Secure payments</span>
                        </div>
                    </div>

                    {columns.map((column) => (
                        <div key={column.title} className="col-6 col-md-3 col-lg-2">
                            <h2 className="rt-site-footer-title">{column.title}</h2>
                            <ul className="list-unstyled mb-0">
                                {column.links.map((link) => (
                                    <li key={`${column.title}-${link.label}`}>
                                        <Link href={link.href} className="rt-site-footer-link">{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="rt-site-footer-cta">
                    <div>
                        <div className="fw-semibold text-white">Check your ATS score in seconds</div>
                        <div className="small">Free and unlimited. No sign-up needed.</div>
                    </div>
                    <Link href="/" className="btn rt-btn-primary px-4">Check my CV</Link>
                </div>

                <div className="rt-site-footer-bottom">
                    <span>&copy; {year} ResumeTailor AI. All rights reserved.</span>
                    <span><i className="bi bi-lock-fill me-1"></i>Your CV is only used to score and tailor your resume.</span>
                </div>
            </div>
        </footer>
    );
}
