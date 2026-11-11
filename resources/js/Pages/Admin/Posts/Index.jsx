import { Link, router } from '@inertiajs/react';
import React from 'react';
import { formatDate, Pagination } from '../../../Components/AdminUi';
import AdminLayout from '../../../Layouts/AdminLayout';

export default function PostsIndex({ posts, counts, status, seo }) {
    const tabs = [[null, 'All', counts.all], ['published', 'Published', counts.published], ['draft', 'Drafts', counts.draft]];

    const remove = (post) => {
        if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
            router.delete(`/admin/posts/${post.id}`, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout
            title="Blog posts"
            subtitle="Guides and articles: the written content search engines and AdSense reviewers look for."
            seo={seo}
            actions={<Link href="/admin/posts/create" className="btn rt-btn-primary px-3"><i className="bi bi-plus-lg me-1"></i>New post</Link>}
        >
            <div className="rt-tabs mb-3" role="tablist">
                {tabs.map(([value, label, count]) => (
                    <Link key={label} href={value ? `/admin/posts?status=${value}` : '/admin/posts'} className={`rt-tab ${status === value ? 'is-active' : ''}`} preserveScroll>
                        {label}<span className="rt-count">{count}</span>
                    </Link>
                ))}
            </div>

            <section className="rt-card">
                <div className="table-responsive">
                    <table className="table rt-admin-table">
                        <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th className="text-end">Actions</th></tr></thead>
                        <tbody>
                            {posts.data.length === 0 && (
                                <tr><td colSpan="5" className="text-center text-muted py-5">No posts yet. <Link href="/admin/posts/create">Write the first one</Link>.</td></tr>
                            )}
                            {posts.data.map((post) => (
                                <tr key={post.id}>
                                    <td>
                                        <Link href={`/admin/posts/${post.id}/edit`} className="fw-semibold">{post.title}</Link>
                                        <div className="small text-muted">/blog/{post.slug} · {post.reading_minutes} min read{post.author ? ` · ${post.author}` : ''}</div>
                                    </td>
                                    <td className="small">{post.category}</td>
                                    <td>
                                        {post.is_live && <span className="badge text-bg-success">Live</span>}
                                        {post.status === 'published' && !post.is_live && <span className="badge text-bg-info">Scheduled {formatDate(post.published_at)}</span>}
                                        {post.status === 'draft' && <span className="badge text-bg-secondary">Draft</span>}
                                    </td>
                                    <td className="small text-muted text-nowrap">{formatDate(post.updated_at, true)}</td>
                                    <td className="text-end text-nowrap">
                                        <div className="btn-group btn-group-sm">
                                            <Link href={`/admin/posts/${post.id}/edit`} className="btn btn-light border" title="Edit"><i className="bi bi-pencil"></i></Link>
                                            <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="btn btn-light border" title={post.is_live ? 'View' : 'Preview'}><i className="bi bi-box-arrow-up-right"></i></a>
                                            <button type="button" className="btn btn-light border text-danger" title="Delete" onClick={() => remove(post)}><i className="bi bi-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <Pagination paginator={posts} />
        </AdminLayout>
    );
}
