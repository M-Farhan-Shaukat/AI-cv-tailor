import React from 'react';

/**
 * The gradient header used by content pages (About, Contact, legal pages, blog).
 */
export default function PageHero({ eyebrow, icon = 'bi-stars', title, lead, children = null }) {
    return (
        <header className="rt-hero rt-hero-compact">
            <div className="container">
                {eyebrow && <span className="rt-pill mb-3"><i className={`bi ${icon}`}></i>{eyebrow}</span>}
                <h1 className="mb-3">{title}</h1>
                {lead && <p className="rt-hero-lead mb-0">{lead}</p>}
                {children}
            </div>
        </header>
    );
}
