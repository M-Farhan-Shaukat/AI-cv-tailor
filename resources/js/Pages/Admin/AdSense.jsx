import { useForm } from '@inertiajs/react';
import React from 'react';
import AdminLayout from '../../Layouts/AdminLayout';

const CHECKLIST = [
    ['Deploy the site on your own domain with HTTPS', 'AdSense cannot review localhost.'],
    ['Publish 15–30 original guides in Blog posts', 'Thin or tool-only sites are the most common rejection.'],
    ['Privacy, Terms, About and Contact pages', 'Done: linked in the footer.'],
    ['Add your publisher ID below and save', 'Adds the verification meta tag and /ads.txt.'],
    ['In AdSense, add the site and request review', 'Choose the "meta tag" or "ads.txt" verification.'],
    ['Turn on Google\'s consent message (Privacy & messaging)', 'Required for visitors from the EEA, UK and Switzerland.'],
    ['After approval, create two display ad units and paste their IDs below', 'Then switch ads on.'],
];

export default function AdSense({ settings, adsTxt, adsTxtUrl, sitemapUrl, canManage, seo }) {
    const form = useForm({ ...settings });

    const submit = (event) => {
        event.preventDefault();
        form.put('/admin/adsense', { preserveScroll: true });
    };

    const field = (name, label, placeholder, help) => (
        <div className="mb-3">
            <label htmlFor={name} className="form-label fw-semibold small">{label}</label>
            <input id={name} className={`form-control rt-key-mono ${form.errors[name] ? 'is-invalid' : ''}`} placeholder={placeholder} value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)} disabled={!canManage} />
            {form.errors[name] ? <div className="invalid-feedback">{form.errors[name]}</div> : <div className="form-text">{help}</div>}
        </div>
    );

    return (
        <AdminLayout title="AdSense" subtitle="Google AdSense settings. Ads only show on blog pages, and never to Pro members." seo={seo}>
            <div className="row g-4">
                <div className="col-xl-7">
                    <form className="rt-card p-3 p-lg-4 mb-4" onSubmit={submit} noValidate>
                        <h2 className="rt-card-title mb-3"><i className="bi bi-badge-ad"></i>Settings</h2>
                        {field('client', 'Publisher ID', 'ca-pub-1234567890123456', 'From AdSense → Account → Account information. Starts with ca-pub-.')}
                        <div className="row">
                            <div className="col-md-6">{field('slot_in_article', 'In-article ad unit ID', '1234567890', 'Shown after each blog article.')}</div>
                            <div className="col-md-6">{field('slot_in_feed', 'Blog list ad unit ID', '1234567890', 'Shown between guides on the blog page.')}</div>
                        </div>
                        <div className="form-check form-switch mb-3">
                            <input id="enabled" type="checkbox" role="switch" className="form-check-input" checked={form.data.enabled} onChange={(event) => form.setData('enabled', event.target.checked)} disabled={!canManage} />
                            <label htmlFor="enabled" className="form-check-label fw-semibold">Show ads</label>
                            <div className="form-text">Keep this off until AdSense approves the site. The verification tag and ads.txt work either way.</div>
                        </div>
                        {canManage
                            ? <button type="submit" className="btn rt-btn-primary px-4 py-2" disabled={form.processing || !form.isDirty}>{form.processing ? 'Saving...' : 'Save settings'}</button>
                            : <div className="alert alert-light border small mb-0"><i className="bi bi-lock me-1"></i>Only super admins can change AdSense settings.</div>}
                    </form>

                    <section className="rt-card p-3 p-lg-4">
                        <h2 className="rt-card-title mb-3"><i className="bi bi-file-earmark-code"></i>Files for Google</h2>
                        <dl className="row small mb-0">
                            <dt className="col-sm-3 text-muted fw-normal">ads.txt</dt>
                            <dd className="col-sm-9">
                                {adsTxt ? <><a href={adsTxtUrl} target="_blank" rel="noreferrer">{adsTxtUrl}</a><code className="d-block mt-1">{adsTxt}</code></> : <span className="text-muted">Appears once a publisher ID is saved.</span>}
                            </dd>
                            <dt className="col-sm-3 text-muted fw-normal">Sitemap</dt>
                            <dd className="col-sm-9"><a href={sitemapUrl} target="_blank" rel="noreferrer">{sitemapUrl}</a><div className="text-muted">Submit it in Google Search Console.</div></dd>
                        </dl>
                    </section>
                </div>

                <div className="col-xl-5">
                    <section className="rt-card p-3 p-lg-4">
                        <h2 className="rt-card-title mb-3"><i className="bi bi-list-check"></i>Approval checklist</h2>
                        <ol className="ps-3 mb-0 d-grid gap-2 small">
                            {CHECKLIST.map(([step, note]) => (
                                <li key={step}><div className="fw-semibold">{step}</div><div className="text-muted">{note}</div></li>
                            ))}
                        </ol>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
