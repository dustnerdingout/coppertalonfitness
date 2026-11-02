// Structured run plans.
// A workout's steps use the same shape COROS does:
//   { kind: 'warmup' | 'training' | 'rest' | 'cooldown', sec?: number, mi?: number, cadence?: [lo, hi] }
//   { repeat: n, steps: [...] }
// Workouts without `steps` show their summary (time, distance, interval count) and can be logged,
// but the guided timer needs the exact steps. Add them from the workout's detail screen in COROS.

const HC = 'During the run intervals, aim for a high cadence while keeping the effort easy. Pace doesn\'t matter as long as you can hold a conversation the whole time.'
const BR = 'Focus on deep breathing and keeping your arms and legs in sync. Stay at an effort where you can hold a conversation the whole way. You\'ve got this.'
const FIVEK = 'This is it! Keep your cadence high, breathe deep, and enjoy your run.'

// Week 1 run/walk, from the COROS workout detail
const W1_RUNWALK = [
  { kind: 'warmup', sec: 300 },
  { repeat: 3, steps: [
    { kind: 'training', sec: 180, cadence: [170, 180] },
    { kind: 'rest', sec: 120 },
  ] },
  { kind: 'cooldown', sec: 300 },
]

// Week 2 run/walk, from the COROS workout detail
const W2_RUNWALK = [
  { kind: 'warmup', sec: 300 },
  { repeat: 3, steps: [
    { kind: 'training', sec: 240, cadence: [170, 180] },
    { kind: 'rest', sec: 120 },
  ] },
  { kind: 'cooldown', sec: 300 },
]

// Breathing runs: 5 min warm up, the distance at 170 to 180 cadence, 5 min cool down (from the COROS 2km detail)
const breathing = (mi) => [
  { kind: 'warmup', sec: 300 },
  { kind: 'training', mi, cadence: [170, 180] },
  { kind: 'cooldown', sec: 300 },
]

const rw = (id, week, day, minutes, intervals, extra = {}) => ({
  id, week, day, name: 'Run/Walk - High Cadence', type: 'intervals', minutes, intervals, desc: HC, ...extra,
})
const br = (id, week, day, km, mi, extra = {}) => ({
  id, week, day, name: `${km}km - Breathing`, type: 'easy', km, mi, desc: BR, steps: breathing(mi), ...extra,
})

export const RUN_PLANS = {
  coros5k: {
    name: 'Introduction to 5K',
    source: 'COROS',
    weeks: 6,
    perWeek: 3,
    desc: 'A 6 week plan to build safely toward your first 5K. 3 sessions a week, focused on cadence and breathing. If you can hold a conversation, you\'re doing it right.',
    workouts: [
      rw('w1d1', 1, 1, 25, 3, { steps: W1_RUNWALK }),
      rw('w1d2', 1, 2, 25, 3, { steps: W1_RUNWALK }),
      br('w1d3', 1, 3, 1, 0.6, { minutes: 17 }),

      rw('w2d1', 2, 1, 28, 3, { steps: W2_RUNWALK }),
      rw('w2d2', 2, 2, 28, 3, { steps: W2_RUNWALK }),
      br('w2d3', 2, 3, 2, 1.25),

      rw('w3d1', 3, 1, 30, 3),
      rw('w3d2', 3, 2, 30, 3),
      br('w3d3', 3, 3, 3, 2.0),

      rw('w4d1', 4, 1, 36, 4),
      rw('w4d2', 4, 2, 36, 4, { desc: BR }),
      br('w4d3', 4, 3, 4, 2.5),

      rw('w5d1', 5, 1, 40, 5),
      rw('w5d2', 5, 2, 40, 5),
      br('w5d3', 5, 3, 4, 2.5),

      { id: 'w6d1', week: 6, day: 1, name: 'Run/Walk - Breathing', type: 'intervals', minutes: 60, mi: 3.75, desc: BR },
      { id: 'w6d2', week: 6, day: 2, name: 'Run/Walk - High Cadence', type: 'intervals', minutes: 61, mi: 4.0, desc: HC },
      { id: 'w6d3', week: 6, day: 3, name: '5K!', type: 'long', km: 5, mi: 3.11, desc: FIVEK, race: true },
    ],
  },
}

export const STEP_LABEL = { warmup: 'Warm Up', training: 'Training', rest: 'Rest', cooldown: 'Cool Down' }

// Flatten repeats into a linear list for the guided timer
export function flattenSteps(steps = []) {
  const out = []
  for (const s of steps) {
    if (s.repeat) {
      for (let r = 1; r <= s.repeat; r++) for (const inner of s.steps) out.push({ ...inner, round: r, rounds: s.repeat })
    } else out.push(s)
  }
  return out
}

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// Short summary line, e.g. "25 min · 3 intervals" or "2 km (1.25 mi)"
export function workoutSummary(w) {
  const parts = []
  if (w.km) parts.push(`${w.km} km (${w.mi} mi)`)
  else if (w.mi) parts.push(`${w.mi} mi`)
  if (w.minutes) parts.push(`${w.km ? '≈' : ''}${w.minutes} min`)
  if (w.intervals) parts.push(`${w.intervals} intervals`)
  return parts.join(' · ')
}

export const findWorkout = (planId, workoutId) => RUN_PLANS[planId]?.workouts.find((w) => w.id === workoutId) || null

// Progress through the active plan: done workout ids come from logged runs tagged with the plan
export function planProgress(state) {
  const rp = state.runPlan
  if (!rp || !RUN_PLANS[rp.id]) return null
  const plan = RUN_PLANS[rp.id]
  const doneIds = new Set(state.runs.filter((r) => r.plan?.planId === rp.id && (r.ts || 0) >= (rp.startedAt || 0)).map((r) => r.plan.workoutId))
  const remaining = plan.workouts.filter((w) => !doneIds.has(w.id))
  return { id: rp.id, plan, doneIds, next: remaining[0] || null, remaining, done: doneIds.size, total: plan.workouts.length }
}
