import { Link, router, useForm, usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';

/**
 * One field. Secrets are write-only: the current value is never sent to the browser, only a hint
 * such as "…a1b2". Leaving a secret empty keeps the saved one.
 */
function Field({ name, field, form, unlocked = false, onToggleLock }) {
    const error = form.errors[name];
    const id = `setting-${name}`;
    const clearing = (form.data.clear ?? []).includes(name);
    const isLocked = field.locked && !unlocked;
    const isDefault = field.default !== null && String(form.data[name] ?? '') === String(field.default);

    if (field.type === 'boolean') {
        return (
            <div className="col-12">
                <div className="form-check form-switch">
                    <input id={id} type="checkbox" role="switch" className="form-check-input" checked={Boolean(form.data[name])} onChange={(event) => form.setData(name, event.target.checked)} />
                    <label htmlFor={id} className="form-check-label fw-semibold small">{field.label}</label>
                </div>
                {field.help && <div className="form-text ms-5">{field.help}</div>}
            </div>
        );
    }

    if (field.type === 'text') {
        return (
            <div className="col-12">
                <label htmlFor={id} className="form-label fw-semibold small">{field.label}</label>
                <textarea id={id} rows={3} className={`form-control ${error ? 'is-invalid' : ''}`} placeholder={field.placeholder ?? ''} value={form.data[name] ?? ''} onChange={(event) => form.setData(name, event.target.value)} />
                {error ? <div className="invalid-feedback d-block">{error}</div> : field.help && <div className="form-text">{field.help}</div>}
            </div>
        );
    }

    return (
        <div className="col-md-6">
            <label htmlFor={id} className="form-label fw-semibold small d-flex justify-content-between gap-2">
                <span>{field.label}</span>
                {field.type === 'secret' && field.is_set && !clearing && <span className="badge text-bg-success fw-normal">Saved {field.hint}</span>}
                {field.locked && <span className={`badge fw-normal ${isDefault ? 'text-bg-light border' : 'text-bg-info'}`}>{isDefault ? 'Default' : 'Custom'}</span>}
            </label>
            <div className={field.locked ? 'input-group' : ''}>
            {field.type === 'select' ? (
                <select id={id} className={`form-select ${error ? 'is-invalid' : ''}`} value={form.data[name] ?? ''} disabled={isLocked} onChange={(event) => form.setData(name, event.target.value)}>
                    {Object.entries(field.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            ) : (
                <input
                    list={field.suggestions ? `${id}-suggestions` : undefined}
                    id={id}
                    type={field.type === 'secret' ? 'password' : field.type === 'integer' ? 'number' : 'text'}
                    autoComplete={field.type === 'secret' ? 'new-password' : 'off'}
                    className={`form-control ${error ? 'is-invalid' : ''}`}
                    placeholder={field.type === 'secret' && field.is_set ? 'Leave empty to keep the saved value' : field.placeholder ?? ''}
                    value={form.data[name] ?? ''}
                    disabled={clearing || isLocked}
                    onChange={(event) => form.setData(name, event.target.value)}
                />
            )}
            {field.locked && (
                <button type="button" className="btn btn-light border" onClick={onToggleLock} title={isLocked ? 'Unlock to edit' : 'Lock'} aria-pressed={!isLocked}>
                    <i className={`bi ${isLocked ? 'bi-pencil' : 'bi-lock'} me-1`}></i>{isLocked ? 'Edit' : 'Lock'}
                </button>
            )}
            </div>
            {field.suggestions && (
                <datalist id={`${id}-suggestions`}>{field.suggestions.map((option) => <option key={option} value={option} />)}</datalist>
            )}
            {field.locked && !isLocked && !isDefault && (
                <button type="button" className="btn btn-link btn-sm p-0 mt-1" onClick={() => form.setData(name, field.default)}>
                    <i className="bi bi-arrow-counterclockwise me-1"></i>Reset to default ({field.default})
                </button>
            )}
            {error ? <div className="invalid-feedback d-block">{error}</div> : field.help && <div className="form-text">{field.help}</div>}
            {field.option_help?.[form.data[name]] && (
                <div className="rt-setting-hint"><i className="bi bi-info-circle me-1"></i>{field.option_help[form.data[name]]}</div>
            )}
            {field.type === 'secret' && field.is_set && field.hint !== 'set in .env' && (
                <div className="form-check mt-1">
                    <input
                        id={`${id}-clear`}
                        type="checkbox"
                        className="form-check-input"
                        checked={clearing}
                        onChange={(event) => form.setData('clear', event.target.checked ? [...(form.data.clear ?? []), name] : (form.data.clear ?? []).filter((item) => item !== name))}
                    />
                    <label htmlFor={`${id}-clear`} className="form-check-label small text-danger">Remove the saved value</label>
                </div>
            )}
        </div>
    );
}

function GroupForm({ group, groupKey, extra }) {
    const [unlocked, setUnlocked] = useState([]);
    const toggleLock = (name) => setUnlocked((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    const initial = Object.fromEntries(Object.entries(group.fields).map(([name, field]) => [name, field.type === 'secret' ? '' : field.value ?? '']));
    const form = useForm({ ...initial, clear: [] });

    const submit = (event) => {
        event.preventDefault();
        form.put(`/admin/settings/${groupKey}`, {
            preserveScroll: true,
            onSuccess: () => {
                setUnlocked([]);
                form.setData((data) => ({
                    ...data,
                    ...Object.fromEntries(Object.entries(group.fields).filter(([, field]) => field.type === 'secret').map(([name]) => [name, ''])),
                    clear: [],
                }));
            },
        });
    };

    return (
        <form className="rt-card p-3 p-lg-4" onSubmit={submit} noValidate autoComplete="off">
            <div className="d-flex align-items-start gap-3 mb-4">
                <span className="rt-stat-icon rt-tone-indigo"><i className={`bi ${group.icon}`}></i></span>
                <div>
                    <h2 className="rt-card-title mb-1">{group.label}</h2>
                    <p className="text-muted small mb-0">{group.description}</p>
                </div>
            </div>
            {extra}
            <div className="row g-3">
                {Object.entries(group.fields)
                    .filter(([, field]) => !field.show_when || Object.entries(field.show_when).every(([key, values]) => values.includes(form.data[key])))
                    .map(([name, field]) => <Field key={name} name={name} field={field} form={form} unlocked={unlocked.includes(name)} onToggleLock={() => toggleLock(name)} />)}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 mt-4 pt-3 border-top">
                <button type="submit" className="btn rt-btn-primary px-4 py-2" disabled={form.processing}>
                    {form.processing ? 'Saving...' : `Save ${group.label}`}
                </button>
                <small className="text-muted"><i className="bi bi-shield-lock me-1"></i>Secrets are encrypted and never shown again after saving.</small>
            </div>
        </form>
    );
}

export default function Settings({ groups, tab, webhookUrl, paymentReturnUrls = {}, seo }) {
    const { errors } = usePage().props;
    const [active, setActive] = useState(tab);
    const [isTesting, setIsTesting] = useState(null);

    const runTest = (kind) => {
        setIsTesting(kind);
        router.post(`/admin/settings/${kind}/test`, {}, { preserveScroll: true, preserveState: true, onFinish: () => setIsTesting(null) });
    };

    const extras = {
        stripe: (
            <div className="alert alert-light border small mb-4">
                <div className="fw-semibold mb-1">Webhook</div>
                In Stripe → Developers → Webhooks, add <code>{webhookUrl}</code> with the events <code>customer.subscription.*</code>,
                <code> customer.updated</code>, <code>customer.deleted</code>, <code>invoice.payment_succeeded</code> and <code>invoice.payment_action_required</code>,
                then paste its signing secret below.
                <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
                    <button type="button" className="btn btn-sm btn-light border" onClick={() => runTest('stripe')} disabled={isTesting !== null}>
                        {isTesting === 'stripe' ? <><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Checking...</> : <><i className="bi bi-plug me-1"></i>Test Stripe connection</>}
                    </button>
                    <span className="text-muted">Save your changes first.</span>
                </div>
                {errors.stripe_test && <div className="text-danger mt-2">{errors.stripe_test}</div>}
            </div>
        ),
        jazzcash: (
            <div className="alert alert-light border small mb-4">
                <div className="fw-semibold mb-1">Return URL</div>
                In the JazzCash merchant portal, set the return URL to <code>{paymentReturnUrls.jazzcash}</code>.
                Test in Sandbox first, then switch to Live with your live credentials. Payments are listed under <Link href="/admin/payments">Payments</Link>.
            </div>
        ),
        easypaisa: (
            <div className="alert alert-light border small mb-4">
                <div className="fw-semibold mb-1">Post-back URL</div>
                Easypaisa sends payers back to <code>{paymentReturnUrls.easypaisa}</code>. Ask Easypaisa to allow this URL for your store if they require it.
                Every payment is confirmed with Easypaisa&apos;s transaction inquiry API, so the API username, password and account number are required.
            </div>
        ),
        bank: (
            <div className="alert alert-light border small mb-4">
                Users see these details after choosing bank transfer, then submit their transaction reference. Approve or reject them under <Link href="/admin/payments">Payments</Link>; Pro starts on approval.
            </div>
        ),
        mail: (
            <div className="alert alert-light border small mb-4 d-flex flex-wrap align-items-center gap-2">
                <button type="button" className="btn btn-sm btn-light border" onClick={() => runTest('mail')} disabled={isTesting !== null}>
                    {isTesting === 'mail' ? <><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Sending...</> : <><i className="bi bi-send me-1"></i>Send a test email to me</>}
                </button>
                <span className="text-muted">Uses the saved settings, so save first.</span>
                {errors.mail_test && <div className="text-danger w-100">{errors.mail_test}</div>}
            </div>
        ),
        jobs: (
            <div className="alert alert-light border small mb-4">
                Search terms, location and auto-sync are on the <Link href="/admin/jobs">Job feeds</Link> page. AdSense has its own <Link href="/admin/adsense">AdSense</Link> page, and AI keys are under <Link href="/admin/ai-keys">AI keys</Link>.
            </div>
        ),
    };

    return (
        <AdminLayout title="Settings" subtitle="Configure the site here instead of the .env file. Saved values take effect immediately." seo={seo}>
            <div className="row g-4">
                <div className="col-lg-3">
                    <nav className="rt-card p-2 rt-settings-nav" aria-label="Settings sections">
                        {Object.entries(groups).map(([key, group]) => (
                            <button key={key} type="button" className={`rt-settings-tab ${active === key ? 'is-active' : ''}`} onClick={() => setActive(key)}>
                                <i className={`bi ${group.icon}`}></i>{group.label}
                            </button>
                        ))}
                    </nav>
                    <p className="small text-muted mt-3 px-1">
                        Database, APP_KEY and APP_URL stay in .env: the site needs them before it can read these settings.
                    </p>
                </div>
                <div className="col-lg-9">
                    {Object.entries(groups).map(([key, group]) => (
                        <div key={key} hidden={active !== key}>
                            <GroupForm group={group} groupKey={key} extra={extras[key] ?? null} />
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
