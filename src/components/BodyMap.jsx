import { BODY } from '../lib/bodymap.js'

// Which body regions light up for each muscle group
export const REGIONS = {
  Chest: ['chest'],
  Back: ['upper_back', 'trapezius', 'lower_back'],
  Shoulders: ['front_deltoids', 'back_deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quadriceps'],
  'Hamstrings & Glutes': ['hamstring', 'gluteal'],
  Calves: ['calves', 'left_soleus', 'right_soleus'],
  Core: ['abs', 'obliques'],
}

const SKIP = new Set(['head', 'knees', 'neck'])

// Best side to show each group from
export const SIDE = {
  Chest: 'front', Back: 'back', Shoulders: 'front', Biceps: 'front', Triceps: 'back',
  Quads: 'front', 'Hamstrings & Glutes': 'back', Calves: 'back', Core: 'front',
}

// Square crop around the highlighted regions, like a zoomed anatomy plate
function cropBox(side, lit, pad = 9) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (const [region, polys] of BODY[side]) {
    if (!lit.has(region)) continue
    for (const pts of polys) {
      const v = pts.split(' ').map(Number)
      for (let i = 0; i < v.length; i += 2) {
        x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i])
        y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1])
      }
    }
  }
  if (x0 > x1) return '0 0 100 200'
  let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2
  const size = Math.max(w, h, 46)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return `${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`
}

// Zoomed single-side view of one muscle group
export function MuscleZoom({ muscle }) {
  const side = SIDE[muscle] || 'front'
  const lit = new Set(REGIONS[muscle] || [])
  return (
    <svg className="bodymap zoom" viewBox={cropBox(side, lit)} role="img" aria-label={muscle}>
      <defs>
        <linearGradient id="bm-hot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--bm-hot-1)" />
          <stop offset="1" stopColor="var(--bm-hot-2)" />
        </linearGradient>
      </defs>
      {BODY[side].map(([region, polys], i) =>
        polys.map((pts, j) => (
          <polygon key={`${i}-${j}`} points={pts} className={SKIP.has(region) ? 'bm-skin' : lit.has(region) ? 'bm-on' : 'bm-off'} />
        ))
      )}
    </svg>
  )
}

/**
 * Front and back anatomy figures with the chosen muscle groups highlighted.
 * muscles: array of group names (keys of REGIONS)
 */
export default function BodyMap({ muscles = [], className = '', labels = false }) {
  const lit = new Set(muscles.flatMap((m) => REGIONS[m] || []))
  const figure = (side, dx) => (
    <g transform={`translate(${dx} 0)`}>
      {BODY[side].map(([region, polys], i) =>
        polys.map((pts, j) => (
          <polygon
            key={`${i}-${j}`}
            points={pts}
            className={SKIP.has(region) ? 'bm-skin' : lit.has(region) ? 'bm-on' : 'bm-off'}
          />
        ))
      )}
    </g>
  )
  return (
    <svg className={`bodymap ${className}`} viewBox={labels ? '-4 -4 218 222' : '-4 -4 218 208'} role="img" aria-label={`Muscles: ${muscles.join(', ') || 'none'}`}>
      <defs>
        <linearGradient id="bm-hot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--bm-hot-1)" />
          <stop offset="1" stopColor="var(--bm-hot-2)" />
        </linearGradient>
      </defs>
      {figure('front', 0)}
      {figure('back', 110)}
      {labels && (
        <>
          <text x="50" y="214" textAnchor="middle" className="bm-label">Front</text>
          <text x="160" y="214" textAnchor="middle" className="bm-label">Back</text>
        </>
      )}
    </svg>
  )
}
