import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary', 'internship'];
const POSTED_WITHIN = [1, 3, 7, 14, 30];
const label = (value) => value.replace('_', ' ');

const scoreTone = (score) => (score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger');

const formatDate = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatSalary = (job) => {
    if (!job.salary_min && !job.salary_max) {
        return null;
    }
    const amount = (value) => value?.toLocaleString();
    const currency = job.currency ? `${job.currency} ` : '';
    if (job.salary_min && job.salary_max) {
        return `${currency}${amount(job.salary_min)} - ${amount(job.salary_max)}`;
    }
    return `${currency}${amount(job.salary_min || job.salary_max)}`;
};

const errorMessage = (err, fallback) => {
    const errors = err?.response?.data?.errors;
    if (errors) {
        return Object.values(errors).flat()[0];
    }
    if (err?.response?.status === 429) {
        return 'Too many scans. Please wait a few minutes and try again.';
    }
    if (!err?.response) {
        return 'The connection to the server was lost. Please try again.';
    }
    return err?.response?.data?.message || err?.message || fallback;
};

function StatusBanner({ status }) {
    if (!status) {
        return null;
    }

    const total = status.total || 0;
    const completed = status.completed || 0;
    const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 8;

    if (status.status === 'queued' || status.status === 'running') {
        return (
            <div className="alert alert-info rt-fade-in" role="status" aria-live="polite">
                <div className="d-flex justify-content-between align-items-center gap-2">
                    <span>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        {status.status === 'queued' ? 'Queued. Scanning job postings...' : 'Scoring job postings...'}
                    </span>
                    <span className="small text-nowrap">{total > 0 ? `${completed}/${total}` : 'starting'}</span>
                </div>
                <div className="progress mt-2" style={{ height: '.4rem' }}>
                    <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                </div>
            </div>
        );
    }

    if (status.status === 'failed') {
        return (
            <div className="alert alert-danger py-2 small rt-fade-in" role="alert">
                <i className="bi bi-exclamation-octagon me-2"></i>
                {status.message || 'The scan failed. Please try again.'}
            </div>
        );
    }

    if (status.status === 'completed') {
        return (
            <div className="alert alert-success py-2 small rt-fade-in" role="status">
                <i className="bi bi-check-circle me-2"></i>
                Scored {completed} job{completed === 1 ? '' : 's'}
                {status.failed > 0 ? ` (${status.failed} could not be scored)` : ''}.
            </div>
        );
    }

    return null;
}


const timeAgo = (value) => {
    if (!value) {
        return null;
    }
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
    if (Number.isNaN(days)) {
        return null;
    }
    if (days <= 0) {
        return 'Today';
    }
    if (days === 1) {
        return 'Yesterday';
    }
    if (days < 30) {
        return `${days} days ago`;
    }
    return formatDate(value);
};

const AVATAR_TONES = ['indigo', 'violet', 'green', 'sky', 'amber', 'rose'];
const avatarTone = (text = '') => AVATAR_TONES[[...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];

/**
 * A small circular gauge with the match score, or a dash when the job has not been scored.
 */
function MatchRing({ match }) {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const tone = match ? scoreTone(match.score) : 'muted';
    const colors = { success: 'var(--rt-success)', warning: 'var(--rt-warning)', danger: 'var(--rt-danger)', muted: '#cbd5e1' };

    return (
        <div className="rt-ring" aria-label={match ? `${match.score}% match` : 'Not scored'}>
            <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r={radius} fill="none" stroke="#eef2f7" strokeWidth="5" />
                {match && (
                    <circle cx="26" cy="26" r={radius} fill="none" stroke={colors[tone]} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - match.score / 100)} transform="rotate(-90 26 26)" />
                )}
            </svg>
            <span className="rt-ring-value" style={{ color: match ? colors[tone] : 'var(--rt-muted)' }}>{match ? match.score : '—'}</span>
        </div>
    );
}

