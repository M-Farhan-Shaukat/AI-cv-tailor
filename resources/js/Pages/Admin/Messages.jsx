import { Link, router } from '@inertiajs/react';
import React from 'react';
import { formatDate, Pagination } from '../../Components/AdminUi';
import AdminLayout from '../../Layouts/AdminLayout';

export default function Messages({ messages, unreadCount, onlyUnread, seo }) {
    const setRead = (message, read) => router.patch(`/admin/messages/${message.id}`, { read }, { preserveScroll: true });
    const remove = (message) => {
        if (window.confirm('Delete this message?')) {
            router.delete(`/admin/messages/${message.id}`, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title="Messages" subtitle={`Sent from the contact page · ${unreadCount} unread`} seo={seo}>
            <div className="rt-tabs mb-3" role="tablist">
                <Link href="/admin/messages" className={`rt-tab ${!onlyUnread ? 'is-active' : ''}`} preserveScroll>All</Link>
                <Link href="/admin/messages?unread=1" className={`rt-tab ${onlyUnread ? 'is-active' : ''}`} preserveScroll>Unread<span className="rt-count">{unreadCount}</span></Link>
            </div>

            {messages.data.length === 0 && (
                <div className="rt-card p-5 text-center text-muted">
                    <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">{onlyUnread ? 'No unread messages.' : 'No messages yet.'}</p>
                </div>
            )}

            <div className="d-grid gap-3">
                {messages.data.map((message) => (
                    <details key={message.id} className={`rt-card rt-message ${message.is_read ? '' : 'is-unread'}`} onToggle={(event) => { if (event.currentTarget.open && !message.is_read) setRead(message, true); }}>
                        <summary className="d-flex flex-wrap align-items-center gap-2 p-3">
                            {!message.is_read && <span className="rt-admin-dot" aria-label="Unread"></span>}
                            <span className="fw-semibold">{message.subject}</span>
                            <span className="text-muted small">from {message.name} &lt;{message.email}&gt;</span>
                            <span className="ms-auto small text-muted text-nowrap">{formatDate(message.created_at, true)}</span>
                        </summary>
                        <div className="px-3 pb-3">
                            <div className="rt-plain mb-3" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</div>
                            <div className="d-flex flex-wrap gap-2">
                                <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`} className="btn btn-sm rt-btn-primary px-3 py-1"><i className="bi bi-reply me-1"></i>Reply by email</a>
                                {message.user_id && <Link href={`/admin/users/${message.user_id}`} className="btn btn-sm btn-light border">View user</Link>}
                                <button type="button" className="btn btn-sm btn-light border" onClick={() => setRead(message, !message.is_read)}>{message.is_read ? 'Mark unread' : 'Mark read'}</button>
                                <button type="button" className="btn btn-sm btn-light border text-danger ms-auto" onClick={() => remove(message)}><i className="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </details>
                ))}
            </div>
            <Pagination paginator={messages} />
        </AdminLayout>
    );
}
