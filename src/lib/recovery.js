import { EXERCISES, MUSCLES } from './program.js'

const HOUR = 3600000

/**
 * How recovered each muscle group is, 0 to 1 (1 = fresh).
 * Each hard set adds fatigue that fades over about 2 to 3 days. More sets take longer to clear,
 * so a 12 set leg day stays "recovering" longer than 3 sets of curls.
 */
export function recovery(lifts, now = Date.now()) {
  const fatigue = Object.fromEntries(MUSCLES.map((m) => [m, 0]))
  for (const l of lifts) {
    const t = l.ts && l.ts > 1e12 ? l.ts : new Date(l.date + 'T18:00:00').getTime()
    const hrs = (now - t) / HOUR
    if (hrs < 0 || hrs > 96) continue
    for (const e of l.exercises) {
      const m = EXERCISES[e.id]?.muscle
      if (!m) continue
      const sets = e.sets.length
      // each set is worth ~9% fatigue, decaying linearly to zero over 72 hours
      fatigue[m] += sets * 0.09 * Math.max(0, 1 - hrs / 72)
    }
  }
  return Object.fromEntries(MUSCLES.map((m) => [m, Math.max(0, 1 - Math.min(1, fatigue[m]))]))
}

export const freshest = (rec, n = 3) => Object.entries(rec).sort((a, b) => b[1] - a[1]).slice(0, n).map(([m]) => m)
