import { Link, router, usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import NavBar from '../Components/NavBar';
import MainLayout from '../Layouts/MainLayout';

const formatDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null);

/**
 * "$79" a year shown as "$6.58" a month. Prices are display strings from config, so the currency
 * symbol is whatever precedes the number.
 */
const perMonth = (amount) => {
    const value = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    const symbol = String(amount).replace(/[0-9.,\s]/g, '');
    return Number.isFinite(value) && value > 0 ? `${symbol}${(value / 12).toFixed(2)}` : null;
};

const FAQS = [
    ['Is checking my ATS score really free?', 'Yes. Scanning your CV against a job description is unlimited on every plan. Only creating a tailored CV counts towards your monthly quota.'],
    ['What counts as one tailored CV?', 'Each time we rewrite your CV for a job. Confirming extra skills on that CV or switching between the designs you have access to does not count again.'],
    ['When does my free CV reset?', 'On the first day of every month.'],
    ['Can I cancel Pro any time?', 'Yes. Cancel from the billing page in one click. You keep Pro until the end of the period you paid for, then move back to Free.'],
    ['How do payments work?', 'Payments are processed securely by Stripe. We never see or store your card details. Promo codes can be entered at checkout.'],
];

function Feature({ children, included = true }) {
    return (
        <li className={included ? '' : 'is-off'}>
            <i className={`bi ${included ? 'bi-check-circle-fill' : 'bi-x-circle'} mt-1`}></i>
            <span>{children}</span>
        </li>
    );
}

function Cell({ value }) {
    if (value === true) {
        return <i className="bi bi-check-lg" aria-label="Included"></i>;
    }
    if (value === false) {
        return <i className="bi bi-dash" aria-label="Not included"></i>;
    }
    return <span className="fw-semibold">{value}</span>;
}

