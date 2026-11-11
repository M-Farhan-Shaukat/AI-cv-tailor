import { Link, usePage } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

const PRIMARY_LINKS = [
    { href: '/', label: 'Tailor a resume', icon: 'bi-magic', exact: true },
    { href: '/jobs', label: 'Job matches', icon: 'bi-briefcase' },
    { href: '/blog', label: 'Guides', icon: 'bi-journal-text' },
    { href: '/pricing', label: 'Pricing', icon: 'bi-tag' },
];

const ACCOUNT_LINKS = [
    { href: '/resumes', label: 'My resumes', icon: 'bi-file-earmark-person' },
    { href: '/saved-jobs', label: 'Saved jobs', icon: 'bi-bookmark-star' },
    { href: '/saved-searches', label: 'Saved searches', icon: 'bi-bell' },
    { href: '/profile', label: 'Profile & billing', icon: 'bi-person-gear' },
];

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'U';

/**
 * The site navbar, the same on every page: brand on the left, the main sections in the middle, then
 * the account (or log in / sign up) and, last, the plan badge. Collapses into a menu below 992px.
 */
export default function NavBar() {
    const { auth, billing } = usePage().props;
    const url = usePage().url.split('?')[0];
    const user = auth?.user;
    const isPro = billing?.plan === 'pro';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const accountRef = useRef(null);

    useEffect(() => {
        setIsMenuOpen(false);
        setIsAccountOpen(false);
    }, [url]);

    useEffect(() => {
        if (!isAccountOpen) {
            return undefined;
        }
        const close = (event) => {
            if (event.type === 'keydown' ? event.key === 'Escape' : !accountRef.current?.contains(event.target)) {
                setIsAccountOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [isAccountOpen]);

    const isActive = (link) => (link.exact ? url === link.href : url === link.href || url.startsWith(`${link.href}/`));

    const planBadge = user && (isPro ? (
        <Link href="/pricing" className="rt-plan-pill" title="You are on Pro"><i className="bi bi-stars"></i>Pro</Link>
    ) : (
        <Link href="/pricing" className="rt-nav-upgrade"><i className="bi bi-lightning-charge-fill"></i>Upgrade</Link>
    ));

    return (
        <nav className="rt-nav" aria-label="Main">
            <div className="container rt-nav-bar">
                <Link href="/" className="rt-brand">
                    <span className="rt-brand-mark"><i className="bi bi-file-earmark-check"></i></span>
                    <span>ResumeTailor<span className="rt-brand-ai">AI</span></span>
                </Link>

                <div className="rt-nav-primary d-none d-lg-flex">
                    {PRIMARY_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} className={`rt-nav-link ${isActive(link) ? 'is-active' : ''}`} aria-current={isActive(link) ? 'page' : undefined}>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="rt-nav-actions d-none d-lg-flex">
                    {user ? (
                        <div className="position-relative" ref={accountRef}>
                            <button
                                type="button"
                                className={`rt-account-toggle ${isAccountOpen ? 'is-open' : ''}`}
                                aria-haspopup="menu"
                                aria-expanded={isAccountOpen}
                                onClick={() => setIsAccountOpen((open) => !open)}
                            >
                                <span className="rt-account-avatar">{initials(user.name)}</span>
                                <span className="rt-account-name">{user.name}</span>
                                <i className="bi bi-chevron-down small"></i>
                            </button>
                            {isAccountOpen && (
                                <div className="rt-account-menu" role="menu">
                                    <div className="rt-account-head">
                                        <div className="fw-semibold text-truncate">{user.name}</div>
                                        <div className="small text-muted text-truncate">{user.email}</div>
                                    </div>
                                    {ACCOUNT_LINKS.map((link) => (
                                        <Link key={link.href} href={link.href} className="rt-account-item" role="menuitem">
                                            <i className={`bi ${link.icon}`}></i>{link.label}
                                        </Link>
                                    ))}
                                    {user.is_admin && (
                                        <Link href="/admin" className="rt-account-item" role="menuitem"><i className="bi bi-shield-lock"></i>Admin console</Link>
                                    )}
                                    <div className="rt-account-divider"></div>
                                    <Link href="/logout" method="post" as="button" className="rt-account-item is-danger" role="menuitem">
                                        <i className="bi bi-box-arrow-right"></i>Log out
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className="rt-nav-link">Log in</Link>
                            <Link href="/register" className="btn rt-btn-primary rt-nav-cta">Sign up free</Link>
                        </>
                    )}
                    {planBadge}
                </div>

                <div className="d-flex d-lg-none align-items-center gap-2 ms-auto">
                    {planBadge}
                    <button
                        type="button"
                        className="rt-nav-burger"
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                        onClick={() => setIsMenuOpen((open) => !open)}
                    >
                        <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="rt-nav-menu d-lg-none">
                    <div className="container py-3">
                        {PRIMARY_LINKS.map((link) => (
                            <Link key={link.href} href={link.href} className={`rt-mobile-link ${isActive(link) ? 'is-active' : ''}`}>
                                <i className={`bi ${link.icon}`}></i>{link.label}
                            </Link>
                        ))}
                        <div className="rt-account-divider my-2"></div>
                        {user ? (
                            <>
                                <div className="d-flex align-items-center gap-2 px-2 py-2">
                                    <span className="rt-account-avatar">{initials(user.name)}</span>
                                    <div className="min-w-0">
                                        <div className="fw-semibold text-truncate">{user.name}</div>
                                        <div className="small text-muted text-truncate">{user.email}</div>
                                    </div>
                                </div>
                                {ACCOUNT_LINKS.map((link) => (
                                    <Link key={link.href} href={link.href} className={`rt-mobile-link ${isActive(link) ? 'is-active' : ''}`}>
                                        <i className={`bi ${link.icon}`}></i>{link.label}
                                    </Link>
                                ))}
                                {user.is_admin && <Link href="/admin" className="rt-mobile-link"><i className="bi bi-shield-lock"></i>Admin console</Link>}
                                <Link href="/logout" method="post" as="button" className="rt-mobile-link is-danger w-100 text-start">
                                    <i className="bi bi-box-arrow-right"></i>Log out
                                </Link>
                            </>
                        ) : (
                            <div className="d-grid gap-2 pt-1">
                                <Link href="/register" className="btn rt-btn-primary">Sign up free</Link>
                                <Link href="/login" className="btn btn-light border">Log in</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
