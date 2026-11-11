import React from 'react';
import NavBar from './NavBar';
import PageHero from './PageHero';
import MainLayout from '../Layouts/MainLayout';

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * A legal page: header, "last updated" date, a table of contents and numbered sections.
 */
export default function LegalDocument({ seo, title, lead, updatedAt, sections }) {
    return (
        <MainLayout seo={seo}>
            <NavBar />
            <PageHero eyebrow="Legal" icon="bi-file-earmark-text" title={title} lead={lead} />

            <div className="container pb-5" style={{ maxWidth: '66rem' }}>
                <div className="row g-4 rt-overlap">
                    <aside className="col-lg-4 d-none d-lg-block">
                        <nav className="rt-card p-4 rt-toc" aria-label="On this page">
                            <div className="rt-filter-label mb-2">On this page</div>
                            <ol className="mb-0 ps-3">
                                {sections.map((section) => (
                                    <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
                                ))}
                            </ol>
                        </nav>
                    </aside>
                    <article className="col-lg-8">
                        <div className="rt-card p-4 p-lg-5">
                            <p className="text-muted small mb-4"><i className="bi bi-calendar3 me-1"></i>Last updated {formatDate(updatedAt)}</p>
                            <div className="rt-prose">
                                {sections.map((section, index) => (
                                    <section key={section.id} id={section.id} style={{ scrollMarginTop: '5.5rem' }}>
                                        <h2>{index + 1}. {section.title}</h2>
                                        {section.body}
                                    </section>
                                ))}
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </MainLayout>
    );
}
