import { Link, useForm } from '@inertiajs/react';
import React from 'react';
import AdminLayout from '../../../Layouts/AdminLayout';

const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

const MARKDOWN_HELP = [
    ['## Heading', 'Section heading'],
    ['**bold**', 'Bold text'],
    ['- item', 'Bullet list'],
    ['1. item', 'Numbered list'],
    ['[text](https://...)', 'Link'],
    ['> quote', 'Quote'],
];

export default function PostForm({ post, categories, seo }) {
    const isNew = post === null;
    const form = useForm({
        title: post?.title ?? '',
        slug: post?.slug ?? '',
        category: post?.category ?? categories[0] ?? 'CV tips',
        excerpt: post?.excerpt ?? '',
        meta_description: post?.meta_description ?? '',
        body: post?.body ?? '',
        status: post?.status ?? 'draft',
        published_at: post?.published_at ?? '',
    });
    const words = form.data.body.trim() ? form.data.body.trim().split(/\s+/).length : 0;

    const submit = (status) => {
        form.transform((data) => ({ ...data, status }));
        if (isNew) {
            form.post('/admin/posts', { preserveScroll: true });
        } else {
            form.put(`/admin/posts/${post.id}`, { preserveScroll: true });
        }
    };

    const input = (name, label, props = {}, help = null) => (
        <div className="mb-3">
            <label htmlFor={name} className="form-label fw-semibold small">{label}</label>
            <input id={name} className={`form-control ${form.errors[name] ? 'is-invalid' : ''}`} value={form.data[name]} onChange={(event) => form.setData(name, event.target.value)} {...props} />
            {form.errors[name] ? <div className="invalid-feedback">{form.errors[name]}</div> : help && <div className="form-text">{help}</div>}
        </div>
    );

    return (
        <AdminLayout
            title={isNew ? 'New post' : 'Edit post'}
            subtitle={isNew ? 'Write in Markdown. Save as a draft, then publish when it is ready.' : post.is_live ? 'This post is live.' : 'This post is not live yet.'}
            seo={seo}
            actions={(
                <>
                    <Link href="/admin/posts" className="btn btn-light border"><i className="bi bi-arrow-left me-1"></i>All posts</Link>
                    {!isNew && <a href={post.url} target="_blank" rel="noreferrer" className="btn btn-light border"><i className="bi bi-box-arrow-up-right me-1"></i>{post.is_live ? 'View' : 'Preview'}</a>}
                </>
            )}
        >
            <form onSubmit={(event) => { event.preventDefault(); submit(form.data.status); }} noValidate>
                <div className="row g-4">
                    <div className="col-xl-8">
                        <section className="rt-card p-3 p-lg-4">
                            {input('title', 'Title', { maxLength: 160, onBlur: () => { if (!form.data.slug) form.setData('slug', slugify(form.data.title)); } })}
                            <div className="mb-3">
                                <label htmlFor="excerpt" className="form-label fw-semibold small">Summary <span className="text-muted fw-normal">(shown on the blog list, up to 300 characters)</span></label>
                                <textarea id="excerpt" rows="2" maxLength={300} className={`form-control ${form.errors.excerpt ? 'is-invalid' : ''}`} value={form.data.excerpt} onChange={(event) => form.setData('excerpt', event.target.value)} />
                                {form.errors.excerpt && <div className="invalid-feedback">{form.errors.excerpt}</div>}
                            </div>
                            <div className="mb-2">
                                <div className="d-flex justify-content-between align-items-end">
                                    <label htmlFor="body" className="form-label fw-semibold small mb-1">Article <span className="text-muted fw-normal">(Markdown)</span></label>
                                    <small className={words < 300 ? 'text-warning' : 'text-muted'}>{words.toLocaleString()} words{words < 300 && ' · aim for 600+'}</small>
                                </div>
                                <textarea id="body" rows="22" className={`form-control rt-key-mono ${form.errors.body ? 'is-invalid' : ''}`} style={{ fontSize: '.875rem', lineHeight: 1.6 }} value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} />
                                {form.errors.body && <div className="invalid-feedback">{form.errors.body}</div>}
                            </div>
                            <div className="d-flex flex-wrap gap-2 small text-muted">
                                {MARKDOWN_HELP.map(([syntax, meaning]) => <span key={syntax} className="badge text-bg-light border fw-normal"><code>{syntax}</code> {meaning}</span>)}
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-4">
                        <section className="rt-card p-3 p-lg-4 mb-4">
                            <h2 className="rt-card-title mb-3"><i className="bi bi-send"></i>Publish</h2>
                            <div className="mb-3">
                                <label htmlFor="published_at" className="form-label fw-semibold small">Publish date</label>
                                <input id="published_at" type="datetime-local" className={`form-control ${form.errors.published_at ? 'is-invalid' : ''}`} value={form.data.published_at} onChange={(event) => form.setData('published_at', event.target.value)} />
                                <div className="form-text">Leave empty to publish now. A future date schedules the post.</div>
                            </div>
                            <div className="d-grid gap-2">
                                <button type="button" className="btn rt-btn-primary" disabled={form.processing} onClick={() => submit('published')}>
                                    <i className="bi bi-globe me-1"></i>{post?.status === 'published' ? 'Save and keep published' : 'Publish'}
                                </button>
                                <button type="button" className="btn btn-light border" disabled={form.processing} onClick={() => submit('draft')}>
                                    {post?.status === 'published' ? 'Unpublish (move to drafts)' : 'Save draft'}
                                </button>
                            </div>
                        </section>

                        <section className="rt-card p-3 p-lg-4">
                            <h2 className="rt-card-title mb-3"><i className="bi bi-search"></i>Details &amp; SEO</h2>
                            <div className="mb-3">
                                <label htmlFor="category" className="form-label fw-semibold small">Category</label>
                                <input id="category" list="post-categories" className={`form-control ${form.errors.category ? 'is-invalid' : ''}`} value={form.data.category} onChange={(event) => form.setData('category', event.target.value)} />
                                <datalist id="post-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
                                {form.errors.category && <div className="invalid-feedback">{form.errors.category}</div>}
                            </div>
                            {input('slug', 'URL slug', { maxLength: 180 }, `/blog/${form.data.slug || slugify(form.data.title) || 'your-post'}`)}
                            <div className="mb-0">
                                <label htmlFor="meta_description" className="form-label fw-semibold small">Search description <span className="text-muted fw-normal">({form.data.meta_description.length}/160)</span></label>
                                <textarea id="meta_description" rows="3" maxLength={160} className={`form-control ${form.errors.meta_description ? 'is-invalid' : ''}`} placeholder="Shown in Google results. Defaults to the summary." value={form.data.meta_description} onChange={(event) => form.setData('meta_description', event.target.value)} />
                                {form.errors.meta_description && <div className="invalid-feedback">{form.errors.meta_description}</div>}
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
