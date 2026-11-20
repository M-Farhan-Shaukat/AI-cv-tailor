import { Link, usePage } from '@inertiajs/react';
import React from 'react';
import { formatDate, formatNumber, ScoreChange } from '../../Components/AdminUi';
import { BarChart, DonutChart, Legend, LineChart, shortDay, Sparkline } from '../../Components/Charts';
import AdminLayout from '../../Layouts/AdminLayout';

const SERIES = {
    visitors: { key: 'visitors', label: 'Visitors', color: 'var(--rt-series-1)' },
    pageViews: { key: 'page_views', label: 'Page views', color: 'var(--rt-series-2)' },
    scans: { key: 'scans', label: 'ATS scans', color: 'var(--rt-series-2)' },
    tailored: { key: 'tailored', label: 'Tailored', color: 'var(--rt-series-1)' },
    aiSucceeded: { key: 'succeeded', label: 'Succeeded', color: 'var(--rt-series-1)' },
    aiFailed: { key: 'failed', label: 'Failed', color: 'var(--rt-danger)' },
};

const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);

/**
 * Last 7 days against the 7 before them.
 */
function weekOverWeek(rows, key) {
    const current = sum(rows.slice(-7), key);
    const previous = sum(rows.slice(-14, -7), key);
    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
    return { current, previous, change };
}

const greeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

function Delta({ change, current }) {
    if (change === null) {
        return <span className="rt-delta is-flat">{current > 0 ? 'New this week' : 'No data yet'}</span>;
    }
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const icon = { up: 'bi-arrow-up-right', down: 'bi-arrow-down-right', flat: 'bi-dash' }[direction];
    return (
        <span className={`rt-delta is-${direction}`}>
            <i className={`bi ${icon}`}></i>{Math.abs(change)}%<span className="rt-delta-note">vs last week</span>
        </span>
    );
}

function KpiCard({ label, icon, tone, rows, valueKey, color }) {
    const { current, change } = weekOverWeek(rows, valueKey);
    return (
        <div className="rt-card rt-kpi h-100">
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <div className="rt-kpi-label">{label}</div>
                    <div className="rt-kpi-value">{formatNumber(current)}</div>
                </div>
                <span className={`rt-stat-icon rt-tone-${tone}`}><i className={`bi ${icon}`}></i></span>
            </div>
            <Sparkline values={rows.map((row) => row[valueKey] || 0)} color={color} />
            <div className="d-flex justify-content-between align-items-center gap-2">
                <Delta change={change} current={current} />
                <span className="rt-kpi-period">Last 7 days</span>
            </div>
        </div>
    );
}

function MiniStat({ label, value, hint, icon, tone, href }) {
    const body = (
        <>
            <span className={`rt-stat-icon rt-tone-${tone}`}><i className={`bi ${icon}`}></i></span>
            <div className="min-w-0">
                <div className="rt-mini-value">{value}</div>
                <div className="rt-mini-label">{label}</div>
                {hint && <div className="rt-mini-hint">{hint}</div>}
            </div>
        </>
    );
    return href
        ? <Link href={href} className="rt-card rt-mini text-decoration-none">{body}</Link>
        : <div className="rt-card rt-mini">{body}</div>;
}

