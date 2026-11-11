import { Head, Link, usePage } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

const NAVIGATION = [
    {
        group: 'Overview',
        items: [{ href: '/admin', label: 'Dashboard', icon: 'bi-grid-1x2', exact: true }],
    },
    {
        group: 'Manage',
        items: [
            { href: '/admin/users', label: 'Users', icon: 'bi-people' },
            { href: '/admin/resumes', label: 'Tailored resumes', icon: 'bi-file-earmark-text' },
        ],
    },
    {
        group: 'Content',
        items: [
            { href: '/admin/posts', label: 'Blog posts', icon: 'bi-journal-text' },
            { href: '/admin/messages', label: 'Messages', icon: 'bi-inbox' },
        ],
    },
    {
        group: 'System',
        items: [
            { href: '/admin/ai-keys', label: 'AI keys', icon: 'bi-key' },
            { href: '/admin/jobs', label: 'Job feeds', icon: 'bi-broadcast' },
            { href: '/admin/adsense', label: 'AdSense', icon: 'bi-badge-ad' },
            { href: '/admin/settings', label: 'Settings', icon: 'bi-gear' },
        ],
    },
];

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'A';

/**
 * The admin shell: a dark sidebar with grouped sections and the signed-in admin, a top bar with the
 * page title and actions, and toast messages for actions that redirect back with a status.
 */
export default function AdminLayout({ title, subtitle, actions = null, children, seo }) {
    const { url, props } = usePage();
    const path = url.split('?')[0];
    const user = props.auth?.user;
    const errors = props.errors ?? {};
    const status = props.flash?.status;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState(status);

    useEffect(() => {
        setToast(status);
        if (!status) {
            return undefined;
        }
        const timeout = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timeout);
    }, [status, url]);

    useEffect(() => setIsSidebarOpen(false), [url]);

    const isActive = (item) => (item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`));
    const pageTitle = seo?.title ?? title;

    return (
        <div className="rt-admin">
            <Head>
                <title>{`${pageTitle} · Admin`}</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <aside className={`rt-admin-sidebar ${isSidebarOpen ? 'is-open' : ''}`} aria-label="Admin navigation">
                <div className="rt-admin-brand">
                    <span className="rt-brand-mark"><i className="bi bi-file-earmark-check"></i></span>
                    <div>
                        <div className="fw-bold">ResumeTailor</div>
                        <div className="rt-admin-brand-sub">Admin console</div>
                    </div>
                </div>

                <nav className="rt-admin-menu">
                    {NAVIGATION.map((section) => (
                        <div key={section.group} className="mb-3">
                            <div className="rt-admin-group">{section.group}</div>
                            {section.items.map((item) => (
                                <Link key={item.href} href={item.href} className={`rt-admin-item ${isActive(item) ? 'is-active' : ''}`}>
                                    <i className={`bi ${item.icon}`}></i>
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="rt-admin-account">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="rt-admin-avatar">{initials(user?.name)}</span>
                        <div className="min-w-0">
                            <div className="fw-semibold text-truncate">{user?.name}</div>
                            <div className="rt-admin-brand-sub">{user?.is_super_admin ? 'Super admin' : 'Admin'}</div>
                        </div>
                    </div>
                    <div className="d-grid gap-1">
                        <Link href="/" className="rt-admin-item"><i className="bi bi-box-arrow-up-right"></i><span>View site</span></Link>
                        <Link href="/profile" className="rt-admin-item"><i className="bi bi-person"></i><span>My profile</span></Link>
                        <Link href="/logout" method="post" as="button" className="rt-admin-item w-100 border-0 bg-transparent text-start"><i className="bi bi-box-arrow-right"></i><span>Log out</span></Link>
                    </div>
                </div>
            </aside>

            {isSidebarOpen && <button type="button" className="rt-admin-backdrop" aria-label="Close menu" onClick={() => setIsSidebarOpen(false)}></button>}

            <div className="rt-admin-main">
                <header className="rt-admin-topbar">
                    <button type="button" className="btn btn-sm btn-light border d-lg-none" aria-label="Open menu" onClick={() => setIsSidebarOpen(true)}>
                        <i className="bi bi-list"></i>
                    </button>
                    <span className="fw-semibold d-sm-none">{title}</span>
                    <nav aria-label="Breadcrumb" className="small text-muted d-none d-sm-block">
                        <Link href="/admin" className="text-decoration-none text-muted">Admin</Link>
                        <i className="bi bi-chevron-right mx-2 small"></i>
                        <span className="text-body fw-semibold">{title}</span>
                    </nav>
                    <div className="ms-auto d-flex align-items-center gap-2">
                        <span className="badge rounded-pill text-bg-light border d-none d-md-inline-flex align-items-center gap-1">
                            <span className="rt-admin-dot"></span>Live
                        </span>
                    </div>
                </header>

                <main className="rt-admin-content">
                    <div className="rt-admin-header">
                        <div className="min-w-0">
                            <h1 className="rt-admin-title">{title}</h1>
                            {subtitle && <p className="rt-admin-subtitle">{subtitle}</p>}
                        </div>
                        {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
                    </div>

                    {errors.user && (
                        <div className="alert alert-danger d-flex gap-2 align-items-start" role="alert">
                            <i className="bi bi-exclamation-octagon mt-1"></i><span>{errors.user}</span>
                        </div>
                    )}

                    {children}
                </main>
            </div>

            {toast && (
                <div className="rt-admin-toast" role="status">
                    <i className="bi bi-check-circle-fill"></i>
                    <span>{toast}</span>
                    <button type="button" className="btn-close btn-close-white ms-2" aria-label="Dismiss" onClick={() => setToast(null)}></button>
                </div>
            )}
        </div>
    );
}
