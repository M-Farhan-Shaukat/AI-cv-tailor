import { Link } from '@inertiajs/react';
import React from 'react';
import { formatDate, formatNumber, ScoreChange, StatCard } from '../../Components/AdminUi';
import AdminLayout from '../../Layouts/AdminLayout';

export default function Dashboard({ stats, ai, trend, recentUsers, recentResumes, seo }) {
    const peak = Math.max(1, ...trend.map((day) => day.count));

    return (
        <AdminLayout title="Dashboard" subtitle="Users, plans, tailoring activity and AI usage at a glance." seo={seo}>
            <div className="row g-3 mb-4">
                <div className="col-6 col-xl-3">
                    <StatCard label="Users" icon="bi-people" tone="indigo" value={formatNumber(stats.users)} hint={`+${formatNumber(stats.new_users_7_days)} in the last 7 days`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard label="Pro" icon="bi-stars" tone="violet" value={formatNumber(stats.pro_subscribers + stats.paid_pro + stats.complimentary_pro)} hint={`${formatNumber(stats.pro_subscribers)} card · ${formatNumber(stats.paid_pro)} rupee · ${formatNumber(stats.complimentary_pro)} trial${stats.payments_awaiting_review ? ` · ${formatNumber(stats.payments_awaiting_review)} to review` : ''}`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard label="Tailored this month" icon="bi-file-earmark-check" tone="green" value={formatNumber(stats.tailored_month)} hint={`${formatNumber(stats.tailored_today)} today · ${formatNumber(stats.tailored_total)} all time`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard label="Avg. score gain" icon="bi-graph-up-arrow" tone="sky" value={stats.average_improvement === null ? '—' : `+${stats.average_improvement}`} hint="Points added by tailoring this month" />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard label="AI requests today" icon="bi-cpu" tone="amber" value={formatNumber(ai.today.requests)} hint={`${formatNumber(ai.today.failures)} failed · ${formatNumber(ai.today.tokens)} tokens`} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard label="AI keys" icon="bi-key" tone="indigo" value={`${ai.keys - ai.paused_keys} / ${ai.keys}`} hint={ai.paused_keys > 0 ? `${ai.paused_keys} paused` : 'All in rotation'} />
                </div>
                <div className="col-6 col-xl-3">
                    <StatCard label="Suspended users" icon="bi-slash-circle" tone="rose" value={formatNumber(stats.suspended)} hint="Cannot sign in" />
                </div>
            </div>

            <section className="rt-card p-3 p-lg-4 mb-4">
                <h2 className="rt-card-title mb-3"><i className="bi bi-bar-chart"></i>Tailored resumes, last 14 days</h2>
                <div className="rt-trend" role="img" aria-label="Tailored resumes per day">
                    {trend.map((day) => (
                        <div key={day.date} className="rt-trend-bar" title={`${formatDate(day.date)}: ${day.count}`}>
                            {day.count > 0 && <small>{day.count}</small>}
                            <span style={{ height: `${(day.count / peak) * 80}%` }}></span>
                            <small>{new Date(`${day.date}T00:00:00`).getDate()}</small>
                        </div>
                    ))}
                </div>
            </section>

            <div className="row g-4">
                <div className="col-xl-5">
                    <section className="rt-card h-100">
                        <div className="d-flex justify-content-between align-items-center p-3 p-lg-4 pb-2">
                            <h2 className="rt-card-title"><i className="bi bi-person-plus"></i>New users</h2>
                            <Link href="/admin/users" className="small">All users</Link>
                        </div>
                        <div className="table-responsive">
                            <table className="table rt-admin-table">
                                <tbody>
                                    {recentUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <Link href={`/admin/users/${user.id}`} className="fw-semibold text-decoration-none">{user.name}</Link>
                                                <div className="small text-muted">{user.email}</div>
                                            </td>
                                            <td className="text-end small text-muted text-nowrap">{formatDate(user.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
                <div className="col-xl-7">
                    <section className="rt-card h-100">
                        <div className="d-flex justify-content-between align-items-center p-3 p-lg-4 pb-2">
                            <h2 className="rt-card-title"><i className="bi bi-file-earmark-text"></i>Latest tailored resumes</h2>
                            <Link href="/admin/resumes" className="small">All resumes</Link>
                        </div>
                        <div className="table-responsive">
                            <table className="table rt-admin-table">
                                <tbody>
                                    {recentResumes.map((resume) => (
                                        <tr key={resume.id}>
                                            <td>
                                                <Link href={`/tailor/${resume.id}`} className="fw-semibold text-decoration-none">{resume.job_title || `Resume #${resume.id}`}</Link>
                                                <div className="small text-muted">
                                                    {resume.user ? <Link href={`/admin/users/${resume.user.id}`}>{resume.user.name}</Link> : 'Guest'}
                                                </div>
                                            </td>
                                            <td><ScoreChange before={resume.original_score} after={resume.match_score} /></td>
                                            <td className="text-end small text-muted text-nowrap">{formatDate(resume.created_at, true)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
