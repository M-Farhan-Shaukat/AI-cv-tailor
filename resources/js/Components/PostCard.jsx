import { Link } from '@inertiajs/react';
import React from 'react';

export const formatPostDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function PostCard({ post }) {
    return (
        <Link href={`/blog/${post.slug}`} className="rt-card rt-post-card h-100">
            <span className="rt-post-category">{post.category}</span>
            <h2 className="rt-post-title">{post.title}</h2>
            <p className="rt-post-excerpt">{post.excerpt}</p>
            <div className="rt-post-meta">
                <span>{formatPostDate(post.published_at)}</span>
                <span>·</span>
                <span>{post.reading_minutes} min read</span>
                <span className="ms-auto rt-post-more">Read <i className="bi bi-arrow-right"></i></span>
            </div>
        </Link>
    );
}
