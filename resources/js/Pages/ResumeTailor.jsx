import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import NavBar from '../Components/NavBar';
import { BREAKDOWN_ORDER, errorMessage, KeywordGroups, ScoreChecklist, ScoreGauge, UpgradeNotice, UsageMeter } from '../Components/TailorUi';
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

function ScanReport({ scan, isProcessing, onTailor }) {
    const score = scan.score;
    const potential = Math.min(100, score.score + BREAKDOWN_ORDER.reduce((total, key) => total + (score.breakdown[key]?.gain ?? 0), 0));

    return (
        <div className="rt-overlap d-grid gap-4 rt-fade-in" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <section className="rt-card">
                <div className="p-4 p-lg-5 rt-card-body">
                    <div className="row g-4 align-items-center">
                        <div className="col-lg-4 d-flex justify-content-center">
                            <div className="rt-gauge-slot"><ScoreGauge score={score.score} caption="ATS match" /></div>
                        </div>
                        <div className="col-lg-8">
                            {scan.job_title && <span className="badge rounded-pill text-bg-light border mb-2">{scan.job_title}</span>}
                            <h2 className="h4 fw-bold mb-2">Your CV matches {score.score}% of this job</h2>
                            <p className="text-muted mb-3">
                                Found <strong>{score.matched.length}</strong> of <strong>{score.matched.length + (score.missing_total ?? score.missing.length)}</strong> job keywords,
                                including <strong>{score.required_matched}/{score.required_total}</strong> required ones.
                                {potential > score.score && <> Fixing the items below could raise it to about <strong>{potential}%</strong>.</>}
                            </p>
                            <p className="text-muted small mb-3">
                                <i className="bi bi-info-circle me-1"></i>
                                An estimate of how well your CV matches this job, scored the way keyword-based ATS tools rank CVs. Each employer's system works differently.
                            </p>
                            <button type="button" className="btn rt-btn-primary px-4" onClick={onTailor} disabled={isProcessing}>
                                <i className="bi bi-magic me-2"></i>Tailor my CV to fix this
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="row g-4">
                <div className="col-lg-6">
                    <section className="rt-card h-100">
                        <div className="p-4 rt-card-body">
                            <h2 className="rt-card-title mb-3"><i className="bi bi-list-check"></i>Checks and fixes</h2>
                            <ScoreChecklist breakdown={score.breakdown} />
                        </div>
                    </section>
                </div>
                <div className="col-lg-6">
                    <section className="rt-card h-100">
                        <div className="p-4 rt-card-body">
                            <h2 className="rt-card-title mb-1"><i className="bi bi-tags"></i>Job keywords</h2>
                            <p className="text-muted small mb-3">Green = found, amber = only in your skills list, red = missing.</p>
                            <KeywordGroups matched={score.matched} missing={score.missing} hiddenCount={score.missing_hidden ?? 0} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default function ResumeTailor({ seo, prefill = null, maxJobDescriptionWords = 15000 }) {
    const [cvFile, setCvFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [jobDescription, setJobDescription] = useState(prefill?.job_description || '');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressStage, setProgressStage] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState('');
    const [upgrade, setUpgrade] = useState(null);
    const { billing } = usePage().props;
    const [scan, setScan] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const scanRef = useRef(null);
    const upgradeRef = useRef(null);
    const fileInput = useRef(null);
    const timers = useRef([]);

    useEffect(() => () => timers.current.forEach(clearInterval), []);

    const jobDescriptionWords = useMemo(() => (jobDescription.match(/\S+/g) || []).length, [jobDescription]);
    const isJobDescriptionTooLong = jobDescriptionWords > maxJobDescriptionWords;

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

    /**
     * A 402 means the plan does not allow this (quota used up or a Pro design): show an upgrade prompt
     * instead of an error. Returns whether it handled the error.
     */
    const showUpgradeIfNeeded = (err) => {
        if (err?.response?.status !== 402) {
            return false;
        }
        setUpgrade({ message: err.response.data?.message, url: err.response.data?.upgrade_url });
        return true;
    };

    const validateInputs = () => {
        setError('');

        if (!cvFile) {
            setError('Please upload your CV (PDF or DOCX).');
            return false;
        }
        if (jobDescription.trim().length < MIN_JD_LENGTH) {
            setError(`Please paste a more detailed job description (minimum ${MIN_JD_LENGTH} characters).`);
            return false;
        }
        if (isJobDescriptionTooLong) {
            setError(`The job description is ${jobDescriptionWords.toLocaleString()} words. Please keep it under ${maxJobDescriptionWords.toLocaleString()} words.`);
            return false;
        }
        return true;
    };

    const handleScan = async () => {
        if (!validateInputs()) {
            return;
        }

        setScan(null);
        setUpgrade(null);
        setIsScanning(true);

        try {
            const formData = new FormData();
            formData.append('cv_file', cvFile);
            formData.append('job_description', jobDescription);

            const response = await axios.post('/scan', formData, { headers: { Accept: 'application/json' } });
            setScan(response.data);
            setTimeout(() => scanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) {
            setError(errorMessage(err, 'Something went wrong while checking your CV. Please try again.'));
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmit = async (event) => {
        event?.preventDefault();

        if (!validateInputs()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setUpgrade(null);
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
            router.visit(response.data.result_url, {
                onFinish: () => {
                    stopProgress();
                    setIsProcessing(false);
                },
            });
        } catch (err) {
            stopProgress();
            setIsProcessing(false);
            if (showUpgradeIfNeeded(err)) {
                setTimeout(() => upgradeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            } else {
                setError(errorMessage(err, 'Something went wrong while tailoring your resume. Please try again.'));
            }
        }
    };

    return (
        <MainLayout seo={seo}>
            <Head title="AI Resume Tailor" />

            <NavBar />

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
                                            <small className={isJobDescriptionTooLong ? 'text-danger fw-semibold' : 'text-muted'}>
                                                {jobDescriptionWords.toLocaleString()} / {maxJobDescriptionWords.toLocaleString()} words
                                            </small>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="alert alert-danger d-flex gap-2 align-items-start py-2 rt-fade-in" role="alert">
                                            <i className="bi bi-exclamation-octagon mt-1"></i><span>{error}</span>
                                        </div>
                                    )}

                                    {upgrade && <UpgradeNotice upgrade={upgrade} onClose={() => setUpgrade(null)} innerRef={upgradeRef} />}

                                    <button className="btn rt-btn-primary w-100" type="submit" disabled={isProcessing || isScanning}>
                                        {isProcessing ? (
                                            <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Tailoring your resume...</>
                                        ) : (
                                            <><i className="bi bi-magic me-2"></i>Analyze &amp; tailor my resume</>
                                        )}
                                    </button>
                                    <button className="btn rt-btn-soft w-100 mt-2" type="button" onClick={handleScan} disabled={isProcessing || isScanning}>
                                        {isScanning ? (
                                            <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Checking your CV...</>
                                        ) : (
                                            <><i className="bi bi-speedometer2 me-2"></i>Just check my ATS score (free)</>
                                        )}
                                    </button>

                                    <UsageMeter billing={billing} />
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
                            <p className="text-muted small mb-0 mt-3"><i className="bi bi-info-circle me-1"></i>This usually takes 20 to 60 seconds.</p>
                        </div>
                    </section>
                )}

                {scan && !isProcessing && (
                    <div ref={scanRef} style={{ scrollMarginTop: '5rem' }}>
                        <ScanReport scan={scan} isProcessing={isProcessing} onTailor={() => handleSubmit()} />
                    </div>
                )}

                {!scan && !isProcessing && (
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


        </MainLayout>
    );
}
