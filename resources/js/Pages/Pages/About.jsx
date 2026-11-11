import { Link } from '@inertiajs/react';
import React from 'react';
import NavBar from '../../Components/NavBar';
import PageHero from '../../Components/PageHero';
import MainLayout from '../../Layouts/MainLayout';

const VALUES = [
    ['bi-shield-check', 'Truthful by design', 'We never invent experience. Every keyword we add must be backed by your CV or confirmed by you, and we show the evidence.'],
    ['bi-speedometer2', 'Measured, not guessed', 'Your ATS score comes from a fixed formula, not an AI estimate, so the same CV and job always get the same score.'],
    ['bi-file-earmark-check', 'Readable by every ATS', 'Every design is single-column with real text headings: no tables, icons or images that parsers get wrong.'],
    ['bi-unlock', 'Free where it counts', 'Checking your ATS score is free and unlimited. You only pay if you want unlimited tailoring.'],
];

export default function About({ seo }) {
    return (
        <MainLayout seo={seo}>
            <NavBar />
            <PageHero eyebrow="About us" icon="bi-info-circle" title="We help your CV reach a human" lead="Most large employers filter applications with an applicant tracking system before anyone reads them. ResumeTailor AI shows you how your CV scores for a job and helps you fix it, honestly." />

            <div className="container pb-5" style={{ maxWidth: '62rem' }}>
                <section className="rt-card rt-overlap p-4 p-lg-5 mb-4">
                    <h2 className="h4 fw-bold mb-3">Why we built it</h2>
                    <div className="rt-prose">
                        <p>Good candidates are rejected every day because their CV uses different words from the job description, hides a key skill in a table, or puts contact details where a parser cannot find them. None of that says anything about whether they can do the job.</p>
                        <p>ResumeTailor AI reads a job description the way an ATS does, lists the keywords recruiters filter on, and scores your CV against them. If you want, it then rewrites your CV around the job, using only what your CV already shows or what you confirm, and gives you a clean PDF that any applicant tracking system can parse.</p>
                        <p>We also collect live job listings and score them against your CV, so you can spend your time on the roles you actually match.</p>
                    </div>
                </section>

                <div className="row g-3 mb-4">
                    {VALUES.map(([icon, title, text]) => (
                        <div key={title} className="col-md-6">
                            <div className="rt-card p-4 h-100">
                                <span className="rt-stat-icon rt-tone-indigo mb-3"><i className={`bi ${icon}`}></i></span>
                                <h3 className="h6 fw-bold mb-2">{title}</h3>
                                <p className="text-muted small mb-0">{text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <section className="rt-card p-4 p-lg-5 text-center">
                    <h2 className="h5 fw-bold mb-2">Questions or ideas?</h2>
                    <p className="text-muted mb-3">We read every message and usually reply within two working days.</p>
                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        <Link href="/contact" className="btn rt-btn-primary px-4">Contact us</Link>
                        <Link href="/blog" className="btn btn-light border px-4">Read our guides</Link>
                    </div>
                </section>
            </div>
        </MainLayout>
    );
}
