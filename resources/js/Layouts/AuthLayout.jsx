import { Link } from '@inertiajs/react';
import React from 'react';
import MainLayout from './MainLayout';

const BENEFITS = [
    { icon: 'bi-speedometer2', title: 'Free ATS score', text: 'See how applicant tracking systems read your CV.' },
    { icon: 'bi-magic', title: 'Tailored in seconds', text: 'Match each job description with its own keywords.' },
    { icon: 'bi-shield-check', title: 'Truthful by design', text: 'We never invent experience you do not have.' },
];

/**
 * Split-screen shell for login, register and password pages: a brand panel on large screens and a
 * focused form column (with a compact brand header on phones).
 */
export default function AuthLayout({ title, subtitle, children, footer, seo }) {
    return (
        <MainLayout seo={seo || { title }} showFooter={false}>
            <div className="rt-auth">
                <aside className="rt-auth-aside">
                    <Link href="/" className="rt-brand rt-brand-light">
                        <span className="rt-brand-mark"><i className="bi bi-file-earmark-check"></i></span>
                        <span>ResumeTailor<span className="rt-brand-ai">AI</span></span>
                    </Link>

                    <div className="rt-auth-pitch">
                        <h2>Land more interviews with a resume built for every job.</h2>
                        <ul className="rt-auth-benefits">
                            {BENEFITS.map((benefit) => (
                                <li key={benefit.title}>
                                    <span className="rt-auth-benefit-icon"><i className={`bi ${benefit.icon}`}></i></span>
                                    <div>
                                        <strong>{benefit.title}</strong>
                                        <span>{benefit.text}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rt-auth-preview" aria-hidden="true">
                        <div className="rt-auth-preview-label">ATS match score</div>
                        <div className="rt-auth-preview-scores">
                            <div><span className="rt-auth-preview-before">48</span><small>Before</small></div>
                            <i className="bi bi-arrow-right"></i>
                            <div><span className="rt-auth-preview-after">91</span><small>Tailored</small></div>
                        </div>
                        <div className="rt-auth-preview-bar"><span style={{ width: '91%' }}></span></div>
                    </div>
                </aside>

                <main className="rt-auth-main">
                    <div className="rt-auth-top">
                        <Link href="/" className="rt-brand rt-auth-mobile-brand">
                            <span className="rt-brand-mark"><i className="bi bi-file-earmark-check"></i></span>
                            <span>ResumeTailor<span className="rt-brand-ai">AI</span></span>
                        </Link>
                        <Link href="/" className="rt-auth-back"><i className="bi bi-arrow-left"></i>Back to site</Link>
                    </div>

                    <div className="rt-auth-panel">
                        <h1 className="rt-auth-title">{title}</h1>
                        {subtitle && <p className="rt-auth-subtitle">{subtitle}</p>}
                        {children}
                        {footer}
                    </div>

                    <p className="rt-auth-legal">
                        <Link href="/terms">Terms</Link>
                        <span aria-hidden="true">·</span>
                        <Link href="/privacy">Privacy</Link>
                        <span aria-hidden="true">·</span>
                        <Link href="/contact">Help</Link>
                    </p>
                </main>
            </div>
        </MainLayout>
    );
}
