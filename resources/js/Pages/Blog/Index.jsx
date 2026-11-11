import { Link } from '@inertiajs/react';
import React from 'react';
import AdSlot from '../../Components/AdSlot';
import PostCard from '../../Components/PostCard';
import NavBar from '../../Components/NavBar';
import PageHero from '../../Components/PageHero';
import MainLayout from '../../Layouts/MainLayout';

export default function BlogIndex({ posts, categories, category, seo }) {
    return (
        <MainLayout seo={seo}>
            <NavBar />
            <PageHero
                eyebrow="Guides"
                icon="bi-journal-text"
                title="CV and job search guides"
                lead="Practical, no-nonsense advice on ATS-friendly CVs, keywords, applications and interviews."
            />

            <div className="container pb-5">
                <div className="rt-overlap">
                    {categories.length > 1 && (
                        <div className="rt-card p-2 mb-4 d-flex flex-wrap gap-1">
                            <Link href="/blog" className={`rt-nav-link ${category === null ? 'is-active' : ''}`} preserveScroll>All guides</Link>
                            {categories.map((name) => (
                                <Link key={name} href={`/blog?category=${encodeURIComponent(name)}`} className={`rt-nav-link ${category === name ? 'is-active' : ''}`} preserveScroll>{name}</Link>
                            ))}
                        </div>
                    )}

                    {posts.data.length === 0 ? (
                        <div className="rt-card p-5 text-center">
                            <i className="bi bi-journal" style={{ fontSize: '2rem', color: 'var(--rt-muted)' }}></i>
                            <h2 className="h6 fw-bold mt-3">No guides here yet</h2>
                            <p className="text-muted small mb-0">New articles are on the way.</p>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {posts.data.map((post, index) => (
                                <React.Fragment key={post.id}>
                                    <div className="col-md-6 col-lg-4">
                                        <PostCard post={post} />
                                    </div>
                                    {index === 2 && posts.data.length > 3 && (
                                        <div className="col-12"><AdSlot slot="in_feed" /></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {posts.last_page > 1 && (
                        <nav className="d-flex justify-content-between mt-4" aria-label="Pages">
                            {posts.prev_page_url ? <Link href={posts.prev_page_url} className="btn btn-light border"><i className="bi bi-arrow-left me-1"></i>Newer</Link> : <span></span>}
                            {posts.next_page_url && <Link href={posts.next_page_url} className="btn btn-light border">Older<i className="bi bi-arrow-right ms-1"></i></Link>}
                        </nav>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
