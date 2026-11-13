import { Link, router, usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import NavBar from '../Components/NavBar';
import MainLayout from '../Layouts/MainLayout';

const formatDate = (value) => (value ? new Date(String(value).includes('T') ? value : `${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null);

const METHOD_ICONS = { jazzcash: 'bi-phone', easypaisa: 'bi-wallet2', bank_transfer: 'bi-bank', card: 'bi-credit-card' };

const FAQS = [
    ['Is checking my ATS score really free?', 'Yes. Scanning your CV against a job description is unlimited on every plan. Only creating a tailored CV counts towards your monthly quota.'],
    ['What counts as one tailored CV?', 'Each time we rewrite your CV for a job. Confirming extra skills on that CV or switching between the designs you have access to does not count again.'],
    ['When does my free CV reset?', 'On the first day of every month.'],
    ['How can I pay?', 'In Pakistani rupees with JazzCash or Easypaisa (mobile account, card or voucher), or by bank transfer. We never see or store your card or wallet details.'],
    ['Does Pro renew automatically?', 'No. A JazzCash, Easypaisa or bank payment buys one month or one year of Pro. Pay again any time to add more time; it is added after the time you already have.'],
    ['How long does a bank transfer take?', 'Send the amount, then enter your transaction reference (and a screenshot if you like). We check it and switch on Pro, usually within a few hours.'],
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

export default function Pricing({ prices, channels = [], paidUntil = null, openPayment = null, limits, subscription, hasBillingAccount, checkoutStatus, paymentStatus = null, seo }) {
    const { auth, billing, errors } = usePage().props;
    const user = auth?.user;
    const isPro = billing?.plan === 'pro';
    const [interval, setBillingInterval] = useState('yearly');
    const [isRedirecting, setIsRedirecting] = useState(false);
    const price = prices.find((option) => option.interval === interval) ?? prices[0];
    const yearly = prices.find((option) => option.interval === 'yearly');
    const methods = [...channels, ...(price.stripe ? [{ value: 'card', label: 'Card (auto-renews)' }] : [])];
    const [method, setMethod] = useState(channels[0]?.value ?? 'card');
    const chosen = methods.find((option) => option.value === method) ?? methods[0];
    const canPay = user && (!isPro || ['paid', 'gift', 'trial'].includes(billing?.source));

    const startCheckout = () => {
        if (!chosen) {
            return;
        }
        setIsRedirecting(true);
        const url = chosen.value === 'card' ? `/billing/checkout/${price.interval}` : `/billing/pay/${chosen.value}/${price.interval}`;
        router.post(url, {}, { onFinish: () => setIsRedirecting(false) });
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
                    {paymentStatus === 'invalid' && (
                        <div className="alert alert-warning shadow-sm py-2" role="alert">We could not confirm that payment. If money left your account, contact us with the time of the payment and we will sort it out.</div>
                    )}
                    {openPayment && (
                        <div className="alert alert-info shadow-sm py-2" role="status">
                            <i className="bi bi-hourglass-split me-2"></i>We are checking your bank transfer <Link href={`/billing/payments/${openPayment.id}`}>{openPayment.reference}</Link>. Pro switches on as soon as it is approved.
                        </div>
                    )}

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
                                    <span className="rt-plan-price">Rs 0</span>
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
                                    {price.interval === 'yearly' && price.monthly_equivalent_label ? (
                                        <>
                                            <span className="rt-plan-price">{price.monthly_equivalent_label}</span>
                                            <span className="rt-plan-period"> / month</span>
                                            <div className="small text-muted mt-1">{price.amount_label} paid once for a year</div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="rt-plan-price">{price.amount_label}</span>
                                            <span className="rt-plan-period"> / {price.period}</span>
                                            {yearly?.note && <div className="small text-muted mt-1">or {yearly.amount_label} a year ({yearly.note.toLowerCase()})</div>}
                                        </>
                                    )}
                                </div>
                                <ul className="list-unstyled rt-plan-features mb-4 flex-grow-1">
                                    <Feature>Everything in Free</Feature>
                                    <Feature>{limits.pro_monthly_tailors > 0 ? <>Up to <strong>{limits.pro_monthly_tailors} tailored CVs</strong> a month (fair use)</> : <><strong>Unlimited</strong> tailored CVs</>}</Feature>
                                    <Feature>All 15 ATS-safe designs</Feature>
                                    <Feature>Tailor a CV for every application</Feature>
                                    <Feature>No auto-renewal with JazzCash, Easypaisa or bank</Feature>
                                </ul>

                                {isPro && paidUntil && (
                                    <div className="alert alert-success py-2 small mb-2">Pro is paid until {formatDate(paidUntil)}. Pay again to add more time.</div>
                                )}
                                {isPro && billing?.trial_ends_at && (
                                    <div className="alert alert-info py-2 small mb-2">Your Pro trial ends on {formatDate(billing.trial_ends_at)}. Pay now to keep Pro after it.</div>
                                )}
                                {!user ? (
                                    <>
                                        <Link href="/register" className="btn rt-btn-primary w-100">Get Pro</Link>
                                        <small className="text-muted d-block mt-2 text-center">Create a free account first. Already have one? <Link href="/login">Log in</Link></small>
                                    </>
                                ) : canPay ? (
                                    <>
                                        {methods.length > 0 && (
                                            <fieldset className="mb-3">
                                                <legend className="small fw-semibold mb-2">Pay with</legend>
                                                <div className="d-grid gap-2">
                                                    {methods.map((option) => (
                                                        <label key={option.value} className={`rt-pay-method ${chosen?.value === option.value ? 'is-active' : ''}`}>
                                                            <input type="radio" name="method" className="form-check-input me-2" value={option.value} checked={chosen?.value === option.value} onChange={() => setMethod(option.value)} />
                                                            <i className={`bi ${METHOD_ICONS[option.value] ?? 'bi-cash'} me-2`}></i>{option.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </fieldset>
                                        )}
                                        <button type="button" className="btn rt-btn-primary w-100" onClick={startCheckout} disabled={!chosen || isRedirecting}>
                                            {isRedirecting
                                                ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Opening payment...</>
                                                : chosen ? <><i className="bi bi-lightning-charge-fill me-2"></i>{isPro ? 'Add' : 'Pay'} {price.amount_label} with {chosen.value === 'card' ? 'card' : chosen.label}</> : 'Coming soon'}
                                        </button>
                                        <small className="text-muted d-block mt-2 text-center">
                                            <i className="bi bi-lock me-1"></i>
                                            {chosen?.value === 'bank_transfer' ? 'You will see our bank details on the next page.' : chosen?.value === 'card' ? 'Secure card payment by Stripe. Renews until you cancel.' : chosen ? `You pay on ${chosen.label}'s secure page.` : 'Payments open soon.'}
                                        </small>
                                    </>
                                ) : (
                                    <>
                                        {subscription?.on_grace_period && subscription.ends_at && (
                                            <div className="alert alert-warning py-2 small mb-2">Cancelled. Pro stays active until {formatDate(subscription.ends_at)}.</div>
                                        )}
                                        {hasBillingAccount && subscription
                                            ? <a href="/billing/portal" className="btn rt-btn-primary w-100"><i className="bi bi-credit-card me-2"></i>Manage billing</a>
                                            : <button type="button" className="btn rt-btn-primary w-100" disabled>Pro is active</button>}
                                    </>
                                )}
                            </section>
                        </div>
                    </div>

                    <div className="rt-trust my-4 my-lg-5">
                        <span><i className="bi bi-shield-check"></i>JazzCash · Easypaisa · Bank transfer</span>
                        <span><i className="bi bi-arrow-counterclockwise"></i>No auto-renewal</span>
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
