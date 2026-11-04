import { Head, Link, router, useForm } from '@inertiajs/react';
import React, { useRef, useState } from 'react';
import AuthLayout from '../../Layouts/AuthLayout';

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function Index({ resumes }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        cv_file: null,
        is_primary: resumes.length === 0,
    });
    const [clientError, setClientError] = useState('');
    const fileInput = useRef(null);

    const selectFile = (file) => {
        setClientError('');
        if (!file) {
            return;
        }
        if (!ALLOWED_TYPES.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
            setClientError('Please upload your CV as a PDF or DOCX file.');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setClientError('File size must be under 5MB.');
            return;
        }
        setData('cv_file', file);
    };

    const submit = (event) => {
        event.preventDefault();
        post('/resumes', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setData('is_primary', false);
                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
        });
    };

    const makePrimary = (resume) => {
        router.patch(`/resumes/${resume.id}`, {}, { preserveScroll: true });
    };

    const remove = (resume) => {
        if (window.confirm(`Delete ${resume.original_filename}?`)) {
            router.delete(`/resumes/${resume.id}`, { preserveScroll: true });
        }
    };

    return (
        <AuthLayout
            title="Your resumes"
            subtitle="Upload the CVs you want to scan jobs against. The primary CV is used automatically."
        >
            <Head title="Your resumes" />

            <form onSubmit={submit} noValidate className="mb-4">
                <label htmlFor="cv_file" className="form-label fw-semibold">Add a resume</label>
                <input
                    id="cv_file"
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.docx"
                    className={`form-control ${clientError || errors.cv_file ? 'is-invalid' : ''}`}
                    onChange={(event) => selectFile(event.target.files?.[0])}
                />
                {(clientError || errors.cv_file) && (
                    <div className="invalid-feedback">{clientError || errors.cv_file}</div>
                )}

                <div className="form-check mt-3">
                    <input
                        id="is_primary"
                        type="checkbox"
                        className="form-check-input"
                        checked={data.is_primary}
                        onChange={(event) => setData('is_primary', event.target.checked)}
                    />
                    <label htmlFor="is_primary" className="form-check-label small">Use as my primary CV</label>
                </div>

                <button type="submit" className="btn btn-primary mt-3" disabled={processing || !data.cv_file}>
                    {processing ? 'Uploading...' : 'Upload resume'}
                </button>
            </form>

            <hr className="my-4" />

            {resumes.length === 0 ? (
                <p className="text-muted small mb-0">No resumes yet. Upload a PDF or DOCX to get started.</p>
            ) : (
                <ul className="list-unstyled d-grid gap-2 mb-0">
                    {resumes.map((resume) => (
                        <li key={resume.id} className="rt-file-chip">
                            <i className="bi bi-file-earmark-text"></i>
                            <div className="flex-grow-1 text-truncate">
                                <div className="fw-semibold text-truncate">
                                    {resume.original_filename}
                                    {resume.is_primary && (
                                        <span className="badge text-bg-primary ms-2">Primary</span>
                                    )}
                                </div>
                                <small className="text-muted">
                                    {resume.characters.toLocaleString()} characters
                                    {resume.created_at ? ` · added ${new Date(resume.created_at).toLocaleDateString()}` : ''}
                                </small>
                            </div>
                            <div className="d-flex gap-1">
                                {!resume.is_primary && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => makePrimary(resume)}
                                        title="Make primary"
                                    >
                                        <i className="bi bi-star"></i>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => remove(resume)}
                                    title="Delete"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <p className="text-center text-muted small mt-4 mb-0">
                <Link href="/jobs">Scan jobs with your primary CV</Link>
            </p>
        </AuthLayout>
    );
}
