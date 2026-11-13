import { Link, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null);

const STATUS_BADGES = {
    pending: 'text-bg-light border',
    awaiting_review: 'text-bg-warning',
    paid: 'text-bg-success',
    failed: 'text-bg-danger',
    rejected: 'text-bg-danger',
};

function CopyRow({ label, value }) {
    const [isCopied, setIsCopied] = useState(false);

    if (!value) {
        return null;
    }

    const copy = () => {
        navigator.clipboard?.writeText(value).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1500);
        });
    };

    return (
        <div className="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom">
            <div className="min-w-0">
                <div className="small text-muted">{label}</div>
                <div className="fw-semibold text-break">{value}</div>
            </div>
            <button type="button" className="btn btn-sm btn-light border flex-shrink-0" onClick={copy} aria-label={`Copy ${label}`}>
                <i className={`bi ${isCopied ? 'bi-check2' : 'bi-copy'}`}></i>
            </button>
        </div>
    );
}

function BankTransferForm({ payment, bank }) {
    const form = useForm({ payer_reference: '', proof: null });

    const submit = (event) => {
        event.preventDefault();
        form.post(`/billing/payments/${payment.id}/proof`, { preserveScroll: true, forceFormData: true });
    };

    return (
        <>
            <p className="mb-3">Send <strong>{payment.amount_label}</strong> to this account from your bank app, JazzCash, Easypaisa or Raast, then tell us the transaction reference.</p>
            <div className="mb-4">
                <CopyRow label="Bank" value={bank.bank_name} />
                <CopyRow label="Account title" value={bank.account_title} />
                <CopyRow label="Account number" value={bank.account_number} />
                <CopyRow label="IBAN" value={bank.iban} />
                <CopyRow label="Amount" value={String(payment.amount)} />
                <CopyRow label="Write this in the transfer note" value={payment.reference} />
            </div>
            {bank.instructions && <div className="alert alert-light border small" style={{ whiteSpace: 'pre-line' }}>{bank.instructions}</div>}

            <form onSubmit={submit} noValidate>
                <div className="mb-3">
                    <label htmlFor="payer_reference" className="form-label fw-semibold">Transaction reference (TID)</label>
                    <input id="payer_reference" className={`form-control ${form.errors.payer_reference ? 'is-invalid' : ''}`} value={form.data.payer_reference} onChange={(event) => form.setData('payer_reference', event.target.value)} placeholder="From your bank's receipt" autoComplete="off" />
                    {form.errors.payer_reference && <div className="invalid-feedback">{form.errors.payer_reference}</div>}
                </div>
                <div className="mb-3">
                    <label htmlFor="proof" className="form-label fw-semibold">Receipt screenshot <span className="text-muted fw-normal">(optional, speeds up checking)</span></label>
                    <input id="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={`form-control ${form.errors.proof ? 'is-invalid' : ''}`} onChange={(event) => form.setData('proof', event.target.files[0] ?? null)} />
                    {form.errors.proof ? <div className="invalid-feedback">{form.errors.proof}</div> : <div className="form-text">JPG, PNG, WebP or PDF, up to 5 MB.</div>}
                </div>
                <button type="submit" className="btn rt-btn-primary px-4" disabled={form.processing}>
                    {form.processing ? 'Sending...' : 'I have paid'}
                </button>
            </form>
        </>
    );
}

export default function Payment({ payment, bank, proUntil, seo }) {
    const [isChecking, setIsChecking] = useState(false);
    const period = payment.interval === 'yearly' ? '1 year' : '1 month';

    const checkAgain = () => {
        setIsChecking(true);
        router.post(`/billing/payments/${payment.id}/refresh`, {}, { preserveScroll: true, onFinish: () => setIsChecking(false) });
    };

    return (
        <MainLayout seo={seo}>
            <NavBar />
            <div className="container py-5" style={{ maxWidth: '40rem' }}>
                <section className="rt-card p-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                        <div>
                            <h1 className="h4 fw-bold mb-1">Pro for {period}</h1>
                            <div className="small text-muted">{payment.amount_label} · {payment.channel_label} · Ref {payment.reference}</div>
                        </div>
                        <span className={`badge ${STATUS_BADGES[payment.status] ?? 'text-bg-light'}`}>{payment.status_label}</span>
                    </div>

                    {payment.status === 'paid' && (
                        <div className="alert alert-success mb-0">
                            <i className="bi bi-patch-check-fill me-2"></i>
                            <strong>Payment received.</strong> Pro is active{proUntil ? ` until ${formatDate(proUntil)}` : ''}. <Link href="/">Tailor a CV now</Link>.
                        </div>
                    )}

                    {payment.status === 'pending' && payment.channel === 'bank_transfer' && bank && <BankTransferForm payment={payment} bank={bank} />}

                    {payment.status === 'pending' && payment.channel !== 'bank_transfer' && (
                        <>
                            <p>We are waiting for {payment.channel_label} to confirm this payment. If you paid with a voucher, pay it at any {payment.channel_label} shop before it expires; Pro switches on once it is paid.</p>
                            <div className="d-flex flex-wrap gap-2">
                                {payment.channel === 'easypaisa' && (
                                    <button type="button" className="btn rt-btn-primary" onClick={checkAgain} disabled={isChecking}>
                                        {isChecking ? 'Checking...' : 'Check again'}
                                    </button>
                                )}
                                <Link href="/pricing" className="btn rt-btn-soft">Pay another way</Link>
                            </div>
                        </>
                    )}

                    {payment.status === 'awaiting_review' && (
                        <div className="alert alert-info mb-0">
                            <i className="bi bi-hourglass-split me-2"></i>
                            Thanks! We received your transfer details (reference {payment.payer_reference}) and are checking them. Pro switches on as soon as it is approved, usually within a few hours.
                        </div>
                    )}

                    {['failed', 'rejected'].includes(payment.status) && (
                        <>
                            <div className="alert alert-danger">
                                {payment.status === 'failed' ? `${payment.channel_label} did not complete this payment. You have not been charged for it.` : 'We could not match this transfer to a payment in our account.'}
                                {payment.admin_note && <div className="mt-1"><strong>Note:</strong> {payment.admin_note}</div>}
                            </div>
                            <Link href="/pricing" className="btn rt-btn-primary">Try again</Link>
                        </>
                    )}
                </section>
                <p className="small text-muted text-center mt-3">Questions about a payment? <Link href="/contact">Contact us</Link> with reference {payment.reference}.</p>
            </div>
        </MainLayout>
    );
}
