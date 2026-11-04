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

    const applyFilters = (event) => {
        event.preventDefault();
        router.get('/jobs', {
            search,
            location,
            remote: remote ? 1 : 0,
            employment_type: employmentType,
            salary_min: salaryMin,
            salary_max: salaryMax,
            posted_within_days: postedWithin,
            sort,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

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

            <div className="container py-4 py-lg-5">
                <div className="row g-4">
                    <div className="col-lg-4">
                        <section className="rt-card p-4">
                            <h1 className="h5 fw-bold mb-1"><i className="bi bi-briefcase me-2" style={{ color: 'var(--rt-primary)' }}></i>Scan jobs for your CV</h1>
                            <p className="text-muted small mb-3">
                                We score every posting with the same ATS engine as the resume tailor. Upload once, then see where you rank.
                            </p>

                            <form onSubmit={handleScan} noValidate>
                                {hasCv && cvFilename && (
                                    <div className="rt-file-chip mb-3">
                                        <i className="bi bi-file-earmark-text"></i>
                                        <div className="flex-grow-1 text-truncate">
                                            <div className="fw-semibold text-truncate">{cvFilename}</div>
                                            <small className="text-muted">Saved for this session</small>
                                        </div>
                                        <i className="bi bi-check-circle-fill text-success"></i>
                                    </div>
                                )}

                                <label
                                    className={`rt-dropzone mb-3 ${isDragging ? 'is-dragging' : ''}`}
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
                                    <span className="fw-semibold">{cvFile ? cvFile.name : hasCv ? 'Upload a different CV' : 'Drop your CV here or browse'}</span>
                                    <small className="text-muted">PDF or DOCX · up to 5MB</small>
                                </label>

                                {error && (
                                    <div className="alert alert-danger py-2 small" role="alert">
                                        <i className="bi bi-exclamation-octagon me-1"></i>{error}
                                    </div>
                                )}

                                <button className="btn rt-btn-primary w-100" type="submit" disabled={isWorking}>
                                    {isWorking ? (
                                        <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Scanning...</>
                                    ) : (
                                        <><i className="bi bi-radar me-2"></i>Score my matches</>
                                    )}
                                </button>
                                <small className="text-muted d-block mt-2">
                                    Uses your search and filters to choose which postings to score.
                                </small>
                            </form>
                        </section>

                        <section className="rt-card p-4 mt-3">
                            <h2 className="h6 fw-bold mb-3"><i className="bi bi-funnel me-2"></i>Filters</h2>
                            <form onSubmit={applyFilters} className="d-grid gap-3">
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="job-search">Keywords</label>
                                    <input id="job-search" className="form-control rt-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Laravel, backend, designer..." />
                                </div>
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="job-location">Location</label>
                                    <input id="job-location" className="form-control rt-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, country or remote" />
                                </div>
                                <div className="form-check">
                                    <input id="job-remote" className="form-check-input" type="checkbox" checked={remote} onChange={(event) => setRemote(event.target.checked)} />
                                    <label className="form-check-label small" htmlFor="job-remote">Remote only</label>
                                </div>
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="job-employment">Employment type</label>
                                    <select id="job-employment" className="form-select rt-input" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
                                        <option value="">Any type</option>
                                        {EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}
                                    </select>
                                </div>
                                <div className="row g-2">
                                    <div className="col-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="job-salary-min">Min salary</label>
                                        <input id="job-salary-min" type="number" min="0" className="form-control rt-input" value={salaryMin} onChange={(event) => setSalaryMin(event.target.value)} placeholder="50000" />
                                    </div>
                                    <div className="col-6">
                                        <label className="rt-filter-label d-block mb-1" htmlFor="job-salary-max">Max salary</label>
                                        <input id="job-salary-max" type="number" min="0" className="form-control rt-input" value={salaryMax} onChange={(event) => setSalaryMax(event.target.value)} placeholder="120000" />
                                    </div>
                                </div>
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="job-posted">Posted within</label>
                                    <select id="job-posted" className="form-select rt-input" value={postedWithin} onChange={(event) => setPostedWithin(event.target.value)}>
                                        <option value="">Any time</option>
                                        {POSTED_WITHIN.map((days) => <option key={days} value={days}>{days === 1 ? 'Last 24 hours' : `Last ${days} days`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="rt-filter-label d-block mb-1" htmlFor="job-sort">Sort by</label>
                                    <select id="job-sort" className="form-select rt-input" value={sort} onChange={(event) => setSort(event.target.value)}>
                                        <option value="newest">Newest</option>
                                        <option value="match">Best match</option>
                                        <option value="company">Company</option>
                                    </select>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="btn rt-btn-soft flex-grow-1" type="submit">Apply filters</button>
                                    <Link href="/jobs" className="btn btn-outline-secondary">Reset</Link>
                                </div>
                            </form>
                        </section>

                        {canSaveSearch && (
                            <section className="rt-card p-4 mt-3">
                                <h2 className="h6 fw-bold mb-3"><i className="bi bi-bell me-2"></i>Save this search</h2>
                                <form onSubmit={saveSearch} className="d-grid gap-3">
                                    <div>
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-search-name">Name</label>
                                        <input id="saved-search-name" className="form-control rt-input" value={searchName} onChange={(event) => setSearchName(event.target.value)} placeholder="Remote Laravel roles" />
                                    </div>
                                    <div>
                                        <label className="rt-filter-label d-block mb-1" htmlFor="saved-search-score">Minimum match</label>
                                        <div className="input-group">
                                            <input id="saved-search-score" type="number" min="0" max="100" className="form-control rt-input" value={saveMinScore} onChange={(event) => setSaveMinScore(event.target.value)} />
                                            <span className="input-group-text">%</span>
                                        </div>
                                    </div>
                                    <div className="form-check">
                                        <input id="saved-search-alerts" className="form-check-input" type="checkbox" checked={saveAlerts} onChange={(event) => setSaveAlerts(event.target.checked)} />
                                        <label className="form-check-label small" htmlFor="saved-search-alerts">Email me when new jobs match</label>
                                    </div>
                                    <button type="submit" className="btn rt-btn-soft" disabled={!searchName.trim()}>
                                        <i className="bi bi-bookmark-plus me-2"></i>Save search
                                    </button>
                                </form>
                            </section>
                        )}
                    </div>

                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
                            <div>
                                <h2 className="h5 fw-bold mb-0">{jobs.total} job{jobs.total === 1 ? '' : 's'} found</h2>
                                <p className="text-muted small mb-0">Scores are relative to your uploaded CV.</p>
                            </div>
                            {!hasCv && <span className="badge text-bg-light border"><i className="bi bi-info-circle me-1"></i>Upload a CV to see scores</span>}
                        </div>

                        <StatusBanner status={status} />

                        {jobs.data.length === 0 ? (
                            <section className="rt-card p-5 text-center">
                                <i className="bi bi-search" style={{ fontSize: '2rem', color: 'var(--rt-muted)' }}></i>
                                <h3 className="h6 fw-bold mt-3">No postings match these filters</h3>
                                <p className="text-muted small mb-0">Try a broader keyword, clear the location, or refresh the feeds.</p>
                            </section>
                        ) : (
                            <div className="d-grid gap-3">
                                {jobs.data.map((job) => {
                                    const tone = job.match ? scoreTone(job.match.score) : 'muted';
                                    return (
                                        <article key={job.id} className="rt-card rt-job-card p-3 p-sm-4">
                                            <div className="d-flex gap-3 align-items-start">
                                                <div className={`rt-job-score rt-job-score-${tone}`} aria-label={job.match ? `${job.match.score}% match` : 'Not scored'}>
                                                    {job.match ? job.match.score : '—'}
                                                    <small>{job.match ? 'match' : 'n/a'}</small>
                                                </div>
                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="d-flex flex-wrap justify-content-between gap-2">
                                                        <h3 className="h6 fw-bold mb-1">
                                                            <Link href={job.url} className="text-decoration-none" style={{ color: 'var(--rt-ink)' }}>{job.title}</Link>
                                                        </h3>
                                                        <span className="badge text-bg-light border text-uppercase">{job.source}</span>
                                                    </div>
                                                    <div className="rt-job-meta">
                                                        {job.company && <span><i className="bi bi-building"></i>{job.company}</span>}
                                                        {job.location && <span><i className="bi bi-geo-alt"></i>{job.location}</span>}
                                                        {job.is_remote && <span><i className="bi bi-house-door"></i>Remote</span>}
                                                        {formatDate(job.posted_at) && <span><i className="bi bi-clock"></i>{formatDate(job.posted_at)}</span>}
                                                        {formatSalary(job) && <span><i className="bi bi-cash"></i>{formatSalary(job)}</span>}
                                                    </div>
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                                                        {job.match ? (
                                                            <>
                                                                <span className="rt-chip rt-chip-success">{job.match.matched_count} matched</span>
                                                                <span className="rt-chip rt-chip-danger">{job.match.missing_count} missing</span>
                                                                {job.match.required_total > 0 && (
                                                                    <span className="text-muted small">
                                                                        {job.match.required_matched}/{job.match.required_total} required
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-muted small">Not scored for your CV yet</span>
                                                        )}
                                                        <div className="ms-auto d-flex align-items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm ${job.saved ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                                onClick={() => toggleSaved(job)}
                                                                title={job.saved ? 'Remove from saved jobs' : 'Save this job'}
                                                            >
                                                                <i className={`bi ${job.saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i>
                                                                <span className="visually-hidden">{job.saved ? 'Unsave job' : 'Save job'}</span>
                                                            </button>
                                                            <Link href={job.url} className="btn btn-sm rt-btn-soft">
                                                                View job <i className="bi bi-arrow-right ms-1"></i>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {jobs.last_page > 1 && (
                            <nav className="d-flex justify-content-between align-items-center mt-4" aria-label="Job pagination">
                                {jobs.prev_page_url
                                    ? <Link href={jobs.prev_page_url} className="btn btn-sm btn-outline-secondary"><i className="bi bi-arrow-left me-1"></i>Previous</Link>
                                    : <span></span>}
                                <span className="text-muted small">Page {jobs.current_page} of {jobs.last_page}</span>
                                {jobs.next_page_url
                                    ? <Link href={jobs.next_page_url} className="btn btn-sm btn-outline-secondary">Next<i className="bi bi-arrow-right ms-1"></i></Link>
                                    : <span></span>}
                            </nav>
                        )}
                    </div>
                </div>
            </div>

            <footer className="rt-footer mt-auto py-4">
                <div className="container d-flex flex-column flex-sm-row justify-content-between gap-2 text-center text-sm-start">
                    <span>&copy; {new Date().getFullYear()} ResumeTailor AI</span>
                    <span>Match scores are generated by the same ATS engine used to tailor resumes.</span>
                </div>
            </footer>
        </MainLayout>
    );
}
