import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

/*
 * Small dependency-free SVG charts for the admin panel. Colours come from the --rt-series-* tokens
 * (validated for colour-blind separation); text always uses ink colours, never the series colour.
 */

const AXIS_WIDTH = 34;
const PLOT_TOP = 8;
const X_AXIS_HEIGHT = 22;

const formatValue = (value) => Number(value || 0).toLocaleString();

export const shortDay = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * Width of the element, kept up to date as the layout changes.
 */
function useWidth() {
    const ref = useRef(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        if (!ref.current) {
            return undefined;
        }
        setWidth(ref.current.clientWidth);
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return [ref, width];
}

/**
 * Round axis maximum and 4 evenly spaced ticks (0 included).
 */
function niceTicks(maxValue) {
    const max = Math.max(1, maxValue);
    const rough = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) || rough;
    const stepValue = Math.max(1, Math.ceil(step));
    return [0, 1, 2, 3, 4].map((index) => index * stepValue);
}

export function Legend({ series, values = null }) {
    return (
        <div className="rt-chart-legend">
            {series.map((item) => (
                <span key={item.key} className="rt-chart-legend-item">
                    <span className="rt-chart-swatch" style={{ background: item.color }}></span>
                    {item.label}
                    {values && <strong>{formatValue(values[item.key])}</strong>}
                </span>
            ))}
        </div>
    );
}

function Tooltip({ x, width, title, rows }) {
    const flip = x > width - 170;
    return (
        <div className="rt-chart-tooltip" style={flip ? { right: width - x + 12 } : { left: x + 12 }}>
            <div className="rt-chart-tooltip-title">{title}</div>
            {rows.map((row) => (
                <div key={row.label} className="rt-chart-tooltip-row">
                    <span className="rt-chart-swatch" style={{ background: row.color }}></span>
                    <span>{row.label}</span>
                    <strong>{formatValue(row.value)}</strong>
                </div>
            ))}
        </div>
    );
}

function YAxis({ ticks, scaleY, width }) {
    return ticks.map((tick) => (
        <g key={tick}>
            <line x1={AXIS_WIDTH} x2={width} y1={scaleY(tick)} y2={scaleY(tick)} className="rt-chart-grid" />
            <text x={AXIS_WIDTH - 8} y={scaleY(tick)} dy="0.32em" textAnchor="end" className="rt-chart-axis">{formatValue(tick)}</text>
        </g>
    ));
}

/**
 * Day labels counted back from the latest day, so the last day is always labelled and spacing stays even.
 */
function XLabels({ data, positions, height, labelEvery }) {
    const last = data.length - 1;
    return data.map((point, index) => ((last - index) % labelEvery === 0
        ? <text key={point.date} x={positions[index]} y={height - 6} textAnchor="middle" className="rt-chart-axis">{shortDay(point.date)}</text>
        : null));
}

/**
 * Lines over time (one shared y-axis), the first series with a soft area fill, and a crosshair tooltip.
 */
