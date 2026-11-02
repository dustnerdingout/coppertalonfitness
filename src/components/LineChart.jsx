import { useEffect, useRef, useState } from 'react'
import { parseDate, fmtDate } from '../lib/stats.js'

/**
 * Small time series chart with hover crosshair and tooltip.
 * points: [{ date, y, raw? }]   line drawn through y, optional raw values shown as dots
 * goal:   optional horizontal reference value (dashed)
 */
export default function LineChart({ points, goal, height = 200, unit = '', yLabel = (v) => v, tooltip }) {
  const ref = useRef(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (!points.length) return null

  const pad = { t: 12, r: 12, b: 24, l: 36 }
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b

  const xs = points.map((p) => parseDate(p.date).getTime())
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const vals = points.flatMap((p) => [p.y, p.raw].filter((v) => v != null))
  if (goal != null) vals.push(goal)
  let minY = Math.min(...vals)
  let maxY = Math.max(...vals)
  // round the axis to clean steps (1, 2, 5, 10, 20, 25, 50...)
  const raw = Math.max(1, (maxY - minY) / 4)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw)
  minY = Math.floor(minY / step) * step
  maxY = Math.ceil(maxY / step) * step
  if (maxY === minY) maxY = minY + step

  const x = (t) => pad.l + (maxX === minX ? iw / 2 : ((t - minX) / (maxX - minX)) * iw)
  const y = (v) => pad.t + ih - ((v - minY) / (maxY - minY)) * ih

  const yTicks = []
  for (let v = minY; v <= maxY + step / 2; v += step) yTicks.push(v)
  const xTickIdx = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1]

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(xs[i]).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    let best = 0
    xs.forEach((t, i) => { if (Math.abs(x(t) - mx) < Math.abs(x(xs[best]) - mx)) best = i })
    setHover(best)
  }

  const hp = hover != null ? points[hover] : null

  return (
    <div className="chart" ref={ref} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
      <svg height={height} role="img" aria-label="Trend chart">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end">{yLabel(Math.round(v * 100) / 100)}</text>
          </g>
        ))}
        {xTickIdx.map((i) => (
          <text key={i} x={x(xs[i])} y={height - 4} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
            {fmtDate(points[i].date)}
          </text>
        ))}
        {goal != null && (
          <g>
            <line x1={pad.l} x2={w - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--chart-goal)" strokeWidth="2" strokeDasharray="4 3" />
            <text x={w - pad.r} y={y(goal) - 6} textAnchor="end" style={{ fill: 'var(--chart-goal)', fontWeight: 600 }}>Goal {goal}</text>
          </g>
        )}
        {points.map((p, i) => p.raw != null && (
          <circle key={'r' + i} cx={x(xs[i])} cy={y(p.raw)} r="3" fill="var(--chart-dot)" />
        ))}
        <path d={path} fill="none" stroke="var(--chart-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.length === 1 && <circle cx={x(xs[0])} cy={y(points[0].y)} r="4" fill="var(--chart-line)" />}
        {hp && (
          <g>
            <line x1={x(xs[hover])} x2={x(xs[hover])} y1={pad.t} y2={pad.t + ih} stroke="var(--muted)" strokeDasharray="2 3" />
            <circle cx={x(xs[hover])} cy={y(hp.y)} r="5" fill="var(--chart-line)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="tooltip" style={{ left: Math.min(Math.max(x(xs[hover]), 70), w - 70), top: y(hp.y) }}>
          {tooltip ? tooltip(hp) : <><b>{hp.y}{unit}</b> · {fmtDate(hp.date)}</>}
        </div>
      )}
    </div>
  )
}