function Panel({ title, icon, subtitle, action, children, className = '' }) {
    return (
        <section className={`rt-card rt-panel ${className}`}>
            <header className="rt-panel-header">
                <div className="min-w-0">
                    <h2 className="rt-card-title mb-0"><i className={`bi ${icon}`}></i>{title}</h2>
                    {subtitle && <p className="rt-panel-subtitle">{subtitle}</p>}
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

export default function Dashboard({ stats, ai, traffic = [], signups = [], aiTrend = [], recentUsers, recentResumes, seo }) {
    const { props } = usePage();
    const firstName = (props.auth?.user?.name || '').split(' ')[0];
    const proTotal = stats.pro_subscribers + stats.paid_pro + stats.complimentary_pro;
    const today = traffic[traffic.length - 1] || { visitors: 0, page_views: 0, scans: 0, tailored: 0, server_errors: 0 };
    const rangeLabel = traffic.length ? `${shortDay(traffic[0].date)} – ${shortDay(traffic[traffic.length - 1].date)}` : '';
    const signupRows = signups.map((day) => ({ date: day.date, new_users: day.count }));
    const totals = { visitors: sum(traffic, 'visitors'), page_views: sum(traffic, 'page_views'), scans: sum(traffic, 'scans'), tailored: sum(traffic, 'tailored') };
    const scanToTailor = totals.scans > 0 ? Math.round((totals.tailored / totals.scans) * 100) : null;
    const aiTotals = { succeeded: sum(aiTrend, 'succeeded'), failed: sum(aiTrend, 'failed') };
    const errorDays = traffic.filter((day) => day.server_errors > 0).length;

    const planSegments = [
        { label: 'Free', value: Math.max(0, stats.users - proTotal), color: 'var(--rt-chart-neutral)' },
        { label: 'Pro · card', value: stats.pro_subscribers, color: 'var(--rt-series-1)' },
        { label: 'Pro · rupee', value: stats.paid_pro, color: 'var(--rt-series-2)' },
        { label: 'Pro · trial', value: stats.complimentary_pro, color: 'var(--rt-series-3)' },
    ];

    return (
        <AdminLayout
            title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
            subtitle={`Here's how ResumeTailor is doing · ${rangeLabel}`}
            crumb="Dashboard"
            seo={seo}
            actions={(
                <>
                    <Link href="/admin/request-logs?filter=failed" className="btn btn-sm rt-btn-soft px-3 py-2"><i className="bi bi-journal-code me-1"></i>Failed requests</Link>
                    <Link href="/admin/resumes" className="btn btn-sm rt-btn-primary px-3 py-2"><i className="bi bi-file-earmark-text me-1"></i>Tailored resumes</Link>
                </>
            )}
        >
            <div className="row g-3 mb-3">
                <div className="col-sm-6 col-xl-3"><KpiCard label="Visitors" icon="bi-eye" tone="indigo" rows={traffic} valueKey="visitors" color="var(--rt-series-1)" /></div>
                <div className="col-sm-6 col-xl-3"><KpiCard label="ATS scans" icon="bi-speedometer2" tone="sky" rows={traffic} valueKey="scans" color="var(--rt-series-1)" /></div>
                <div className="col-sm-6 col-xl-3"><KpiCard label="Tailored resumes" icon="bi-file-earmark-check" tone="green" rows={traffic} valueKey="tailored" color="var(--rt-series-1)" /></div>
                <div className="col-sm-6 col-xl-3"><KpiCard label="New users" icon="bi-person-plus" tone="violet" rows={signupRows} valueKey="new_users" color="var(--rt-series-1)" /></div>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-xl-8">
                    <Panel
                        title="Traffic"
                        icon="bi-activity"
                        subtitle={`${formatNumber(today.visitors)} visitors and ${formatNumber(today.page_views)} page views today`}
                        action={<Legend series={[SERIES.visitors, SERIES.pageViews]} values={totals} />}
                        className="h-100"
                    >
                        <LineChart data={traffic} series={[SERIES.visitors, SERIES.pageViews]} height={316} ariaLabel="Visitors and page views per day, last 14 days" />
                    </Panel>
                </div>
                <div className="col-xl-4">
                    <Panel title="Plans" icon="bi-pie-chart" subtitle={`${formatNumber(proTotal)} Pro of ${formatNumber(stats.users)} users`} className="h-100">
                        <DonutChart segments={planSegments} centerValue={formatNumber(stats.users)} centerLabel="users" ariaLabel="Users by plan" />
                    </Panel>
                </div>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-lg-6">
                    <Panel
                        title="Scans → tailored"
                        icon="bi-funnel"
                        subtitle={scanToTailor === null ? 'No scans yet in this period' : `${scanToTailor}% as many tailored resumes as ATS scans`}
                        action={<Legend series={[SERIES.scans, SERIES.tailored]} values={totals} />}
                        className="h-100"
                    >
                        <BarChart data={traffic} series={[SERIES.scans, SERIES.tailored]} ariaLabel="ATS scans and tailored resumes per day" />
                    </Panel>
                </div>
                <div className="col-lg-6">
                    <Panel
                        title="AI requests"
                        icon="bi-cpu"
                        subtitle={`${formatNumber(ai.today.requests)} today · ${formatNumber(ai.today.tokens)} tokens · ${formatNumber(ai.today.failures)} failed`}
                        action={<Legend series={[SERIES.aiSucceeded, SERIES.aiFailed]} values={aiTotals} />}
                        className="h-100"
                    >
                        <BarChart data={aiTrend} series={[SERIES.aiSucceeded, SERIES.aiFailed]} stacked ariaLabel="AI requests per day, succeeded and failed" />
                    </Panel>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-6 col-md-4"><MiniStat label="Avg. score gain" value={stats.average_improvement === null ? '—' : `+${stats.average_improvement}`} hint="this month" icon="bi-graph-up-arrow" tone="green" /></div>
                <div className="col-6 col-md-4"><MiniStat label="Tailored this month" value={formatNumber(stats.tailored_month)} hint={`${formatNumber(stats.tailored_total)} all time`} icon="bi-calendar-check" tone="indigo" href="/admin/resumes" /></div>
                <div className="col-6 col-md-4"><MiniStat label="Pro users" value={formatNumber(proTotal)} hint={`${formatNumber(stats.new_users_7_days)} new users this week`} icon="bi-stars" tone="violet" href="/admin/users" /></div>
                <div className="col-6 col-md-4"><MiniStat label="Payments to review" value={formatNumber(stats.payments_awaiting_review)} icon="bi-cash-coin" tone={stats.payments_awaiting_review > 0 ? 'amber' : 'sky'} href="/admin/payments" /></div>
                <div className="col-6 col-md-4"><MiniStat label="AI keys in rotation" value={`${ai.keys - ai.paused_keys} / ${ai.keys}`} hint={ai.paused_keys > 0 ? `${ai.paused_keys} paused` : 'all active'} icon="bi-key" tone={ai.paused_keys > 0 ? 'amber' : 'sky'} href="/admin/ai-keys" /></div>
                <div className="col-6 col-md-4"><MiniStat label="Server errors (14 days)" value={formatNumber(sum(traffic, 'server_errors'))} hint={errorDays > 0 ? `on ${errorDays} day${errorDays === 1 ? '' : 's'}` : 'none'} icon="bi-bug" tone={errorDays > 0 ? 'rose' : 'green'} href="/admin/request-logs?filter=failed" /></div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-xl-5">
                    <Panel title="New users" icon="bi-person-plus" action={<Link href="/admin/users" className="small fw-semibold">View all</Link>} className="h-100 rt-panel-flush">
                        <ul className="rt-feed">
                            {recentUsers.length === 0 && <li className="text-muted small">No users yet.</li>}
                            {recentUsers.map((user) => (
                                <li key={user.id}>
                                    <span className="rt-admin-avatar rt-avatar-sm">{(user.name || '?').slice(0, 1).toUpperCase()}</span>
                                    <div className="min-w-0 flex-grow-1">
                                        <Link href={`/admin/users/${user.id}`} className="fw-semibold text-decoration-none text-body d-block text-truncate">{user.name}</Link>
                                        <div className="small text-muted text-truncate">{user.email}</div>
                                    </div>
                                    <span className="small text-muted text-nowrap">{formatDate(user.created_at)}</span>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
                <div className="col-xl-7">
                    <Panel title="Latest tailored resumes" icon="bi-file-earmark-text" action={<Link href="/admin/resumes" className="small fw-semibold">View all</Link>} className="h-100 rt-panel-flush">
                        <ul className="rt-feed">
                            {recentResumes.length === 0 && <li className="text-muted small">No tailored resumes yet.</li>}
                            {recentResumes.map((resume) => (
                                <li key={resume.id}>
                                    <span className="rt-stat-icon rt-tone-indigo rt-feed-icon"><i className="bi bi-file-earmark-text"></i></span>
                                    <div className="min-w-0 flex-grow-1">
                                        <Link href={`/tailor/${resume.id}`} className="fw-semibold text-decoration-none text-body d-block text-truncate">{resume.job_title || `Resume #${resume.id}`}</Link>
                                        <div className="small text-muted">
                                            {resume.user ? <Link href={`/admin/users/${resume.user.id}`}>{resume.user.name}</Link> : 'Guest'} · {formatDate(resume.created_at, true)}
                                        </div>
                                    </div>
                                    <ScoreChange before={resume.original_score} after={resume.match_score} />
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </div>

            <details className="rt-card rt-panel rt-breakdown">
                <summary className="rt-panel-header">
                    <h2 className="rt-card-title mb-0"><i className="bi bi-table"></i>Daily breakdown</h2>
                    <span className="small text-muted">Human page views only: bots, admins and assets are not counted <i className="bi bi-chevron-down ms-1"></i></span>
                </summary>
                <div className="table-responsive">
                    <table className="table rt-admin-table mb-0">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th className="text-end">Visitors</th>
                                <th className="text-end">Page views</th>
                                <th className="text-end">ATS scans</th>
                                <th className="text-end">Tailored</th>
                                <th className="text-end">New users</th>
                                <th className="text-end">AI requests</th>
                                <th className="text-end">Server errors</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...traffic].reverse().map((day) => {
                                const signup = signups.find((row) => row.date === day.date);
                                const aiDay = aiTrend.find((row) => row.date === day.date);
                                return (
                                    <tr key={day.date}>
                                        <td className="text-nowrap">{formatDate(day.date)}</td>
                                        <td className="text-end fw-semibold">{formatNumber(day.visitors)}</td>
                                        <td className="text-end">{formatNumber(day.page_views)}</td>
                                        <td className="text-end">{formatNumber(day.scans)}</td>
                                        <td className="text-end">{formatNumber(day.tailored)}</td>
                                        <td className="text-end">{formatNumber(signup?.count)}</td>
                                        <td className="text-end">{formatNumber((aiDay?.succeeded || 0) + (aiDay?.failed || 0))}</td>
                                        <td className={`text-end ${day.server_errors > 0 ? 'text-danger fw-semibold' : 'text-muted'}`}>{formatNumber(day.server_errors)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </details>
        </AdminLayout>
    );
}
