import { useEffect, useRef, useState } from 'react'

/**
 * Vertical bar chart with hover tooltip.
 * bars:   [{ label, value, tip? }]
 * target: optional dashed reference line
 * color:  css color for positive bars. Negative values draw downward from zero in `negColor`.
 */
export default function BarChart({ bars, height = 180, target, targetLabel, color = 'var(--copper)', negColor = 'var(--chart-dot)', fmt = (v) => v }) {
  const ref = useRef(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (!bars.length) return null
  const pad = { t: 14, r: 8, b: 22, l: 36 }
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const vals = bars.map((b) => b.value)
  if (target != null) vals.push(target)
  const maxV = Math.max(0, ...vals)
  const minV = Math.min(0, ...vals)
  const range = maxV - minV || 1
  const y = (v) => pad.t + ((maxV - v) / range) * ih
  const slot = iw / bars.length
  const bw = Math.max(4, Math.min(28, slot - 6))
  const ticks = [minV, minV + range / 2, maxV].map((v) => Math.round(v))
  const labelEvery = Math.ceil(bars.length / 8)

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setHover(null)}>
      <svg height={height} role="img" aria-label="Bar chart">
        {[...new Set(ticks)].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end">{fmt(v)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = pad.l + slot * i + slot / 2
          const h = Math.max(b.value === 0 ? 0 : 2, Math.abs(y(b.value) - y(0)))
          const r = Math.min(4, bw / 2, h)
          const neg = b.value < 0
          // rounded on the data end only, flat on the baseline
          const x0 = cx - bw / 2
          const d = neg
            ? `M${x0},${y(0)} h${bw} v${h - r} a${r},${r} 0 0 1 -${r},${r} h-${bw - 2 * r} a${r},${r} 0 0 1 -${r},-${r} z`
            : `M${x0},${y(0)} v-${h - r} a${r},${r} 0 0 1 ${r},-${r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" />
              {h > 0 && <path d={d} fill={neg ? negColor : color} opacity={hover == null || hover === i ? 1 : 0.55} />}
              {i % labelEvery === 0 && <text x={cx} y={height - 4} textAnchor="middle">{b.label}</text>}
            </g>
          )
        })}
        <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} stroke="var(--border)" />
        {target != null && (
          <g>
            <line x1={pad.l} x2={w - pad.r} y1={y(target)} y2={y(target)} stroke="var(--chart-goal)" strokeWidth="2" strokeDasharray="4 3" />
            {targetLabel && <text x={w - pad.r} y={y(target) - 6} textAnchor="end" style={{ fill: 'var(--chart-goal)', fontWeight: 600 }}>{targetLabel}</text>}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: Math.min(Math.max(pad.l + slot * hover + slot / 2, 70), w - 70), top: y(Math.max(0, bars[hover].value)) }}>
          {bars[hover].tip || <><b>{fmt(bars[hover].value)}</b> · {bars[hover].label}</>}
        </div>
      )}
    </div>
  )
}
