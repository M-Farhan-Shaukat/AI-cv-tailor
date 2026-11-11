import { Link } from '@inertiajs/react';
import React from 'react';
import AdSlot from '../../Components/AdSlot';
import NavBar from '../../Components/NavBar';
import MainLayout from '../../Layouts/MainLayout';
import PostCard, { formatPostDate } from '../../Components/PostCard';

export default function BlogShow({ post, related, seo }) {
    return (
        <MainLayout seo={seo}>
            <NavBar />

            <header className="rt-hero rt-hero-compact rt-article-hero">
                <div className="container" style={{ maxWidth: '48rem' }}>
                    <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="rt-pill mb-3 text-decoration-none">
                        <i className="bi bi-journal-text"></i>{post.category}
                    </Link>
                    <h1 className="mb-3">{post.title}</h1>
                    <p className="rt-hero-lead mb-3">{post.excerpt}</p>
                    <div className="rt-article-meta">
                        <span><i className="bi bi-person"></i>{post.author}</span>
                        {post.published_at && <span><i className="bi bi-calendar3"></i>{formatPostDate(post.published_at)}</span>}
                        <span><i className="bi bi-clock"></i>{post.reading_minutes} min read</span>
                    </div>
                </div>
            </header>

            <div className="container pb-5" style={{ maxWidth: '48rem' }}>
                {!post.is_published && (
                    <div className="alert alert-warning mt-3"><i className="bi bi-eye me-2"></i>Draft preview. Only admins can see this post until it is published.</div>
                )}

                <article className="rt-card rt-overlap p-4 p-lg-5 mb-4">
                    <div className="rt-prose rt-article" dangerouslySetInnerHTML={{ __html: post.body_html }} />
                </article>

                <AdSlot slot="in_article" className="mb-4" />

                <section className="rt-card p-4 p-lg-5 mb-5 text-center rt-article-cta">
                    <h2 className="h5 fw-bold mb-2">See how your CV scores for a real job</h2>
                    <p className="text-muted mb-3">Paste a job description, upload your CV and get your ATS match score with fixes. Free and unlimited.</p>
                    <Link href="/" className="btn rt-btn-primary px-4">Check my CV now</Link>
                </section>

                {related.length > 0 && (
                    <section>
                        <h2 className="h5 fw-bold mb-3">More {post.category.toLowerCase()} guides</h2>
                        <div className="row g-3">
                            {related.map((item) => (
                                <div key={item.id} className="col-md-4"><PostCard post={item} /></div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </MainLayout>
    );
}