export default function Pricing({ prices, limits, subscription, hasBillingAccount, checkoutStatus, seo }) {
    const { auth, billing, errors } = usePage().props;
    const user = auth?.user;
    const isPro = billing?.plan === 'pro';
    const [interval, setBillingInterval] = useState('yearly');
    const [isRedirecting, setIsRedirecting] = useState(false);
    const price = prices.find((option) => option.interval === interval) ?? prices[0];
    const yearly = prices.find((option) => option.interval === 'yearly');

    const startCheckout = () => {
        setIsRedirecting(true);
        router.post(`/billing/checkout/${price.interval}`, {}, { onFinish: () => setIsRedirecting(false) });
    };

    const freeLimit = `${limits.free_monthly_tailors} tailored CV${limits.free_monthly_tailors === 1 ? '' : 's'} a month`;
    const proLimit = limits.pro_monthly_tailors > 0 ? `Up to ${limits.pro_monthly_tailors} a month` : 'Unlimited';
    const comparison = [
        ['ATS score checks with fixes', 'Unlimited', 'Unlimited'],
        ['Tailored CVs', `${limits.free_monthly_tailors} a month`, proLimit],
        ['Before and after ATS score', true, true],
        ['Confirm missing skills and re-tailor', true, true],
        ['Keep the design of your own CV', true, true],
        ['ATS-safe designs', `${limits.free_templates} designs`, 'All 15'],
        ['Job matching and application tracker', true, true],
    ];

    return (
        <MainLayout seo={seo}>
            <NavBar />

            <header className="rt-hero rt-hero-compact">
                <div className="container">
                    <span className="rt-pill mb-3"><i className="bi bi-tag"></i>Pricing</span>
                    <h1 className="mb-3">Land more interviews for less than a coffee</h1>
                    <p className="rt-hero-lead mb-4">Check your ATS score free, as often as you like. Tailor one CV free every month, or go Pro for every job you apply to.</p>
                    <div className="rt-billing-toggle" role="tablist" aria-label="Billing period">
                        {prices.map((option) => (
                            <button key={option.interval} type="button" role="tab" aria-selected={interval === option.interval} className={interval === option.interval ? 'is-active' : ''} onClick={() => setBillingInterval(option.interval)}>
                                {option.interval === 'yearly' ? 'Yearly' : 'Monthly'}
                                {option.note && <span className="rt-save-badge">{option.note}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="container pb-5" style={{ maxWidth: '62rem' }}>
                <div className="rt-overlap">
                    {checkoutStatus === 'success' && (
                        <div className="alert alert-success d-flex gap-2 align-items-start shadow-sm" role="status">
                            <i className="bi bi-patch-check-fill mt-1"></i>
                            <span>
                                <strong>Thanks for subscribing!</strong>{' '}
                                {isPro ? 'Pro is active on your account.' : 'We are confirming your payment. Pro usually activates within a minute; refresh this page if it has not yet.'}
                            </span>
                        </div>
                    )}
                    {checkoutStatus === 'cancelled' && (
                        <div className="alert alert-light border shadow-sm py-2" role="status"><i className="bi bi-info-circle me-2"></i>Checkout was cancelled. You have not been charged.</div>
                    )}
                    {errors?.billing && <div className="alert alert-danger shadow-sm py-2" role="alert">{errors.billing}</div>}

                    <div className="row g-4 align-items-stretch">
                        <div className="col-md-6">
                            <section className="rt-card rt-plan-card">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <span className="rt-plan-icon"><i className="bi bi-rocket"></i></span>
                                    <div>
                                        <h2 className="h5 fw-bold mb-0">Free</h2>
                                        <small className="text-muted">For an occasional application</small>
                                    </div>
                                    {!isPro && user && <span className="badge text-bg-light border ms-auto">Current plan</span>}
                                </div>
                                <div className="mb-4">
                                    <span className="rt-plan-price">$0</span>
                                    <span className="rt-plan-period"> / forever</span>
                                </div>
                                <ul className="list-unstyled rt-plan-features mb-4 flex-grow-1">
                                    <Feature>Unlimited ATS score checks with fixes</Feature>
                                    <Feature>{freeLimit}</Feature>
                                    <Feature>{limits.free_templates} ATS-safe designs, including your own</Feature>
                                    <Feature>Job matching and application tracker</Feature>
                                    <Feature included={false}>All 15 designs</Feature>
                                </ul>
                                {isPro ? (
                                    <button type="button" className="btn btn-outline-secondary w-100" disabled>Included in Pro</button>
                                ) : (
                                    <>
                                        <Link href="/" className="btn rt-btn-soft w-100 py-2">{billing?.remaining > 0 ? 'Use my free CV' : 'Check my ATS score'}</Link>
                                        {billing && (
                                            <small className="text-muted d-block text-center mt-2">
                                                {billing.remaining > 0
                                                    ? `${billing.remaining} free tailored CV${billing.remaining === 1 ? '' : 's'} left this month`
                                                    : `Next free CV on ${formatDate(billing.resets_at)}`}
                                            </small>
                                        )}
                                    </>
                                )}
                            </section>
                        </div>

                        <div className="col-md-6">
                            <section className="rt-card rt-plan-card is-featured">
                                <span className="rt-plan-ribbon">{isPro ? 'Your plan' : 'Most popular'}</span>
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <span className="rt-plan-icon"><i className="bi bi-stars"></i></span>
                                    <div>
                                        <h2 className="h5 fw-bold mb-0">Pro</h2>
                                        <small className="text-muted">For an active job search</small>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    {price.interval === 'yearly' && perMonth(price.amount) ? (
                                        <>
                                            <span className="rt-plan-price">{perMonth(price.amount)}</span>
                                            <span className="rt-plan-period"> / month</span>
                                            <div className="small text-muted mt-1">{price.amount} billed once a year</div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="rt-plan-price">{price.amount}</span>
                                            <span className="rt-plan-period"> / {price.period}</span>
                                            {yearly?.note && <div className="small text-muted mt-1">or {yearly.amount} a year ({yearly.note.toLowerCase()})</div>}
                                        </>
                                    )}
                                </div>
                                <ul className="list-unstyled rt-plan-features mb-4 flex-grow-1">
                                    <Feature>Everything in Free</Feature>
                                    <Feature>{limits.pro_monthly_tailors > 0 ? <>Up to <strong>{limits.pro_monthly_tailors} tailored CVs</strong> a month (fair use)</> : <><strong>Unlimited</strong> tailored CVs</>}</Feature>
                                    <Feature>All 15 ATS-safe designs</Feature>
                                    <Feature>Tailor a CV for every application</Feature>
                                    <Feature>Cancel any time</Feature>
                                </ul>

                                {isPro ? (
                                    <>
                                        {subscription?.on_grace_period && subscription.ends_at && (
                                            <div className="alert alert-warning py-2 small mb-2">Cancelled. Pro stays active until {formatDate(subscription.ends_at)}.</div>
                                        )}
                                        {hasBillingAccount
                                            ? <a href="/billing/portal" className="btn rt-btn-primary w-100"><i className="bi bi-credit-card me-2"></i>Manage billing</a>
                                            : <button type="button" className="btn rt-btn-primary w-100" disabled>Pro is active</button>}
                                    </>
                                ) : !user ? (
                                    <>
                                        <Link href="/register" className="btn rt-btn-primary w-100">Get Pro</Link>
                                        <small className="text-muted d-block mt-2 text-center">Create a free account first. Already have one? <Link href="/login">Log in</Link></small>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn rt-btn-primary w-100" onClick={startCheckout} disabled={!price.available || isRedirecting}>
                                            {isRedirecting
                                                ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Opening secure checkout...</>
                                                : price.available ? <><i className="bi bi-lightning-charge-fill me-2"></i>Upgrade to Pro</> : 'Coming soon'}
                                        </button>
                                        <small className="text-muted d-block mt-2 text-center"><i className="bi bi-lock me-1"></i>Secure payment by Stripe. Promo codes accepted.</small>
                                    </>
                                )}
                            </section>
                        </div>
                    </div>

                    <div className="rt-trust my-4 my-lg-5">
                        <span><i className="bi bi-shield-check"></i>Payments by Stripe</span>
                        <span><i className="bi bi-arrow-counterclockwise"></i>Cancel any time</span>
                        <span><i className="bi bi-speedometer2"></i>Free ATS checks forever</span>
                        <span><i className="bi bi-file-earmark-check"></i>ATS-safe PDFs only</span>
                    </div>

                    <section className="rt-card mb-4">
                        <div className="p-4 pb-2">
                            <h2 className="rt-card-title"><i className="bi bi-columns-gap"></i>Compare plans</h2>
                        </div>
                        <div className="table-responsive">
                            <table className="rt-compare">
                                <thead>
                                    <tr>
                                        <th scope="col"><span className="visually-hidden">Feature</span></th>
                                        <th scope="col">Free</th>
                                        <th scope="col" className="is-pro">Pro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparison.map(([feature, free, pro]) => (
                                        <tr key={feature}>
                                            <td>{feature}</td>
                                            <td><Cell value={free} /></td>
                                            <td className="is-pro"><Cell value={pro} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section id="faq" className="rt-card p-4" style={{ scrollMarginTop: '5.5rem' }}>
                        <h2 className="rt-card-title mb-2"><i className="bi bi-question-circle"></i>Questions</h2>
                        <div className="rt-faq">
                            {FAQS.map(([question, answer]) => (
                                <details key={question}>
                                    <summary>{question}</summary>
                                    <p>{answer}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

        </MainLayout>
    );
}