export function LineChart({ data, series, height = 240, ariaLabel }) {
    const [ref, width] = useWidth();
    const [hoverIndex, setHoverIndex] = useState(null);

    const geometry = useMemo(() => {
        const ticks = niceTicks(Math.max(...data.flatMap((point) => series.map((item) => point[item.key] || 0))));
        const top = ticks[ticks.length - 1];
        const plotBottom = height - X_AXIS_HEIGHT;
        const plotLeft = AXIS_WIDTH + 6;
        const plotRight = Math.max(plotLeft + 1, width - 8);
        const step = data.length > 1 ? (plotRight - plotLeft) / (data.length - 1) : 0;
        const positions = data.map((_, index) => plotLeft + index * step);
        const scaleY = (value) => plotBottom - ((value || 0) / top) * (plotBottom - PLOT_TOP);
        return { ticks, plotBottom, positions, scaleY, step };
    }, [data, series, width, height]);

    const { ticks, plotBottom, positions, scaleY, step } = geometry;
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / 70))));

    const onMove = (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const index = step > 0 ? Math.round((x - positions[0]) / step) : 0;
        setHoverIndex(Math.min(data.length - 1, Math.max(0, index)));
    };

    return (
        <div ref={ref} className="rt-chart" onMouseLeave={() => setHoverIndex(null)}>
            {width > 0 && (
                <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerMove={onMove} onPointerDown={onMove}>
                    <defs>
                        {series.map((item) => (
                            <linearGradient key={item.key} id={`rt-area-${item.key}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={item.color} stopOpacity="0.22" />
                                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
                            </linearGradient>
                        ))}
                    </defs>
                    <YAxis ticks={ticks} scaleY={scaleY} width={width} />
                    <XLabels data={data} positions={positions} height={height} labelEvery={labelEvery} />
                    {series.map((item, seriesIndex) => {
                        const points = data.map((point, index) => `${positions[index]},${scaleY(point[item.key])}`);
                        return (
                            <g key={item.key}>
                                {seriesIndex === 0 && <path d={`M${positions[0]},${plotBottom} L${points.join(' L')} L${positions[positions.length - 1]},${plotBottom} Z`} fill={`url(#rt-area-${item.key})`} />}
                                <polyline points={points.join(' ')} fill="none" stroke={item.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                            </g>
                        );
                    })}
                    {hoverIndex !== null && (
                        <g>
                            <line x1={positions[hoverIndex]} x2={positions[hoverIndex]} y1={PLOT_TOP} y2={plotBottom} className="rt-chart-crosshair" />
                            {series.map((item) => (
                                <circle key={item.key} cx={positions[hoverIndex]} cy={scaleY(data[hoverIndex][item.key])} r="4.5" fill={item.color} stroke="var(--rt-surface)" strokeWidth="2" />
                            ))}
                        </g>
                    )}
                    <rect x={AXIS_WIDTH} y="0" width={Math.max(0, width - AXIS_WIDTH)} height={height} fill="transparent" />
                </svg>
            )}
            {hoverIndex !== null && (
                <Tooltip
                    x={positions[hoverIndex]}
                    width={width}
                    title={shortDay(data[hoverIndex].date)}
                    rows={series.map((item) => ({ label: item.label, color: item.color, value: data[hoverIndex][item.key] }))}
                />
            )}
        </div>
    );
}

/**
 * Bars per day; several series are stacked (with a 2px gap between segments) when `stacked`, otherwise grouped.
 */
export function BarChart({ data, series, height = 220, stacked = false, ariaLabel }) {
    const [ref, width] = useWidth();
    const [hoverIndex, setHoverIndex] = useState(null);

    const totals = data.map((point) => (stacked
        ? series.reduce((sum, item) => sum + (point[item.key] || 0), 0)
        : Math.max(...series.map((item) => point[item.key] || 0))));
    const ticks = niceTicks(Math.max(...totals));
    const top = ticks[ticks.length - 1];
    const plotBottom = height - X_AXIS_HEIGHT;
    const plotLeft = AXIS_WIDTH + 4;
    const slot = data.length ? (Math.max(1, width - plotLeft - 4)) / data.length : 0;
    const barWidth = Math.max(4, Math.min(28, slot * 0.62));
    const scaleY = (value) => plotBottom - ((value || 0) / top) * (plotBottom - PLOT_TOP);
    const centers = data.map((_, index) => plotLeft + slot * index + slot / 2);
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / 70))));

    const roundedTop = (x, y, w, h) => {
        const radius = Math.min(4, w / 2, h);
        return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
    };

    return (
        <div ref={ref} className="rt-chart" onMouseLeave={() => setHoverIndex(null)}>
            {width > 0 && (
                <svg width={width} height={height} role="img" aria-label={ariaLabel}>
                    <YAxis ticks={ticks} scaleY={scaleY} width={width} />
                    <XLabels data={data} positions={centers} height={height} labelEvery={labelEvery} />
                    {data.map((point, index) => {
                        const isDimmed = hoverIndex !== null && hoverIndex !== index;
                        let stackTop = plotBottom;
                        const groupWidth = stacked ? barWidth : Math.max(3, (barWidth - 2 * (series.length - 1)) / series.length);
                        return (
                            <g key={point.date} opacity={isDimmed ? 0.45 : 1}>
                                {series.map((item, seriesIndex) => {
                                    const value = point[item.key] || 0;
                                    if (value <= 0) {
                                        return null;
                                    }
                                    const barHeight = plotBottom - scaleY(value);
                                    if (stacked) {
                                        const y = stackTop - barHeight;
                                        const isTop = series.slice(seriesIndex + 1).every((next) => !(point[next.key] > 0));
                                        const gap = stackTop === plotBottom ? 0 : 2;
                                        stackTop = y;
                                        const drawHeight = Math.max(1, barHeight - gap);
                                        return isTop
                                            ? <path key={item.key} d={roundedTop(centers[index] - barWidth / 2, y, barWidth, drawHeight)} fill={item.color} />
                                            : <rect key={item.key} x={centers[index] - barWidth / 2} y={y} width={barWidth} height={drawHeight} fill={item.color} />;
                                    }
                                    const x = centers[index] - barWidth / 2 + seriesIndex * (groupWidth + 2);
                                    return <path key={item.key} d={roundedTop(x, scaleY(value), groupWidth, Math.max(1, barHeight))} fill={item.color} />;
                                })}
                                <rect x={centers[index] - slot / 2} y={0} width={slot} height={height} fill="transparent" onPointerEnter={() => setHoverIndex(index)} onPointerDown={() => setHoverIndex(index)} />
                            </g>
                        );
                    })}
                </svg>
            )}
            {hoverIndex !== null && (
                <Tooltip
                    x={centers[hoverIndex]}
                    width={width}
                    title={shortDay(data[hoverIndex].date)}
                    rows={series.map((item) => ({ label: item.label, color: item.color, value: data[hoverIndex][item.key] }))}
                />
            )}
        </div>
    );
}

