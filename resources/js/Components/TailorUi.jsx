import { Link } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';

/*
 * Pieces shared by the tailor page and the tailored resume page: score gauges and bars, the design
 * picker, keyword chips, the score checklist, upgrade prompts and the usage meter.
 */

export const BREAKDOWN_ORDER = ['keywords', 'job_title', 'sections', 'contact'];

export const scoreTone = (score) => (score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger');
export const toneColor = { success: 'var(--rt-success)', warning: 'var(--rt-warning)', danger: 'var(--rt-danger)' };

export const errorMessage = (err, fallback) => {
    const errors = err?.response?.data?.errors;
    if (errors) {
        return Object.values(errors).flat()[0];
    }
    if (err?.response?.status === 429) {
        return 'Too many requests. Please wait a minute and try again.';
    }
    if (!err?.response) {
        console.error('Tailor request failed without a server response', err);
        return err?.request
            ? 'No response from the server. Check that the app is still running and try again.'
            : 'Something went wrong while showing the result. Please reload the page and try again.';
    }
    return err?.response?.data?.message || err?.message || fallback;
};

export function ScoreGauge({ score, caption }) {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const [shown, setShown] = useState(0);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setShown(score));
        return () => cancelAnimationFrame(frame);
    }, [score]);

    return (
        <div className="rt-gauge">
            <svg viewBox="0 0 120 120" role="img" aria-label={`${caption}: ${score}%`}>
                <circle className="rt-gauge-track" cx="60" cy="60" r={radius} fill="none" strokeWidth="10" />
                <circle
                    className="rt-gauge-value"
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    stroke={toneColor[scoreTone(score)]}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - shown / 100)}
                />
            </svg>
            <div className="rt-gauge-label">
                <span className="rt-gauge-number" style={{ color: toneColor[scoreTone(score)] }}>{score}%</span>
                <span className="rt-gauge-caption">{caption}</span>
            </div>
        </div>
    );
}

export function Bar({ value, variant }) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setWidth(value));
        return () => cancelAnimationFrame(frame);
    }, [value]);

    return (
        <div className={`rt-bar ${variant === 'before' ? 'rt-bar-before' : ''}`}>
            <span style={{ width: `${width}%`, background: variant === 'before' ? undefined : toneColor[scoreTone(value)] }}></span>
        </div>
    );
}

export const SERIF_FONTS = ['Times New Roman', 'Caladea', 'PT Serif', 'IBM Plex Serif', 'Crimson Text'];

/**
 * Miniature page for a template, drawn from the preview data the server sends with each template:
 * typeface, name alignment and colour, heading style and density.
 */
export function TemplateThumb({ preview }) {
    if (!preview) {
        return (
            <span className="rt-thumb is-original" aria-hidden="true">
                <i className="bi bi-file-earmark-person"></i>
            </span>
        );
    }

    const fallback = SERIF_FONTS.includes(preview.font) ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif';

    return (
        <span
            className={`rt-thumb ${preview.dense ? 'is-dense' : ''}`}
            style={{ '--thumb-accent': preview.heading_color, '--thumb-name': preview.name_color }}
            aria-hidden="true"
        >
            <span
                className={`rt-thumb-name ${preview.name_uppercase ? 'is-upper' : ''}`}
                style={{ textAlign: preview.align, fontFamily: `"${preview.font}", ${fallback}` }}
            >
                Jane Doe
            </span>
            {[0, 1].map((section) => (
                <React.Fragment key={section}>
                    <span className={`rt-thumb-heading is-${preview.heading_style}`}></span>
                    <span className="rt-thumb-line"></span>
                    <span className="rt-thumb-line is-short"></span>
                </React.Fragment>
            ))}
        </span>
    );
}

