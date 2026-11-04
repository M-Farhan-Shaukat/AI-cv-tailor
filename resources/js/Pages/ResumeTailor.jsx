import { Head } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import NavBar from '../Components/NavBar';
import MainLayout from '../Layouts/MainLayout';

const STAGES = [
    { label: 'Reading your CV', icon: 'bi-file-earmark-text' },
    { label: 'Extracting ATS keywords from the job description', icon: 'bi-search' },
    { label: 'Scoring your current CV', icon: 'bi-speedometer2' },
    { label: 'Rewriting every section with JD keywords', icon: 'bi-magic' },
    { label: 'Verifying claims against your CV', icon: 'bi-shield-check' },
    { label: 'Re-scoring the tailored resume', icon: 'bi-graph-up-arrow' },
];

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIN_JD_LENGTH = 50;
const BREAKDOWN_ORDER = ['keywords', 'job_title', 'sections', 'contact'];

const scoreTone = (score) => (score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger');
const toneColor = { success: 'var(--rt-success)', warning: 'var(--rt-warning)', danger: 'var(--rt-danger)' };

const errorMessage = (err, fallback) => {
    const errors = err?.response?.data?.errors;
    if (errors) {
        return Object.values(errors).flat()[0];
    }
    if (err?.response?.status === 429) {
        return 'Too many requests. Please wait a minute and try again.';
    }
    if (!err?.response) {
        return 'The connection to the server was lost. Please try again with a shorter job description.';
    }
    return err?.response?.data?.message || err?.message || fallback;
};

function ScoreGauge({ score, caption }) {
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

function Bar({ value, variant }) {
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

function Chip({ keyword, tone, title }) {
    return (
        <span className={`rt-chip rt-chip-${tone} ${keyword.importance === 'required' ? 'rt-chip-required' : ''}`} title={title}>
            {keyword.term}
        </span>
    );
}

export default function ResumeTailor({ seo, prefill = null }) {
    const [cvFile, setCvFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [jobDescription, setJobDescription] = useState(prefill?.job_description || '');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressStage, setProgressStage] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [keywordTab, setKeywordTab] = useState('added');
    const [previewTab, setPreviewTab] = useState('formatted');
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [customSkill, setCustomSkill] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [refineError, setRefineError] = useState('');
    const [toast, setToast] = useState('');
    const fileInput = useRef(null);
    const resultsRef = useRef(null);
    const timers = useRef([]);

    useEffect(() => () => timers.current.forEach(clearInterval), []);

    useEffect(() => {
        if (!toast) {
            return undefined;
        }
        const timeout = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(timeout);
    }, [toast]);

    const keptKeywords = useMemo(() => {
        if (!result) {
            return [];
        }
        const added = new Set(result.added_keywords.map((keyword) => keyword.term));
        return result.tailored_score.matched.filter((keyword) => !added.has(keyword.term));
    }, [result]);

    const selectFile = (file) => {
        setError('');
        if (!file) {
            return;
        }
        if (!ALLOWED_TYPES.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
            setError('Please upload your CV as a PDF or DOCX file.');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setError('File size must be under 5MB.');
            return;
        }
        setCvFile(file);
    };

    const clearFile = () => {
        setCvFile(null);
        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const startProgress = () => {
        setProgressStage(0);
        setElapsed(0);
        const stageTimer = setInterval(() => setProgressStage((prev) => Math.min(prev + 1, STAGES.length - 1)), 5000);
        const clockTimer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
        timers.current = [stageTimer, clockTimer];
    };

    const stopProgress = () => {
        timers.current.forEach(clearInterval);
        timers.current = [];
    };

    const showResult = (data) => {
        setResult(data);
        setSelectedSkills([]);
        setCustomSkill('');
        setKeywordTab(data.added_keywords.length > 0 ? 'added' : 'missing');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!cvFile) {
            setError('Please upload your CV (PDF or DOCX).');
            return;
        }
        if (jobDescription.trim().length < MIN_JD_LENGTH) {
            setError(`Please paste a more detailed job description (minimum ${MIN_JD_LENGTH} characters).`);
            return;
        }

        setResult(null);
        setIsProcessing(true);
        startProgress();

        try {
            const formData = new FormData();
            formData.append('cv_file', cvFile);
            formData.append('job_description', jobDescription);

            if (prefill?.job_posting_id) {
                formData.append('job_posting_id', prefill.job_posting_id);
            }

            const response = await axios.post('/tailor', formData, { headers: { Accept: 'application/json' } });
            showResult(response.data);
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) {
            setError(errorMessage(err, 'Something went wrong while tailoring your resume. Please try again.'));
        } finally {
            stopProgress();
            setIsProcessing(false);
        }
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

    const copyPlainText = async () => {
        try {
            await navigator.clipboard.writeText(result.plain_text);
            setToast('Plain-text resume copied to clipboard');
        } catch {
            setToast('Copy failed. Select the text in the "ATS plain text" tab instead.');
        }
    };

    const startOver = () => {
        setResult(null);
        clearFile();
        setJobDescription('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const delta = result ? result.tailored_score.score - result.original_score.score : 0;
    const unverifiedCount = result ? result.added_keywords.filter((keyword) => !keyword.evidence).length : 0;

    return (
        <MainLayout seo={seo}>
            <Head title="AI Resume Tailor" />

            <NavBar>
                <a href="#how-it-works" className="rt-nav-link d-none d-sm-inline">How it works</a>
                <span className="badge rounded-pill text-bg-light border fw-semibold d-none d-lg-inline-flex align-items-center gap-1">
                    <i className="bi bi-lightning-charge-fill text-warning"></i>Powered by Groq
                </span>
            </NavBar>

            <header className="rt-hero">
                <div className="container">
                    <div className="row g-4 g-lg-5 align-items-center">
                        <div className="col-lg-6">
                            <span className="rt-pill mb-3"><i className="bi bi-stars"></i>AI powered · ATS optimized</span>
                            <h1 className="mb-3">Tailor your CV to any job and beat the ATS</h1>
                            <p className="rt-hero-lead mb-4">
                                Upload your CV and paste the job description. We score your match, rewrite every section with the
                                job's exact keywords, and give you a clean, single-column resume that every applicant tracking system can read.
                            </p>
                            <ul className="rt-hero-points list-unstyled d-grid gap-2 mb-0">
                                <li><i className="bi bi-check-circle-fill"></i>Before &amp; after ATS score with a full breakdown</li>
                                <li><i className="bi bi-check-circle-fill"></i>Truthful rewrite. Every added keyword is backed by your CV</li>
                                <li><i className="bi bi-check-circle-fill"></i>ATS-safe PDF: no tables, columns, icons or images</li>
                            </ul>
                        </div>

                        <div className="col-lg-6">
                            <div className="rt-card rt-form-card">
                                <form className="p-3 p-sm-4 p-lg-5" onSubmit={handleSubmit} noValidate>
                                    {prefill?.job_title && (
                                        <div className="alert alert-info d-flex gap-2 align-items-start py-2 small" role="status">
                                            <i className="bi bi-briefcase mt-1"></i>
                                            <span>Tailoring for <strong>{prefill.job_title}</strong>. The job description is pre-filled below.</span>
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold">1. Upload your CV</label>
                                        {cvFile ? (
                                            <div className="rt-file-chip">
                                                <i className="bi bi-file-earmark-text"></i>
                                                <div className="flex-grow-1 text-truncate">
                                                    <div className="fw-semibold text-truncate">{cvFile.name}</div>
                                                    <small className="text-muted">{(cvFile.size / 1024).toFixed(0)} KB</small>
                                                </div>
                                                <button type="button" className="btn btn-sm btn-link text-muted" onClick={clearFile} disabled={isProcessing} aria-label="Remove file">
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <label
                                                className={`rt-dropzone ${isDragging ? 'is-dragging' : ''}`}
                                                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
                                            >
                                                <input
                                                    ref={fileInput}
                                                    type="file"
                                                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                    onChange={(event) => selectFile(event.target.files?.[0])}
                                                />
                                                <i className="bi bi-cloud-arrow-up rt-dropzone-icon"></i>
                                                <span className="fw-semibold">Drop your CV here or <span style={{ color: 'var(--rt-primary)' }}>browse</span></span>
                                                <small className="text-muted">PDF or DOCX · up to 5MB</small>
                                            </label>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-end mb-2">
                                            <label htmlFor="job-description" className="form-label fw-semibold mb-0">2. Paste the job description</label>
                                            {jobDescription && (
                                                <button type="button" className="btn btn-link btn-sm p-0 text-muted" onClick={() => setJobDescription('')} disabled={isProcessing}>Clear</button>
                                            )}
                                        </div>
                                        <textarea
                                            id="job-description"
                                            className="form-control rt-textarea"
                                            rows="8"
                                            placeholder="Paste the full job description: title, responsibilities, requirements and nice-to-haves..."
                                            value={jobDescription}
                                            onChange={(event) => setJobDescription(event.target.value)}
                                            disabled={isProcessing}
                                        ></textarea>
                                        <div className="d-flex justify-content-between mt-2">
                                            <small className={jobDescription.trim().length >= MIN_JD_LENGTH ? 'text-success' : 'text-muted'}>
                                                {jobDescription.trim().length >= MIN_JD_LENGTH ? <><i className="bi bi-check2 me-1"></i>Looks good</> : `Min ${MIN_JD_LENGTH} characters`}
                                            </small>
                                            <small className="text-muted">{jobDescription.length.toLocaleString()} chars</small>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="alert alert-danger d-flex gap-2 align-items-start py-2 rt-fade-in" role="alert">
                                            <i className="bi bi-exclamation-octagon mt-1"></i><span>{error}</span>
                                        </div>
                                    )}

                                    <button className="btn rt-btn-primary w-100" type="submit" disabled={isProcessing}>
                                        {isProcessing ? (
                                            <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Tailoring your resume...</>
                                        ) : (
                                            <><i className="bi bi-magic me-2"></i>Analyze &amp; tailor my resume</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container pb-5">
                {isProcessing && (
                    <section className="rt-card rt-overlap rt-fade-in mx-auto" style={{ maxWidth: '44rem' }} aria-live="polite">
                        <div className="p-4 p-lg-5 rt-card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
                                <h2 className="rt-card-title"><i className="bi bi-cpu"></i>AI is tailoring your resume</h2>
                                <span className="text-muted small text-nowrap"><i className="bi bi-stopwatch me-1"></i>{elapsed}s</span>
                            </div>
                            <ul className="rt-stepper">
                                {STAGES.map((stage, index) => {
                                    const state = index < progressStage ? 'is-done' : index === progressStage ? 'is-active' : '';
                                    return (
                                        <li key={stage.label} className={state}>
                                            <span className="rt-stepper-dot">
                                                {index < progressStage ? <i className="bi bi-check-lg"></i> : index === progressStage ? <span className="spinner-border spinner-border-sm text-primary" style={{ width: '.8rem', height: '.8rem' }}></span> : null}
                                            </span>
                                            {stage.label}
                                        </li>
                                    );
                                })}
                            </ul>
                            <p className="text-muted small mb-0 mt-3"><i className="bi bi-info-circle me-1"></i>This usually takes 20-60 seconds on Groq's free tier.</p>
                        </div>
                    </section>
                )}

                {result && !isProcessing && (
                    <div ref={resultsRef} className="rt-overlap d-grid gap-4 rt-fade-in" style={{ scrollMarginTop: '5rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
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
                                        <h2 className="h4 fw-bold mb-2">Your ATS-optimized resume is ready</h2>
                                        <p className={`text-muted ${result.tailored_score.cap_reason ? 'mb-2' : 'mb-4'}`}>
                                            Now matching <strong>{result.tailored_score.matched.length}</strong> of{' '}
                                            <strong>{result.tailored_score.matched.length + result.tailored_score.missing.length}</strong> job keywords, including{' '}
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
                                            <button type="button" className="btn btn-outline-secondary px-3" style={{ borderRadius: '.7rem' }} onClick={startOver}>
                                                <i className="bi bi-arrow-counterclockwise me-2"></i>New resume
                                            </button>
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
                                                ['missing', 'Missing', result.tailored_score.missing.length],
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
                                            result.tailored_score.missing.length === 0 ? (
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
                                {previewTab === 'formatted'
                                    ? <iframe title="Tailored resume preview" srcDoc={result.html} className="rt-preview-frame"></iframe>
                                    : <pre className="rt-plain">{result.plain_text}</pre>}
                                {previewTab === 'plain' && <small className="text-muted d-block mt-2">This is exactly what an ATS parser reads from your PDF. Paste it into application forms that ask for plain text.</small>}
                            </div>
                        </section>
                    </div>
                )}

                {!result && !isProcessing && (
                    <section id="how-it-works" className="rt-overlap" style={{ scrollMarginTop: '5rem' }}>
                        <div className="row g-3 g-lg-4">
                            {[
                                ['bi-upload', 'Upload & paste', 'Add your current CV (PDF or DOCX) and the job description you are applying for.'],
                                ['bi-speedometer2', 'Get your ATS score', 'We extract the keywords recruiters filter by and score your CV the way an ATS ranks it.'],
                                ['bi-magic', 'Download the tailored CV', 'Every section is rewritten with the job\'s exact keywords, re-scored, and exported as an ATS-safe PDF.'],
                            ].map(([icon, title, text], index) => (
                                <div className="col-md-4" key={title}>
                                    <div className="rt-card rt-step">
                                        <div className="rt-step-icon"><i className={`bi ${icon}`}></i></div>
                                        <div className="rt-step-number mb-1">Step {index + 1}</div>
                                        <h3 className="h6 fw-bold mb-2">{title}</h3>
                                        <p className="text-muted small mb-0">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <footer className="rt-footer mt-auto py-4">
                <div className="container d-flex flex-column flex-sm-row justify-content-between gap-2 text-center text-sm-start">
                    <span>&copy; {new Date().getFullYear()} ResumeTailor AI</span>
                    <span>Your CV text is processed by Groq AI to generate your tailored resume.</span>
                </div>
            </footer>

            {toast && <div className="rt-toast" role="status"><i className="bi bi-check-circle-fill text-success"></i>{toast}</div>}
        </MainLayout>
    );
}
