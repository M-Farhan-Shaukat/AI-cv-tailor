import { Link, usePage } from '@inertiajs/react';
import React from 'react';

export default function NavBar({ children = null }) {
    const user = usePage().props.auth?.user;

    return (
        <nav className="rt-nav">
            <div className="container d-flex align-items-center justify-content-between py-3">
                <a href="/" className="rt-brand">
                    <span className="rt-brand-mark"><i className="bi bi-file-earmark-check"></i></span>
                    ResumeTailor<span style={{ color: 'var(--rt-primary)' }}>AI</span>
                </a>
                <div className="d-flex align-items-center gap-3 gap-md-4">
                    {children}
                    <Link href="/jobs" className="rt-nav-link">Job matches</Link>
                    <Link href="/" className="rt-nav-link">Tailor a resume</Link>
                    {user ? (
                        <>
                            <Link href="/resumes" className="rt-nav-link d-none d-md-inline">My resumes</Link>
                            <Link href="/saved-jobs" className="rt-nav-link d-none d-lg-inline">Saved jobs</Link>
                            <Link href="/saved-searches" className="rt-nav-link d-none d-xl-inline">Searches</Link>
                            {user.is_admin && (
                                <Link href="/admin/jobs" className="rt-nav-link d-none d-xl-inline">Admin</Link>
                            )}
                            <Link href="/profile" className="rt-nav-link d-none d-sm-inline" title="Profile">
                                <i className="bi bi-person-circle me-1"></i>{user.name}
                            </Link>
                            <Link href="/logout" method="post" as="button" className="btn btn-sm btn-outline-secondary">
                                Log out
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="rt-nav-link">Log in</Link>
                            <Link href="/register" className="btn btn-sm btn-primary">Sign up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