export function TemplatePicker({ templates, value, onChange, disabled = false, label, locked = false }) {
    const categories = useMemo(() => ['All', ...new Set(templates.map((template) => template.category).filter((category) => category !== 'Your CV'))], [templates]);
    const [category, setCategory] = useState('All');
    const shown = templates.filter((template) => category === 'All' || template.category === category || template.value === 'original');

    return (
        <div>
            <div className="rt-tabs rt-template-tabs mb-2" role="tablist" aria-label={`${label} categories`}>
                {categories.map((name) => (
                    <button key={name} type="button" role="tab" aria-selected={category === name} className={`rt-tab ${category === name ? 'is-active' : ''}`} onClick={() => setCategory(name)}>
                        {name}
                        <span className="rt-count">{name === 'All' ? templates.length : templates.filter((template) => template.category === name).length}</span>
                    </button>
                ))}
            </div>
            <div className="rt-templates" role="radiogroup" aria-label={label}>
                {shown.map((template) => (
                    <button
                        key={template.value}
                        type="button"
                        role="radio"
                        aria-checked={value === template.value}
                        className={`rt-template ${value === template.value ? 'is-active' : ''}`}
                        onClick={() => onChange(template.value)}
                        disabled={disabled}
                        title={template.premium && locked ? `${template.description} (Pro)` : template.description}
                    >
                        <TemplateThumb preview={template.preview} />
                        <span className="rt-template-label">
                            {template.label}
                            {template.premium && locked && <i className="bi bi-lock-fill ms-1 text-muted" aria-label="Pro design"></i>}
                        </span>
                        <span className="rt-template-desc">{template.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function Chip({ keyword, tone, title }) {
    return (
        <span className={`rt-chip rt-chip-${tone} ${keyword.importance === 'required' ? 'rt-chip-required' : ''}`} title={title}>
            {keyword.term}
        </span>
    );
}

export const STATUS_ICONS = {
    pass: 'bi-check-circle-fill text-success',
    warn: 'bi-exclamation-circle-fill text-warning',
    fail: 'bi-x-circle-fill text-danger',
};

export const CATEGORY_LABELS = {
    hard_skill: 'Hard skills',
    tool: 'Tools',
    soft_skill: 'Soft skills',
    certification: 'Certifications',
    education: 'Education',
    job_title: 'Job title',
};

/**
 * One row per scoring check: whether it passes, why, how to fix it and how many points the fix is worth.
 */
export function ScoreChecklist({ breakdown }) {
    return (
        <ul className="list-unstyled d-grid gap-3 mb-0">
            {BREAKDOWN_ORDER.filter((key) => breakdown[key]).map((key) => {
                const check = breakdown[key];
                return (
                    <li key={key} className="d-flex gap-3 align-items-start">
                        <i className={`bi ${STATUS_ICONS[check.status] ?? STATUS_ICONS.warn} fs-5`} aria-label={check.status}></i>
                        <div className="flex-grow-1">
                            <div className="d-flex justify-content-between gap-2">
                                <span className="fw-semibold">{check.label} <span className="rt-weight ms-1">{check.weight}%</span></span>
                                <span className="small fw-semibold text-nowrap" style={{ color: toneColor[scoreTone(check.score)] }}>{check.score}/100</span>
                            </div>
                            <small className="text-muted d-block">{check.detail}</small>
                            {check.tip && (
                                <small className="d-block mt-1">
                                    <i className="bi bi-lightbulb me-1 text-warning"></i>{check.tip}
                                    {check.gain > 0 && <span className="badge rounded-pill text-bg-light border ms-2">up to +{check.gain} pts</span>}
                                </small>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Placeholder words for the blurred chips. They only give each chip a believable width: the real
 * hidden keywords are never sent to the browser (only how many there are), so un-blurring reveals nothing.
 */
const PLACEHOLDER_WORDS = ['Placeholder', 'Hidden skill', 'Locked', 'Keyword', 'Pro only', 'Hidden tool', 'Locked skill', 'Keyword item'];

const MAX_BLURRED_CHIPS = 12;

/**
 * The missing keywords the Free plan hides, drawn as blurred chips under a "Go Pro" note.
 */
export function HiddenKeywordsNotice({ count }) {
    if (!count) {
        return null;
    }

    const chips = Array.from({ length: Math.min(count, MAX_BLURRED_CHIPS) }, (_, index) => PLACEHOLDER_WORDS[index % PLACEHOLDER_WORDS.length]);

    return (
        <div className="rt-locked mt-3">
            <div className="rt-locked-chips" aria-hidden="true">
                {chips.map((word, index) => (
                    <span key={index} className="rt-chip rt-chip-danger">{word}</span>
                ))}
            </div>
            <div className="rt-locked-overlay">
                <span className="rt-upgrade-icon"><i className="bi bi-lock-fill"></i></span>
                <div className="fw-semibold">+{count} more missing keyword{count === 1 ? '' : 's'}</div>
                <div className="text-muted small mb-2">Go Pro to see all missing keywords and add the ones you have.</div>
                <Link href="/pricing" className="btn btn-sm rt-btn-primary px-3 py-1"><i className="bi bi-lightning-charge-fill me-1"></i>Go Pro to see all</Link>
            </div>
        </div>
    );
}

/**
 * Job keywords grouped by kind (hard skills, tools, soft skills...), found ones green and missing ones red.
 */
export function KeywordGroups({ matched, missing, hiddenCount = 0 }) {
    const groups = useMemo(() => {
        const byCategory = {};
        [...matched.map((keyword) => ({ ...keyword, found: true })), ...missing.map((keyword) => ({ ...keyword, found: false }))].forEach((keyword) => {
            const category = CATEGORY_LABELS[keyword.category] ? keyword.category : 'hard_skill';
            (byCategory[category] ??= []).push(keyword);
        });
        return Object.keys(CATEGORY_LABELS).filter((category) => byCategory[category]).map((category) => [category, byCategory[category]]);
    }, [matched, missing]);

    return (
        <div className="d-grid gap-3">
            {groups.map(([category, keywords]) => (
                <div key={category}>
                    <div className="small fw-semibold mb-2">
                        {CATEGORY_LABELS[category]}{' '}
                        <span className="text-muted fw-normal">{keywords.filter((keyword) => keyword.found).length} found</span>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {keywords.map((keyword) => (
                            <Chip
                                key={keyword.term}
                                keyword={keyword}
                                tone={keyword.found ? (keyword.in_context === false ? 'warning' : 'success') : 'danger'}
                                title={keyword.found ? (keyword.in_context === false ? 'Only in your skills list' : 'Found') : 'Missing'}
                            />
                        ))}
                    </div>
                </div>
            ))}
            <HiddenKeywordsNotice count={hiddenCount} />
        </div>
    );
}

export function UpgradeNotice({ upgrade, onClose, innerRef }) {
    return (
        <div ref={innerRef} className="rt-upgrade mb-3 rt-fade-in" role="alert">
            <span className="rt-upgrade-icon"><i className="bi bi-stars"></i></span>
            <div className="flex-grow-1 small">
                <div className="fw-semibold mb-1">{upgrade.url ? 'This is a Pro feature' : 'Monthly limit reached'}</div>
                <div className="text-muted">{upgrade.message}</div>
                {upgrade.url && (
                    <Link href={upgrade.url} className="btn btn-sm rt-btn-primary mt-2 px-3 py-1">
                        <i className="bi bi-lightning-charge-fill me-1"></i>See Pro plans
                    </Link>
                )}
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
        </div>
    );
}

/**
 * How much of this month's tailoring quota is used, with a way to upgrade when it runs out.
 */
export function UsageMeter({ billing }) {
    if (!billing) {
        return null;
    }

    if (billing.plan === 'pro') {
        return (
            <div className="rt-usage d-flex align-items-center gap-2 small mt-3">
                <span className="rt-plan-pill"><i className="bi bi-stars"></i>Pro{billing.trial_ends_at ? ' trial' : ''}</span>
                <span className="text-muted">
                    {billing.remaining === null ? 'Unlimited tailored CVs' : `${billing.remaining} tailored CV${billing.remaining === 1 ? '' : 's'} left ${billing.limit_covers_trial ? 'in your trial' : 'this month'}`} · all designs unlocked
                    {billing.trial_ends_at && ` · trial ends ${new Date(billing.trial_ends_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                </span>
            </div>
        );
    }

    const used = Math.min(billing.used, billing.limit);
    const isEmpty = billing.remaining === 0;
    const resetsOn = new Date(`${billing.resets_at}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

    return (
        <div className={`rt-usage small mt-3 ${isEmpty ? 'is-empty' : ''}`}>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <span className="fw-semibold">
                    Free plan · {billing.remaining} of {billing.limit} tailored CV{billing.limit === 1 ? '' : 's'} left
                </span>
                <Link href="/pricing" className="fw-semibold text-decoration-none text-nowrap">
                    <i className="bi bi-lightning-charge-fill me-1"></i>Go Pro
                </Link>
            </div>
            <div className="rt-usage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={billing.limit} aria-valuenow={used} aria-label="Tailored CVs used this month">
                <span style={{ width: `${billing.limit > 0 ? (used / billing.limit) * 100 : 0}%` }}></span>
            </div>
            <div className="text-muted mt-2">
                {isEmpty ? `Resets on ${resetsOn}. ATS score checks stay free and unlimited.` : 'ATS score checks are free and unlimited.'}
            </div>
        </div>
    );
}
