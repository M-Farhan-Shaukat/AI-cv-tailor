import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import NavBar from '../Components/NavBar';
import {
    Bar,
    BREAKDOWN_ORDER,
    Chip,
    errorMessage,
    HiddenKeywordsNotice,
    ScoreGauge,
    scoreTone,
    TemplatePicker,
    toneColor,
    UpgradeNotice,
} from '../Components/TailorUi';
import MainLayout from '../Layouts/MainLayout';

/**
 * One tailored resume on its own page: before and after scores, keywords, confirm-missing-skills,
 * the design picker, preview and download. Opened in the same tab right after tailoring.
 */
export default function TailoredResume({ result: initialResult, templates = [], seo }) {
    const { billing } = usePage().props;
    const isPro = billing?.plan === 'pro';
    const [result, setResult] = useState(initialResult);
    const [keywordTab, setKeywordTab] = useState(initialResult.added_keywords.length > 0 ? 'added' : 'missing');
    const [previewTab, setPreviewTab] = useState('formatted');
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [customSkill, setCustomSkill] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [refineError, setRefineError] = useState('');
    const [toast, setToast] = useState('');
    const [isSwitchingTemplate, setIsSwitchingTemplate] = useState(false);
    const [templateError, setTemplateError] = useState('');
    const [upgrade, setUpgrade] = useState(null);

    useEffect(() => {
        if (!toast) {
            return undefined;
        }
        const timeout = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(timeout);
    }, [toast]);

    const keptKeywords = useMemo(() => {
        const added = new Set(result.added_keywords.map((keyword) => keyword.term));
        return result.tailored_score.matched.filter((keyword) => !added.has(keyword.term));
    }, [result]);

    const showResult = (data) => {
        setResult(data);
        setSelectedSkills([]);
        setCustomSkill('');
        setKeywordTab(data.added_keywords.length > 0 ? 'added' : 'missing');
    };

    const toggleSkill = (term) => {
        setSelectedSkills((prev) => (prev.includes(term) ? prev.filter((skill) => skill !== term) : [...prev, term]));
    };

    const addCustomSkill = (event) => {
        event.preventDefault();
        const skill = customSkill.trim();
        if (skill && !selectedSkills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
            setSelectedSkills((prev) => [...prev, skill]);
        }
        setCustomSkill('');
    };

    const handleRefine = async () => {
        if (selectedSkills.length === 0) {
            return;
        }
        setRefineError('');
        setIsRefining(true);
        const previousScore = result.tailored_score.score;

        try {
            const response = await axios.post(result.refine_url, { confirmed_skills: selectedSkills }, { headers: { Accept: 'application/json' } });
            showResult(response.data);
            const gained = response.data.tailored_score.score - previousScore;
            setToast(gained > 0 ? `Score improved by ${gained} points` : 'Resume updated with your confirmed skills');
        } catch (err) {
            setRefineError(errorMessage(err, 'Could not update the resume. Please try again.'));
        } finally {
            setIsRefining(false);
        }
    };

    const changeTemplate = async (value) => {
        if (value === result.template || isSwitchingTemplate) {
            return;
        }
        const chosen = templates.find((option) => option.value === value);
        if (!isPro && chosen?.premium) {
            setUpgrade({ message: `The ${chosen.label} design is part of Pro. Choose a free design or upgrade to use it.`, url: '/pricing' });
            return;
        }
        setUpgrade(null);
        setTemplateError('');
        setIsSwitchingTemplate(true);

        try {
            const response = await axios.post(result.template_url, { template: value }, { headers: { Accept: 'application/json' } });
            setResult((previous) => ({ ...previous, ...response.data }));
            setPreviewTab('formatted');
            setToast(`Design changed to ${chosen?.label ?? value}`);
        } catch (err) {
            if (err?.response?.status === 402) {
                setUpgrade({ message: err.response.data?.message, url: err.response.data?.upgrade_url });
            } else {
                setTemplateError(errorMessage(err, 'Could not change the design. Please try again.'));
            }
        } finally {
            setIsSwitchingTemplate(false);
        }
    };

    const copyPlainText = async () => {
        try {
            await navigator.clipboard.writeText(result.plain_text);
            setToast('Plain-text resume copied to clipboard');
        } catch {
            setToast('Copy failed. Select the text in the "ATS plain text" tab instead.');
        }
    };

    const delta = result.tailored_score.score - result.original_score.score;
    const missingTotal = result.tailored_score.missing_total ?? result.tailored_score.missing.length;
    const unverifiedCount = result.added_keywords.filter((keyword) => !keyword.evidence).length;

    return (
        <MainLayout seo={seo}>
            <Head title="Your tailored resume" />
            <NavBar />

            <header className="rt-hero rt-hero-compact">
                <div className="container">
                    <span className="rt-pill mb-3"><i className="bi bi-patch-check"></i>Tailored and re-scored</span>
                    <h1 className="mb-2">Your ATS-optimized resume is ready</h1>
                    {result.job_title && <p className="rt-hero-lead mb-0">Tailored for <strong className="text-white">{result.job_title}</strong></p>}
                </div>
            </header>

            <div className="container pb-5">
                <div className="rt-overlap d-grid gap-4 rt-fade-in" style={{ scrollMarginTop: '5rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
                    <section className="rt-card">
                        <div className="p-4 p-lg-5 rt-card-body">
                            <div className="row g-4 align-items-center">
                                <div className="col-lg-5">
                                    <div className="d-flex align-items-center justify-content-center gap-2 gap-sm-3">
                                        <div className="rt-gauge-slot"><ScoreGauge score={result.original_score.score} caption="Your CV" /></div>
                                        <div className="rt-arrow flex-shrink-0"><i className="bi bi-arrow-right"></i></div>
                                        <div className="rt-gauge-slot"><ScoreGauge score={result.tailored_score.score} caption="Tailored" /></div>
                                    </div>
                                </div>
                                <div className="col-lg-7">
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                        <span className={`rt-delta ${delta > 0 ? '' : 'is-flat'}`}>
                                            <i className={`bi ${delta > 0 ? 'bi-graph-up-arrow' : 'bi-dash'}`}></i>
                                            {delta > 0 ? `+${delta} points` : 'No change'}
                                        </span>
                                        {result.job_title && <span className="badge rounded-pill text-bg-light border">{result.job_title}</span>}
                                    </div>
                                    <h2 className="h4 fw-bold mb-2">Before and after</h2>
                                    <p className={`text-muted ${result.tailored_score.cap_reason ? 'mb-2' : 'mb-4'}`}>
                                        Now matching <strong>{result.tailored_score.matched.length}</strong> of{' '}
                                        <strong>{result.tailored_score.matched.length + missingTotal}</strong> job keywords, including{' '}
                                        <strong>{result.tailored_score.required_matched}/{result.tailored_score.required_total}</strong> required ones.
                                    </p>
                                    {result.tailored_score.cap_reason && (
                                        <p className="text-muted small mb-4"><i className="bi bi-info-circle me-1"></i>{result.tailored_score.cap_reason}</p>
                                    )}
                                    <div className="d-flex flex-wrap gap-2 rt-actions">
                                        <a className="btn btn-success rt-btn-success px-4" href={result.download_url}>
                                            <i className="bi bi-file-earmark-arrow-down me-2"></i>Download PDF
                                        </a>
                                        <button type="button" className="btn rt-btn-soft px-3" onClick={copyPlainText}>
                                            <i className="bi bi-clipboard me-2"></i>Copy text
                                        </button>
                                        <Link href="/" className="btn btn-outline-secondary px-3" style={{ borderRadius: '.7rem' }}>
                                            <i className="bi bi-plus-lg me-2"></i>Tailor another CV
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="row g-4">
                        <div className="col-lg-5">
                            <section className="rt-card h-100">
                                <div className="p-4 rt-card-body">
                                    <h2 className="rt-card-title mb-1"><i className="bi bi-bar-chart-line"></i>Score breakdown</h2>
                                    <p className="text-muted small mb-2">Grey = your CV, colour = tailored resume.</p>
                                    {BREAKDOWN_ORDER.filter((key) => result.tailored_score.breakdown[key]).map((key) => [key, result.tailored_score.breakdown[key]]).map(([key, metric]) => (
                                        <div key={key} className="rt-metric">
                                            <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                                                <span className="fw-semibold">{metric.label} <span className="rt-weight ms-1">{metric.weight}%</span></span>
                                                <span className="small fw-semibold text-nowrap">
                                                    <span className="text-muted">{result.original_score.breakdown[key].score}</span>
                                                    <i className="bi bi-arrow-right mx-1 text-muted"></i>
                                                    <span style={{ color: toneColor[scoreTone(metric.score)] }}>{metric.score}</span>
                                                </span>
                                            </div>
                                            <div className="d-grid gap-1">
                                                <Bar value={result.original_score.breakdown[key].score} variant="before" />
                                                <Bar value={metric.score} />
                                            </div>
                                            <small className="text-muted d-block mt-2">{metric.detail}</small>
                                            {metric.tip && (
                                                <small className="d-block mt-1"><i className="bi bi-lightbulb me-1 text-warning"></i>{metric.tip}</small>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="col-lg-7">
                            <section className="rt-card h-100">
                                <div className="p-4 rt-card-body">
                                    <h2 className="rt-card-title mb-3"><i className="bi bi-tags"></i>Job keywords</h2>
                                    <div className="rt-tabs mb-3" role="tablist">
                                        {[
                                            ['added', 'Added', result.added_keywords.length],
                                            ['kept', 'Already had', keptKeywords.length],
                                            ['missing', 'Missing', missingTotal],
                                        ].map(([key, label, count]) => (
                                            <button key={key} type="button" role="tab" aria-selected={keywordTab === key} className={`rt-tab ${keywordTab === key ? 'is-active' : ''}`} onClick={() => setKeywordTab(key)}>
                                                {label}<span className="rt-count">{count}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {keywordTab === 'added' && (
                                        result.added_keywords.length === 0 ? (
                                            <p className="text-muted mb-0">No new keywords could be added from your CV. Check the Missing tab to confirm skills you have.</p>
                                        ) : (
                                            <>
                                                <p className="text-muted small">Keywords the tailored resume now contains that your original CV didn't.</p>
                                                {unverifiedCount > 0 && (
                                                    <div className="alert alert-warning d-flex gap-2 align-items-start py-2 small">
                                                        <i className="bi bi-exclamation-triangle mt-1"></i>
                                                        <span>
                                                            <strong>{unverifiedCount} keyword{unverifiedCount > 1 ? 's were' : ' was'} worded in without a direct quote from your CV.</strong>{' '}
                                                            Check the preview and make sure each one is true for you before you apply.
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="d-grid gap-2">
                                                    {result.added_keywords.map((keyword) => (
                                                        <div key={keyword.term}>
                                                            <Chip keyword={keyword} tone={keyword.evidence ? 'success' : 'warning'} title={keyword.evidence ? undefined : 'No direct CV evidence: verify before applying'} />
                                                            {keyword.evidence
                                                                ? <div className="rt-evidence mt-1">From your CV: "{keyword.evidence}"</div>
                                                                : <div className="rt-evidence rt-evidence-warning mt-1">No direct CV evidence. Verify this is true for you</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )
                                    )}

                                    {keywordTab === 'kept' && (
                                        <div className="d-flex flex-wrap gap-2">
                                            {keptKeywords.length === 0
                                                ? <p className="text-muted mb-0">Your original CV didn't contain any of the job keywords.</p>
                                                : keptKeywords.map((keyword) => <Chip key={keyword.term} keyword={keyword} tone="info" />)}
                                        </div>
                                    )}

                                    {keywordTab === 'missing' && (
                                        missingTotal === 0 ? (
                                            <p className="text-success mb-0"><i className="bi bi-trophy me-1"></i>Every job keyword is covered.</p>
                                        ) : (
                                            <>
                                                <p className="text-muted small mb-3">
                                                    Not added because your CV doesn't show them. <strong>Tap the ones you genuinely have</strong> and we'll
                                                    weave them into your resume.
                                                </p>
                                                <div className="d-flex flex-wrap gap-2 mb-3">
                                                    {result.tailored_score.missing.map((keyword) => {
                                                        const isSelected = selectedSkills.includes(keyword.term);
                                                        return (
                                                            <button key={keyword.term} type="button" className={`rt-chip rt-chip-danger ${keyword.importance === 'required' ? 'rt-chip-required' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => toggleSkill(keyword.term)} aria-pressed={isSelected}>
                                                                <i className={`bi ${isSelected ? 'bi-check-lg' : 'bi-plus'}`}></i>{keyword.term}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <HiddenKeywordsNotice count={result.tailored_score.missing_hidden ?? 0} />
                                            </>
                                        )
                                    )}

                                    {(keywordTab === 'missing' || selectedSkills.length > 0) && (
                                        <div className="border-top pt-3 mt-3">
                                            <form className="input-group mb-2" onSubmit={addCustomSkill}>
                                                <input type="text" className="form-control rt-input" placeholder="Add another skill you have (e.g. Docker)" value={customSkill} maxLength={60} onChange={(event) => setCustomSkill(event.target.value)} />
                                                <button className="btn rt-btn-soft" type="submit" disabled={!customSkill.trim()}><i className="bi bi-plus-lg"></i></button>
                                            </form>
                                            {selectedSkills.filter((skill) => !result.tailored_score.missing.some((keyword) => keyword.term === skill)).length > 0 && (
                                                <div className="d-flex flex-wrap gap-2 mb-2">
                                                    {selectedSkills.filter((skill) => !result.tailored_score.missing.some((keyword) => keyword.term === skill)).map((skill) => (
                                                        <button key={skill} type="button" className="rt-chip rt-chip-info is-selected" onClick={() => toggleSkill(skill)}>
                                                            {skill}<i className="bi bi-x"></i>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {refineError && <div className="alert alert-danger py-2 small">{refineError}</div>}
                                            <button type="button" className="btn rt-btn-primary w-100" disabled={selectedSkills.length === 0 || isRefining} onClick={handleRefine}>
                                                {isRefining ? (
                                                    <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Updating your resume...</>
                                                ) : (
                                                    <><i className="bi bi-arrow-repeat me-2"></i>Update resume{selectedSkills.length > 0 ? ` with ${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''}` : ''}</>
                                                )}
                                            </button>
                                            {result.confirmed_skills?.length > 0 && (
                                                <small className="text-muted d-block mt-2">Already confirmed: {result.confirmed_skills.join(', ')}</small>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    {result.changes?.length > 0 && (
                        <section className="rt-card">
                            <div className="p-4 rt-card-body">
                                <h2 className="rt-card-title mb-3"><i className="bi bi-pencil-square"></i>What we changed</h2>
                                <ul className="rt-changes row row-cols-1 row-cols-md-2 g-0">
                                    {result.changes.map((change, index) => (
                                        <li key={index} className="pe-md-3"><i className="bi bi-check2-circle"></i><span>{change}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    <section className="rt-card">
                        <div className="p-4 rt-card-body">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
                                <h2 className="rt-card-title"><i className="bi bi-eye"></i>Preview</h2>
                                <div className="rt-tabs" role="tablist">
                                    {[['formatted', 'Formatted'], ['plain', 'ATS plain text']].map(([key, label]) => (
                                        <button key={key} type="button" role="tab" aria-selected={previewTab === key} className={`rt-tab ${previewTab === key ? 'is-active' : ''}`} onClick={() => setPreviewTab(key)}>{label}</button>
                                    ))}
                                </div>
                            </div>
                            {templates.length > 0 && (
                                <div className="mb-3">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <span className="fw-semibold small">Design</span>
                                        {isSwitchingTemplate && <span className="spinner-border spinner-border-sm text-secondary" aria-label="Applying design"></span>}
                                        <small className="text-muted ms-auto d-none d-sm-inline">Changing the design keeps your text and ATS score the same.</small>
                                    </div>
                                    <TemplatePicker templates={templates} value={result.template} onChange={changeTemplate} disabled={isSwitchingTemplate} label="Resume design" locked={!isPro} />
                                    {!isPro && (
                                        <small className="text-muted d-block mt-2">
                                            Designs with <i className="bi bi-lock-fill"></i> are included in <Link href="/pricing">Pro</Link>.
                                        </small>
                                    )}
                                    {templateError && <div className="text-danger small mt-2" role="alert">{templateError}</div>}
                                    {upgrade && <div className="mt-2"><UpgradeNotice upgrade={upgrade} onClose={() => setUpgrade(null)} /></div>}
                                </div>
                            )}
                            {previewTab === 'formatted'
                                ? <iframe title="Tailored resume preview" srcDoc={result.html} className="rt-preview-frame"></iframe>
                                : <pre className="rt-plain">{result.plain_text}</pre>}
                            {previewTab === 'plain' && <small className="text-muted d-block mt-2">This is exactly what an ATS parser reads from your PDF. Paste it into application forms that ask for plain text.</small>}
                        </div>
                    </section>
                </div>
            </div>


            {toast && <div className="rt-toast" role="status"><i className="bi bi-check-circle-fill text-success"></i>{toast}</div>}
        </MainLayout>
    );
}