export default function JobsIndex({ jobs, filters, status, hasCv, cvFilename, canSaveSearch, defaultMinScore, seo }) {
    const user = usePage().props.auth?.user;
    const [search, setSearch] = useState(filters.search || '');
    const [location, setLocation] = useState(filters.location || '');
    const [remote, setRemote] = useState(Boolean(filters.remote));
    const [sort, setSort] = useState(filters.sort || 'newest');
    const [employmentType, setEmploymentType] = useState(filters.employment_type || '');
    const [salaryMin, setSalaryMin] = useState(filters.salary_min ?? '');
    const [salaryMax, setSalaryMax] = useState(filters.salary_max ?? '');
    const [postedWithin, setPostedWithin] = useState(filters.posted_within_days ?? '');
    const [searchName, setSearchName] = useState('');
    const [saveMinScore, setSaveMinScore] = useState(defaultMinScore);
    const [saveAlerts, setSaveAlerts] = useState(true);
    const [cvFile, setCvFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState('');
    const fileInput = useRef(null);

    const isWorking = isScanning || status?.status === 'queued' || status?.status === 'running';

    useEffect(() => {
        if (!isWorking) {
            return undefined;
        }

        const timer = setInterval(() => {
            router.reload({ only: ['jobs', 'status'], preserveState: true, preserveScroll: true });
        }, 3000);

        return () => clearInterval(timer);
    }, [isWorking]);

    useEffect(() => {
        if (status?.status === 'completed' || status?.status === 'failed') {
            setIsScanning(false);
        }
    }, [status?.status]);

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

    const handleScan = async (event) => {
        event.preventDefault();
        setError('');

        if (!cvFile && !hasCv) {
            setError('Please upload your CV first.');
            return;
        }

        setIsScanning(true);

        try {
            const formData = new FormData();
            if (cvFile) {
                formData.append('cv_file', cvFile);
            }
            formData.append('search', search);
            formData.append('location', location);
            formData.append('remote', remote ? '1' : '0');
            if (employmentType) {
                formData.append('employment_type', employmentType);
            }
            if (salaryMin !== '') {
                formData.append('salary_min', salaryMin);
            }
            if (salaryMax !== '') {
                formData.append('salary_max', salaryMax);
            }
            if (postedWithin !== '') {
                formData.append('posted_within_days', postedWithin);
            }

            await axios.post('/jobs/scan', formData, { headers: { Accept: 'application/json' } });
            router.reload({ only: ['jobs', 'status', 'hasCv', 'cvFilename'], preserveState: true, preserveScroll: true });
        } catch (err) {
            setError(errorMessage(err, 'Could not start the scan. Please try again.'));
            setIsScanning(false);
        }
    };

    const currentFilters = (overrides = {}) => ({
        search,
        location,
        remote: remote ? 1 : 0,
        employment_type: employmentType,
        salary_min: salaryMin,
        salary_max: salaryMax,
        posted_within_days: postedWithin,
        sort,
        ...overrides,
    });

    const visit = (query) => {
        const cleaned = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== null && value !== 0 && value !== '0'));
        router.get('/jobs', cleaned, { preserveState: true, preserveScroll: true, replace: true });
    };

    const applyFilters = (event) => {
        event?.preventDefault();
        visit(currentFilters());
    };

    const changeSort = (value) => {
        setSort(value);
        visit(currentFilters({ sort: value }));
    };

    const activeFilters = [
        filters.search && { key: 'search', label: `“${filters.search}”`, clear: () => { setSearch(''); visit(currentFilters({ search: '' })); } },
        filters.location && { key: 'location', label: filters.location, icon: 'bi-geo-alt', clear: () => { setLocation(''); visit(currentFilters({ location: '' })); } },
        filters.remote && { key: 'remote', label: 'Remote', icon: 'bi-house-door', clear: () => { setRemote(false); visit(currentFilters({ remote: 0 })); } },
        filters.employment_type && { key: 'type', label: label(filters.employment_type), clear: () => { setEmploymentType(''); visit(currentFilters({ employment_type: '' })); } },
        (filters.salary_min || filters.salary_max) && { key: 'salary', label: `Salary ${filters.salary_min || 0}–${filters.salary_max || 'any'}`, clear: () => { setSalaryMin(''); setSalaryMax(''); visit(currentFilters({ salary_min: '', salary_max: '' })); } },
        filters.posted_within_days && { key: 'posted', label: `Last ${filters.posted_within_days} day${Number(filters.posted_within_days) === 1 ? '' : 's'}`, clear: () => { setPostedWithin(''); visit(currentFilters({ posted_within_days: '' })); } },
    ].filter(Boolean);

    const saveSearch = (event) => {
        event.preventDefault();
        router.post('/saved-searches', {
            name: searchName,
            query: search,
            filters: {
                location,
                remote,
                employment_type: employmentType,
                salary_min: salaryMin,
                salary_max: salaryMax,
                posted_within_days: postedWithin,
            },
            min_score: saveMinScore,
            alerts_enabled: saveAlerts,
        }, {
            preserveScroll: true,
            onSuccess: () => setSearchName(''),
        });
    };

    const toggleSaved = (job) => {
        if (!user) {
            router.get('/login');
            return;
        }

        if (job.saved) {
            router.delete(`/saved-jobs/${job.saved.id}`, { preserveScroll: true });
        } else {
            router.post(`/jobs/${job.id}/save`, {}, { preserveScroll: true });
        }
    };

    return (
        <MainLayout seo={seo}>
            <NavBar />

            <header className="rt-hero rt-hero-compact rt-jobs-hero">
                <div className="container">
                    <span className="rt-pill mb-3"><i className="bi bi-briefcase"></i>Live job listings</span>
                    <h1 className="mb-2">Find jobs that match your CV</h1>
                    <p className="rt-hero-lead mb-4">Search fresh listings, then score them against your CV with the same ATS engine as the resume tailor.</p>
                    <form className="rt-job-search" onSubmit={applyFilters} role="search">
                        <div className="rt-job-search-field">
                            <i className="bi bi-search"></i>
                            <input aria-label="Job title or keywords" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Job title, skill or company" />
                        </div>
                        <div className="rt-job-search-field">
                            <i className="bi bi-geo-alt"></i>
                            <input aria-label="Location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, country or remote" />
                        </div>
                        <button type="submit" className="btn rt-btn-primary px-4">Search jobs</button>
                    </form>
                </div>
            </header>

            <div className="container pb-5">
                <div className="row g-4 rt-overlap">
                    <aside className="col-lg-4 col-xl-3 order-2 order-lg-1">
                        <section id="your-cv" className="rt-card p-4 mb-3" style={{ scrollMarginTop: '5.5rem' }}>
                            <h2 className="rt-card-title mb-1"><i className="bi bi-file-earmark-person"></i>Your CV</h2>
                            <p className="text-muted small mb-3">Score the listings below against your CV to see where you rank.</p>

                            <form onSubmit={handleScan} noValidate>
                                {hasCv && cvFilename && !cvFile && (
                                    <div className="rt-file-chip mb-2">
                                        <i className="bi bi-file-earmark-check"></i>
                                        <div className="flex-grow-1 text-truncate">
                                            <div className="fw-semibold text-truncate small">{cvFilename}</div>
                                            <small className="text-muted">Ready to score</small>
                                        </div>
                                    </div>
                                )}

                                <label
                                    className={`rt-dropzone rt-dropzone-compact mb-3 ${isDragging ? 'is-dragging' : ''}`}
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
                                    <i className="bi bi-cloud-arrow-up"></i>
                                    <span className="fw-semibold small text-truncate" style={{ maxWidth: '100%' }}>{cvFile ? cvFile.name : hasCv ? 'Use a different CV' : 'Upload your CV'}</span>
                                    <small className="text-muted">PDF or DOCX · 5MB</small>
                                </label>

                                {error && (
                                    <div className="alert alert-danger py-2 small" role="alert">
                                        <i className="bi bi-exclamation-octagon me-1"></i>{error}
                                    </div>
                                )}

                                <button className="btn rt-btn-primary w-100" type="submit" disabled={isWorking}>
                                    {isWorking ? (
                                        <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Scoring...</>
                                    ) : (
                                        <><i className="bi bi-radar me-2"></i>Score my matches</>
                                    )}
                                </button>
                            </form>
                        </section>

                        <section className="rt-card p-4 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="rt-card-title"><i className="bi bi-sliders"></i>Filters</h2>
                                <Link href="/jobs" className="small">Reset</Link>
                            </div>
                            <form onSubmit={applyFilters} className="d-grid gap-3">
                                <div className="form-check form-switch">
                                    <input id="job-remote" className="form-check-input" type="checkbox" role="switch" checked={remote} onChange={(event) => setRemote(event.target.checked)} />
                                    <label className="form-check-label small fw-semibold" htmlFor="job-remote">Remote only</label>
                                </div>
                                <div>
                                    <div className="rt-filter-label mb-2">Employment type</div>
                                    <div className="d-flex flex-wrap gap-1">
                                        {['', ...EMPLOYMENT_TYPES].map((type) => (
                                            <button key={type || 'any'} type="button" className={`rt-filter-pill ${employmentType === type ? 'is-active' : ''}`} onClick={() => setEmploymentType(type)}>
                                                {type ? label(type) : 'Any'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="rt-filter-label mb-2">Salary range</div>
                                    <div className="d-flex align-items-center gap-2">
                                        <input aria-label="Minimum salary" type="number" min="0" className="form-control form-control-sm rt-input" value={salaryMin} onChange={(event) => setSalaryMin(event.target.value)} placeholder="Min" />
                                        <span className="text-muted">–</span>
                                        <input aria-label="Maximum salary" type="number" min="0" className="form-control form-control-sm rt-input" value={salaryMax} onChange={(event) => setSalaryMax(event.target.value)} placeholder="Max" />
                                    </div>
                                </div>
                                <div>
                                    <label className="rt-filter-label d-block mb-2" htmlFor="job-posted">Date posted</label>
                                    <select id="job-posted" className="form-select form-select-sm rt-input" value={postedWithin} onChange={(event) => setPostedWithin(event.target.value)}>
                                        <option value="">Any time</option>
                                        {POSTED_WITHIN.map((days) => <option key={days} value={days}>{days === 1 ? 'Last 24 hours' : `Last ${days} days`}</option>)}
                                    </select>
                                </div>
                                <button className="btn rt-btn-soft" type="submit"><i className="bi bi-funnel me-1"></i>Apply filters</button>
                            </form>
                        </section>

                        {canSaveSearch ? (
                            <section className="rt-card p-4">
                                <h2 className="rt-card-title mb-1"><i className="bi bi-bell"></i>Job alerts</h2>
                                <p className="text-muted small mb-3">Save this search and get an email when new jobs match your CV.</p>
                                <form onSubmit={saveSearch} className="d-grid gap-2">
                                    <input aria-label="Search name" className="form-control form-control-sm rt-input" value={searchName} onChange={(event) => setSearchName(event.target.value)} placeholder="e.g. Remote Laravel roles" />
                                    <div className="d-flex align-items-center gap-2 small">
                                        <label htmlFor="saved-search-score" className="text-muted text-nowrap">Min. match</label>
                                        <div className="input-group input-group-sm">
                                            <input id="saved-search-score" type="number" min="0" max="100" className="form-control rt-input" value={saveMinScore} onChange={(event) => setSaveMinScore(event.target.value)} />
                                            <span className="input-group-text">%</span>
                                        </div>
                                    </div>
                                    <div className="form-check small">
                                        <input id="saved-search-alerts" className="form-check-input" type="checkbox" checked={saveAlerts} onChange={(event) => setSaveAlerts(event.target.checked)} />
                                        <label className="form-check-label" htmlFor="saved-search-alerts">Email me new matches</label>
                                    </div>
                                    <button type="submit" className="btn btn-sm rt-btn-soft" disabled={!searchName.trim()}>
                                        <i className="bi bi-bookmark-plus me-1"></i>Save search
                                    </button>
                                </form>
                            </section>
                        ) : (
                            <section className="rt-card p-4 text-center">
                                <i className="bi bi-bell fs-4" style={{ color: 'var(--rt-primary)' }}></i>
                                <h2 className="h6 fw-bold mt-2 mb-1">Get job alerts</h2>
                                <p className="text-muted small mb-3">Create a free account to save searches and get emailed new matches.</p>
                                <Link href="/register" className="btn btn-sm rt-btn-primary px-3">Sign up free</Link>
                            </section>
                        )}
                    </aside>

                    <div className="col-lg-8 col-xl-9 order-1 order-lg-2">
                        <div className="rt-card rt-jobs-toolbar mb-3">
                            <div>
                                <span className="fw-bold">{jobs.total.toLocaleString()}</span> job{jobs.total === 1 ? '' : 's'}
                                {!hasCv && <a href="#your-cv" className="small ms-2"><i className="bi bi-info-circle me-1"></i>Upload your CV to see match scores</a>}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <label htmlFor="job-sort" className="small text-muted text-nowrap">Sort by</label>
                                <select id="job-sort" className="form-select form-select-sm" value={sort} onChange={(event) => changeSort(event.target.value)}>
                                    <option value="newest">Newest</option>
                                    <option value="match">Best match</option>
                                    <option value="company">Company</option>
                                </select>
                            </div>
                        </div>

                        {activeFilters.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                {activeFilters.map((filter) => (
                                    <button key={filter.key} type="button" className="rt-active-filter" onClick={filter.clear} title="Remove filter">
                                        {filter.icon && <i className={`bi ${filter.icon}`}></i>}<span className="text-capitalize">{filter.label}</span><i className="bi bi-x"></i>
                                    </button>
                                ))}
                                <Link href="/jobs" className="small align-self-center ms-1">Clear all</Link>
                            </div>
                        )}

                        <StatusBanner status={status} />

                        {jobs.data.length === 0 ? (
                            <section className="rt-card p-5 text-center">
                                <span className="rt-stat-icon rt-tone-indigo mx-auto mb-3"><i className="bi bi-search"></i></span>
                                <h3 className="h6 fw-bold">No jobs match these filters</h3>
                                <p className="text-muted small mb-3">Try a broader keyword, clear the location, or remove a filter.</p>
                                <Link href="/jobs" className="btn btn-sm btn-light border">Show all jobs</Link>
                            </section>
                        ) : (
                            <div className="d-grid gap-3">
                                {jobs.data.map((job) => (
                                    <article key={job.id} className="rt-card rt-job-row">
                                        <span className={`rt-company-avatar rt-tone-${avatarTone(job.company || job.title)}`} aria-hidden="true">
                                            {(job.company || job.title || '?').trim().charAt(0).toUpperCase()}
                                        </span>

                                        <div className="flex-grow-1 min-w-0">
                                            <h3 className="rt-job-title">
                                                <Link href={job.url}>{job.title}</Link>
                                            </h3>
                                            <div className="rt-job-sub">
                                                {job.company && <span className="fw-semibold">{job.company}</span>}
                                                {job.location && <span><i className="bi bi-geo-alt"></i>{job.location}</span>}
                                            </div>
                                            <div className="rt-job-tags">
                                                {job.is_remote && <span className="rt-job-tag is-remote"><i className="bi bi-house-door"></i>Remote</span>}
                                                {job.employment_type && <span className="rt-job-tag text-capitalize">{label(job.employment_type)}</span>}
                                                {formatSalary(job) && <span className="rt-job-tag"><i className="bi bi-cash-stack"></i>{formatSalary(job)}</span>}
                                                {timeAgo(job.posted_at) && <span className="rt-job-tag"><i className="bi bi-clock"></i>{timeAgo(job.posted_at)}</span>}
                                                <span className="rt-job-tag text-uppercase">{job.source}</span>
                                            </div>
                                            {job.match && (
                                                <div className="rt-job-match">
                                                    <span className="text-success"><i className="bi bi-check-circle-fill"></i>{job.match.matched_count} matched</span>
                                                    <span className="text-danger"><i className="bi bi-x-circle-fill"></i>{job.match.missing_count} missing</span>
                                                    {job.match.required_total > 0 && <span className="text-muted">{job.match.required_matched}/{job.match.required_total} required</span>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rt-job-side">
                                            {job.match ? <MatchRing match={job.match} /> : <span></span>}
                                            <div className="d-flex gap-2">
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm ${job.saved ? 'btn-primary' : 'btn-light border'}`}
                                                    onClick={() => toggleSaved(job)}
                                                    title={job.saved ? 'Remove from saved jobs' : 'Save this job'}
                                                >
                                                    <i className={`bi ${job.saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i>
                                                    <span className="visually-hidden">{job.saved ? 'Unsave job' : 'Save job'}</span>
                                                </button>
                                                <Link href={job.url} className="btn btn-sm rt-btn-soft text-nowrap">
                                                    View <i className="bi bi-arrow-right ms-1"></i>
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {jobs.last_page > 1 && (
                            <nav className="d-flex justify-content-between align-items-center mt-4" aria-label="Job pagination">
                                {jobs.prev_page_url
                                    ? <Link href={jobs.prev_page_url} className="btn btn-sm btn-light border" preserveScroll={false}><i className="bi bi-arrow-left me-1"></i>Previous</Link>
                                    : <span></span>}
                                <span className="text-muted small">Page {jobs.current_page} of {jobs.last_page}</span>
                                {jobs.next_page_url
                                    ? <Link href={jobs.next_page_url} className="btn btn-sm btn-light border" preserveScroll={false}>Next<i className="bi bi-arrow-right ms-1"></i></Link>
                                    : <span></span>}
                            </nav>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
