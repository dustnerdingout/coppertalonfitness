// Structured run plans. Each workout is a list of steps, the same shape COROS uses:
//   { kind: 'warmup' | 'training' | 'rest' | 'cooldown', sec?: number, km?: number, cadence?: [lo, hi], note?: string }
//   { repeat: n, steps: [...] }
// `type` maps the workout onto the app's run types for history and charts.
//
// To add the remaining weeks: copy a workout block, set week/day, and fill in the steps
// exactly as they appear in the COROS app.

export const RUN_PLANS = {
  coros5k: {
    name: 'Introduction to 5K',
    source: 'COROS training plan',
    weeks: 6,
    perWeek: 3,
    desc: 'A 6 week plan to build safely toward your first 5K. 3 sessions a week, focused on cadence and breathing. Pace doesn\'t matter: if you can hold a conversation, you\'re doing it right.',
    workouts: [
      {
        id: 'w1d1',
        week: 1,
        day: 1,
        name: 'Run/Walk - High Cadence',
        type: 'intervals',
        desc: 'During the intervals, aim for a high cadence while keeping the effort easy. Exact pace doesn\'t matter as long as you can hold a conversation the whole time.',
        steps: [
          { kind: 'warmup', sec: 300 },
          { repeat: 3, steps: [
            { kind: 'training', sec: 180, cadence: [170, 180] },
            { kind: 'rest', sec: 120 },
          ] },
          { kind: 'cooldown', sec: 300 },
        ],
      },
      {
        id: 'w1d2',
        week: 1,
        day: 2,
        name: 'Breathing',
        type: 'easy',
        estMin: 17,
        desc: 'Easy 1 km focused on deep breathing and syncing your arms and legs. Keep it conversational.',
        steps: [
          { kind: 'training', km: 1, note: 'Deep breaths, arms and legs in sync' },
        ],
      },
      // Week 1 day 3 and weeks 2 to 6: add from the COROS app
    ],
  },
}

export const STEP_LABEL = { warmup: 'Warm Up', training: 'Training', rest: 'Rest', cooldown: 'Cool Down' }

// Flatten repeats into a linear list for the guided timer
export function flattenSteps(steps) {
  const out = []
  for (const s of steps) {
    if (s.repeat) {
      for (let r = 1; r <= s.repeat; r++) {
        for (const inner of s.steps) out.push({ ...inner, round: r, rounds: s.repeat })
      }
    } else out.push(s)
  }
  return out
}

export function workoutSeconds(w) {
  return flattenSteps(w.steps).reduce((t, s) => t + (s.sec || 0), 0) || (w.estMin || 0) * 60
}

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// Which plan workouts are done (any logged run tagged with that workout id)
export function planProgress(state) {
  const rp = state.runPlan
  if (!rp || !RUN_PLANS[rp.id]) return null
  const plan = RUN_PLANS[rp.id]
  const doneIds = new Set(state.runs.filter((r) => r.plan?.planId === rp.id).map((r) => r.plan.workoutId))
  const next = plan.workouts.find((w) => !doneIds.has(w.id)) || null
  return { plan, doneIds, next, total: plan.weeks * plan.perWeek, loaded: plan.workouts.length }
}
