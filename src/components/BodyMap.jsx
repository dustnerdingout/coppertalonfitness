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

function Figure({ side, lit, shift = 0, gradId, levels = null, crop = null }) {
  return (
    <g transform={shift ? `translate(${shift} 0)` : undefined}>
      <path d={OUTLINE[side]} className="bm-silhouette" />
      {BODY[side].map(([region, paths]) =>
        paths.map((d, j) => (
          <path key={region + j} d={d} className={cls(region, lit)} data-lit={(crop ? crop.has(region) : lit.has(region)) || undefined}
            style={lit.has(region) ? { fill: `url(#${gradId})`, ...(levels ? { fillOpacity: levels[region] } : {}) } : undefined} />
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
export default function BodyMap({ muscles = [], labels = false, heat = null }) {
  const gradId = 'bmg' + useId().replace(/:/g, '')
  // heat: { muscleGroup: 0..1 } shades each group by intensity instead of on/off
  const levels = heat ? Object.fromEntries(Object.entries(heat).flatMap(([m, v]) => (REGIONS[m] || []).map((r) => [r, v]))) : null
  const lit = heat ? new Set(Object.keys(levels).filter((r) => levels[r] > 0.04)) : new Set(muscles.flatMap((m) => REGIONS[m] || []))
  return (
    <svg className="bodymap" viewBox={`20 40 1450 ${labels ? 1390 : 1330}`} role="img" aria-label={`Muscles: ${muscles.join(', ') || 'none'}`}>
      <Defs id={gradId} />
      <Figure side="front" lit={lit} gradId={gradId} levels={levels} />
      <Figure side="back" lit={lit} shift={BACK_SHIFT} gradId={gradId} levels={levels} />
      {labels && (
        <>
          <text x="364" y="1405" textAnchor="middle" className="bm-label">Front</text>
          <text x="1124" y="1405" textAnchor="middle" className="bm-label">Back</text>
        </>
      )}
    </svg>
  )
}

const FRONT_ONLY = new Set(['chest', 'abs', 'obliques', 'biceps', 'quadriceps', 'tibialis'])
const BACK_ONLY = new Set(['upper-back', 'lower-back', 'gluteal', 'hamstring'])

/**
 * Zoomed single side anatomy, cropped around the main muscles like an anatomy plate.
 * primary regions are solid copper, secondary regions are a lighter tint.
 */
export function AnatomyZoom({ primary = [], secondary = [], side: forced, fallbackSide = 'front' }) {
  const gradId = 'bmz' + useId().replace(/:/g, '')
  const pri = new Set(primary)
  const side = forced || (primary.some((r) => BACK_ONLY.has(r)) ? 'back' : primary.some((r) => FRONT_ONLY.has(r)) ? 'front' : fallbackSide)
  const lit = new Set([...primary, ...secondary])
  const levels = Object.fromEntries([...secondary.map((r) => [r, 0.38]), ...primary.map((r) => [r, 1])])
  const ref = useRef(null)
  const [box, setBox] = useState(side === 'front' ? '0 0 724 1448' : '724 0 724 1448')

  // Measure the main muscles and frame them in a square
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
  }, [primary.join(), side])

  return (
    <svg ref={ref} className="bodymap zoom" viewBox={box} role="img" aria-hidden="true">
      <Defs id={gradId} />
      <Figure side={side} lit={lit} gradId={gradId} levels={levels} crop={pri} />
    </svg>
  )
}

/** Zoomed view of one muscle group (builder tiles) */
export function MuscleZoom({ muscle }) {
  return <AnatomyZoom primary={REGIONS[muscle] || []} side={SIDE[muscle] || 'front'} />
}

/** Front and back figures for one exercise: main muscles solid, helpers lighter */
export function ExerciseBody({ primary = [], secondary = [], labels = false }) {
  const gradId = 'bme' + useId().replace(/:/g, '')
  const lit = new Set([...primary, ...secondary])
  const levels = Object.fromEntries([...secondary.map((r) => [r, 0.38]), ...primary.map((r) => [r, 1])])
  return (
    <svg className="bodymap" viewBox={`20 40 1450 ${labels ? 1390 : 1330}`} role="img" aria-label="Muscles worked">
      <Defs id={gradId} />
      <Figure side="front" lit={lit} gradId={gradId} levels={levels} />
      <Figure side="back" lit={lit} shift={BACK_SHIFT} gradId={gradId} levels={levels} />
      {labels && (
        <>
          <text x="364" y="1405" textAnchor="middle" className="bm-label">Front</text>
          <text x="1124" y="1405" textAnchor="middle" className="bm-label">Back</text>
        </>
      )}
    </svg>
  )
}
