import { useLayoutEffect, useRef, useState, useId } from 'react'
import { BODY, OUTLINE } from '../lib/bodymap.js'

// Which body regions light up for each muscle group
export const REGIONS = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quadriceps'],
  'Hamstrings & Glutes': ['hamstring', 'gluteal'],
  Calves: ['calves'],
  Core: ['abs', 'obliques'],
}

// Best side to show each group from
export const SIDE = {
  Chest: 'front', Back: 'back', Shoulders: 'front', Biceps: 'front', Triceps: 'back',
  Quads: 'front', 'Hamstrings & Glutes': 'back', Calves: 'back', Core: 'front',
}

const SKIN = new Set(['head', 'neck', 'hands', 'feet', 'ankles', 'knees'])
const HAIR = new Set(['hair'])
const BACK_SHIFT = -724 + 760 // back art lives at x 724..1448; place it beside the front

const cls = (region, lit) => (HAIR.has(region) ? 'bm-hair' : SKIN.has(region) ? 'bm-skin' : lit.has(region) ? 'bm-on' : 'bm-off')

function Figure({ side, lit, shift = 0, gradId }) {
  return (
    <g transform={shift ? `translate(${shift} 0)` : undefined}>
      <path d={OUTLINE[side]} className="bm-silhouette" />
      {BODY[side].map(([region, paths]) =>
        paths.map((d, j) => (
          <path key={region + j} d={d} className={cls(region, lit)} data-lit={lit.has(region) || undefined}
            style={lit.has(region) ? { fill: `url(#${gradId})` } : undefined} />
        ))
      )}
      <path d={OUTLINE[side]} className="bm-outline" />
    </g>
  )
}

function Defs({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="var(--bm-hot-1)" />
        <stop offset="1" stopColor="var(--bm-hot-2)" />
      </linearGradient>
    </defs>
  )
}

/** Front and back figures with the chosen muscle groups highlighted */
export default function BodyMap({ muscles = [], labels = false }) {
  const gradId = 'bmg' + useId().replace(/:/g, '')
  const lit = new Set(muscles.flatMap((m) => REGIONS[m] || []))
  return (
    <svg className="bodymap" viewBox={`20 40 1450 ${labels ? 1390 : 1330}`} role="img" aria-label={`Muscles: ${muscles.join(', ') || 'none'}`}>
      <Defs id={gradId} />
      <Figure side="front" lit={lit} gradId={gradId} />
      <Figure side="back" lit={lit} shift={BACK_SHIFT} gradId={gradId} />
      {labels && (
        <>
          <text x="364" y="1405" textAnchor="middle" className="bm-label">Front</text>
          <text x="1124" y="1405" textAnchor="middle" className="bm-label">Back</text>
        </>
      )}
    </svg>
  )
}

/** Zoomed single side view, cropped around the highlighted muscle like an anatomy plate */
export function MuscleZoom({ muscle }) {
  const gradId = 'bmz' + useId().replace(/:/g, '')
  const side = SIDE[muscle] || 'front'
  const lit = new Set(REGIONS[muscle] || [])
  const ref = useRef(null)
  const [box, setBox] = useState(side === 'front' ? '0 0 724 1448' : '724 0 724 1448')

  // Measure the highlighted shapes and frame them in a square
  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll('[data-lit]')
    if (!els?.length) return
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    els.forEach((el) => {
      const b = el.getBBox()
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y)
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height)
    })
    const size = Math.max(x1 - x0, y1 - y0) * 1.32 + 40
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    setBox(`${Math.round(cx - size / 2)} ${Math.round(cy - size / 2)} ${Math.round(size)} ${Math.round(size)}`)
  }, [muscle])

  return (
    <svg ref={ref} className="bodymap zoom" viewBox={box} role="img" aria-label={muscle}>
      <Defs id={gradId} />
      <Figure side={side} lit={lit} gradId={gradId} />
    </svg>
  )
}
