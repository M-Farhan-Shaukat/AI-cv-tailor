import { Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { formatDate, Pagination, ScoreChange } from '../../../Components/AdminUi';
import AdminLayout from '../../../Layouts/AdminLayout';

export default function ResumesIndex({ resumes, filters, templates, maxBulk, seo }) {
    const [form, setForm] = useState({
        search: filters.search ?? '',
        template: filters.template ?? '',
        owner: filters.owner ?? '',
    });
    const [selected, setSelected] = useState([]);
    const [bulkTemplate, setBulkTemplate] = useState(templates[0]?.value ?? 'original');
    const [isWorking, setIsWorking] = useState(false);
    const pageIds = resumes.data.map((resume) => resume.id);
    const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

    const apply = (next) => {
        const query = Object.fromEntries(Object.entries({ ...next, user: filters.user ?? '' }).filter(([, value]) => value !== ''));
        setSelected([]);
        router.get('/admin/resumes', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const change = (field, value) => {
        const next = { ...form, [field]: value };
        setForm(next);
        if (field !== 'search') {
            apply(next);
        }
    };

    const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    const togglePage = () => setSelected((current) => (allOnPageSelected
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])].slice(0, maxBulk)));

    const runBulk = (action) => {
        const label = templates.find((template) => template.value === bulkTemplate)?.label;
        const question = action === 'delete'
            ? `Delete ${selected.length} tailored resume${selected.length === 1 ? '' : 's'} permanently?`
            : `Change ${selected.length} resume${selected.length === 1 ? '' : 's'} to the ${label} design?`;
        if (!window.confirm(question)) {
            return;
        }
        setIsWorking(true);
        router.post('/admin/resumes/bulk', { ids: selected, action, template: action === 'template' ? bulkTemplate : null }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
            onFinish: () => setIsWorking(false),
        });
    };

    return (
        <AdminLayout
            title="Tailored resumes"
            subtitle={`${resumes.total.toLocaleString()} resume${resumes.total === 1 ? '' : 's'}${filters.user ? ' for one user' : ''}`}
            seo={seo}
            actions={filters.user ? <Link href="/admin/resumes" className="btn rt-btn-soft">Show all users</Link> : null}
        >
            <form className="rt-card p-3 mb-3" onSubmit={(event) => { event.preventDefault(); apply(form); }}>
                <div className="row g-2 align-items-end">
                    <div className="col-md-5">
                        <label htmlFor="search" className="rt-filter-label">Search</label>
                        <div className="input-group">
                            <input id="search" type="search" className="form-control rt-input" placeholder="Job title, file name, user name or email" value={form.search} onChange={(event) => change('search', event.target.value)} />
                            <button className="btn rt-btn-soft" type="submit" aria-label="Search"><i className="bi bi-search"></i></button>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <label htmlFor="template" className="rt-filter-label">Design</label>
                        <select id="template" className="form-select" value={form.template} onChange={(event) => change('template', event.target.value)}>
                            <option value="">Any</option>
                            {templates.map((template) => <option key={template.value} value={template.value}>{template.label}</option>)}
                        </select>
                    </div>
                    <div className="col-6 col-md-2">
                        <label htmlFor="owner" className="rt-filter-label">Owner</label>
                        <select id="owner" className="form-select" value={form.owner} onChange={(event) => change('owner', event.target.value)}>
                            <option value="">Anyone</option>
                            <option value="users">Signed-in users</option>
                            <option value="guests">Guests</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <button type="button" className="btn btn-link text-muted w-100" onClick={() => { const empty = { search: '', template: '', owner: '' }; setForm(empty); apply(empty); }}>Clear filters</button>
                    </div>
                </div>
            </form>

            <section className="rt-card">
                <div className="table-responsive">
                    <table className="table rt-admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '2.5rem' }}>
                                    <input type="checkbox" className="form-check-input" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on this page" />
                                </th>
                                <th>Job</th>
                                <th>Owner</th>
                                <th>Design</th>
                                <th>Score</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumes.data.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-5">No tailored resumes match these filters.</td></tr>}
                            {resumes.data.map((resume) => (
                                <tr key={resume.id} className={selected.includes(resume.id) ? 'table-active' : ''}>
                                    <td>
                                        <input type="checkbox" className="form-check-input" checked={selected.includes(resume.id)} onChange={() => toggle(resume.id)} aria-label={`Select resume ${resume.id}`} />
                                    </td>
                                    <td>
                                        <span className="fw-semibold">{resume.job_title || `Resume #${resume.id}`}</span>
                                        <div className="small text-muted text-truncate" style={{ maxWidth: '16rem' }}>{resume.original_filename}</div>
                                    </td>
                                    <td className="small">
                                        {resume.user
                                            ? <Link href={`/admin/users/${resume.user.id}`}>{resume.user.name}</Link>
                                            : <span className="text-muted">Guest</span>}
                                    </td>
                                    <td className="small">{resume.template_label}</td>
                                    <td><ScoreChange before={resume.original_score} after={resume.match_score} /></td>
                                    <td className="small text-muted text-nowrap">{formatDate(resume.created_at, true)}</td>
                                    <td className="text-end text-nowrap">
                                        <Link href={`/tailor/${resume.id}`} className="btn btn-sm rt-btn-soft me-1">Open</Link>
                                        <a href={`/download/${resume.id}`} className="btn btn-sm btn-outline-secondary" aria-label="Download PDF"><i className="bi bi-download"></i></a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <Pagination paginator={resumes} />

            {selected.length > 0 && (
                <div className="rt-bulk-bar rt-card p-3 mt-3 d-flex flex-wrap align-items-center gap-2 shadow">
                    <strong className="me-2">{selected.length} selected</strong>
                    <select className="form-select form-select-sm w-auto" value={bulkTemplate} onChange={(event) => setBulkTemplate(event.target.value)} aria-label="Design to apply">
                        {templates.map((template) => <option key={template.value} value={template.value}>{template.label}</option>)}
                    </select>
                    <button type="button" className="btn btn-sm rt-btn-primary px-3 py-1" disabled={isWorking} onClick={() => runBulk('template')}>
                        <i className="bi bi-palette me-1"></i>Change design
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={isWorking} onClick={() => runBulk('delete')}>
                        <i className="bi bi-trash me-1"></i>Delete
                    </button>
                    <button type="button" className="btn btn-sm btn-link text-muted ms-auto" onClick={() => setSelected([])}>Clear selection</button>
                    <small className="text-muted w-100">Changing the design re-renders the saved resume: text and ATS scores stay the same. Up to {maxBulk} at a time.</small>
                </div>
            )}
        </AdminLayout>
    );
}
