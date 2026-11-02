import { EXERCISES, COMPOUND } from './program.js'
import { GUIDE } from './guide.js'

const BAR = 45
const PLATES = [45, 35, 25, 10, 5, 2.5]
const round5 = (n) => Math.round(n / 5) * 5

export const isBarbell = (id) => ['barbell', 'e-z curl bar'].includes(GUIDE[id]?.equipment)

/**
 * Warm-up sets before your working weight, for big compound lifts.
 * Heavier working weights get 3 ramp sets (empty bar, ~60%, ~80%), lighter ones get 2 (~50%, ~75%).
 * Reps drop as the weight climbs so you warm up without getting tired.
 */
export function warmupSets(id, working) {
  const ex = EXERCISES[id]
  const W = Number(working) || 0
  if (!ex || ex.kind !== 'weight' || !COMPOUND.has(id)) return []
  const barbell = isBarbell(id)
  if (W < (barbell ? 65 : 20)) return []
  const heavy = W >= (barbell ? 135 : 50)
  const scheme = heavy
    ? [[barbell ? BAR / W : 0.4, barbell ? 10 : 8], [0.6, 5], [0.8, 3]]
    : [[0.5, 8], [0.75, 4]]
  const out = []
  for (const [pct, reps] of scheme) {
    // barbell loads snap to 10 lb steps (5 lb plates per side) so they're easy to load
    const w = barbell ? Math.max(BAR, BAR + Math.round((W * pct - BAR) / 10) * 10) : Math.max(5, round5(W * pct))
    if (w >= W || out.some((s) => s.weight === w)) continue
    out.push({ weight: w, reps })
  }
  return out
}

// Plates per side of a 45 lb bar, e.g. 135 → "45", 155 → "45 + 10"
export function plateMath(weight) {
  let side = (Number(weight) - BAR) / 2
  if (side <= 0) return 'Empty bar'
  const used = []
  for (const p of PLATES) while (side >= p - 0.001) { used.push(p); side -= p }
  return `${used.join(' + ')} per side`
}