/**
 * Parts of a whole as a ring, with a legend that lists every value and share.
 */
export function DonutChart({ segments, centerValue, centerLabel, ariaLabel }) {
    const [hover, setHover] = useState(null);
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const size = 168;
    const radius = 66;
    const stroke = 20;
    const circumference = 2 * Math.PI * radius;
    const gap = total > 0 && segments.filter((segment) => segment.value > 0).length > 1 ? 3 : 0;
    let offset = 0;

    return (
        <div className="rt-donut">
            <div className="rt-donut-ring">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--rt-chart-track)" strokeWidth={stroke} />
                    {total > 0 && segments.map((segment) => {
                        const length = (segment.value / total) * circumference;
                        const dash = Math.max(0, length - gap);
                        const element = segment.value > 0 && (
                            <circle
                                key={segment.label}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={hover === segment.label ? stroke + 4 : stroke}
                                strokeDasharray={`${dash} ${circumference - dash}`}
                                strokeDashoffset={-offset}
                                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                                onMouseEnter={() => setHover(segment.label)}
                                onMouseLeave={() => setHover(null)}
                                style={{ transition: 'stroke-width .15s' }}
                            />
                        );
                        offset += length;
                        return element;
                    })}
                </svg>
                <div className="rt-donut-center">
                    <div className="rt-donut-value">{centerValue}</div>
                    <div className="rt-donut-label">{centerLabel}</div>
                </div>
            </div>
            <ul className="rt-donut-legend">
                {segments.map((segment) => (
                    <li key={segment.label} className={hover === segment.label ? 'is-active' : ''} onMouseEnter={() => setHover(segment.label)} onMouseLeave={() => setHover(null)}>
                        <span className="rt-chart-swatch" style={{ background: segment.color }}></span>
                        <span className="flex-grow-1">{segment.label}</span>
                        <strong>{formatValue(segment.value)}</strong>
                        <span className="rt-donut-share">{total > 0 ? `${Math.round((segment.value / total) * 100)}%` : '0%'}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * A tiny trend line for stat cards.
 */
export function Sparkline({ values, color = 'var(--rt-series-1)', height = 36 }) {
    const [ref, width] = useWidth();
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? (width - 4) / (values.length - 1) : 0;
    const points = values.map((value, index) => `${2 + index * step},${height - 3 - (value / max) * (height - 8)}`);
    const gradientId = useMemo(() => `rt-spark-${Math.random().toString(36).slice(2, 9)}`, []);

    return (
        <div ref={ref} className="rt-sparkline" aria-hidden="true">
            {width > 0 && values.length > 1 && (
                <svg width={width} height={height}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={`M2,${height} L${points.join(' L')} L${2 + (values.length - 1) * step},${height} Z`} fill={`url(#${gradientId})`} />
                    <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
            )}
        </div>
    );
}
