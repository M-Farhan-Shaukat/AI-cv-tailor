import { useForm } from '@inertiajs/react';
import React from 'react';
import NavBar from '../../Components/NavBar';
import PageHero from '../../Components/PageHero';
import MainLayout from '../../Layouts/MainLayout';

export default function Contact({ contactEmail, defaults, seo }) {
    const form = useForm({ name: defaults.name, email: defaults.email, subject: '', message: '', website: '' });

    const submit = (event) => {
        event.preventDefault();
        form.post('/contact', {
            preserveScroll: true,
            onSuccess: () => form.reset('subject', 'message'),
        });
    };

    const field = (name, label, props = {}) => (
        <div className="mb-3">
            <label htmlFor={name} className="form-label fw-semibold small">{label}</label>
            <input id={name} className={`form-control ${form.errors[name] ? 'is-invalid' : ''}`} value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)} {...props} />
            {form.errors[name] && <div className="invalid-feedback">{form.errors[name]}</div>}
        </div>
    );

    return (
        <MainLayout seo={seo}>
            <NavBar />
            <PageHero eyebrow="Contact" icon="bi-envelope" title="Get in touch" lead="Questions about your score, billing or your account? Send us a message and we will get back to you." />

            <div className="container pb-5" style={{ maxWidth: '62rem' }}>
                <div className="row g-4 rt-overlap">
                    <div className="col-lg-7">
                        <form className="rt-card p-4 p-lg-5 h-100" onSubmit={submit} noValidate>
                            <h2 className="h5 fw-bold mb-3">Send a message</h2>
                            <div className="row g-0 gx-md-3">
                                <div className="col-md-6">{field('name', 'Your name', { autoComplete: 'name', maxLength: 100 })}</div>
                                <div className="col-md-6">{field('email', 'Email', { type: 'email', autoComplete: 'email' })}</div>
                            </div>
                            {field('subject', 'Subject', { maxLength: 150, placeholder: 'e.g. Question about Pro' })}
                            <div className="mb-3">
                                <label htmlFor="message" className="form-label fw-semibold small">Message</label>
                                <textarea id="message" rows="6" maxLength={5000} className={`form-control ${form.errors.message ? 'is-invalid' : ''}`} value={form.data.message} onChange={(event) => form.setData('message', event.target.value)} />
                                {form.errors.message && <div className="invalid-feedback">{form.errors.message}</div>}
                            </div>
                            <div className="rt-honeypot" aria-hidden="true">
                                <label htmlFor="website">Website</label>
                                <input id="website" tabIndex={-1} autoComplete="off" value={form.data.website} onChange={(event) => form.setData('website', event.target.value)} />
                            </div>
                            {form.errors.website && <div className="alert alert-danger py-2 small">{form.errors.website}</div>}
                            <button type="submit" className="btn rt-btn-primary px-4" disabled={form.processing}>
                                {form.processing ? 'Sending...' : <><i className="bi bi-send me-2"></i>Send message</>}
                            </button>
                        </form>
                    </div>
                    <div className="col-lg-5">
                        <div className="rt-card p-4 p-lg-5 h-100">
                            <h2 className="h5 fw-bold mb-3">Other ways to reach us</h2>
                            <ul className="list-unstyled d-grid gap-3 mb-0">
                                <li className="d-flex gap-3">
                                    <span className="rt-stat-icon rt-tone-indigo"><i className="bi bi-envelope"></i></span>
                                    <div><div className="fw-semibold">Email</div><a href={`mailto:${contactEmail}`}>{contactEmail}</a></div>
                                </li>
                                <li className="d-flex gap-3">
                                    <span className="rt-stat-icon rt-tone-green"><i className="bi bi-clock"></i></span>
                                    <div><div className="fw-semibold">Response time</div><span className="text-muted small">Usually within two working days</span></div>
                                </li>
                                <li className="d-flex gap-3">
                                    <span className="rt-stat-icon rt-tone-violet"><i className="bi bi-credit-card"></i></span>
                                    <div><div className="fw-semibold">Billing</div><span className="text-muted small">Pro members can manage invoices and cancel any time from Profile &amp; billing.</span></div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
