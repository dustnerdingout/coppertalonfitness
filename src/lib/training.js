import { EXERCISES } from './program.js'
import { restSec } from './builder.js'
import { mondayOf } from './plan.js'
import { todayStr, parseDate, DAY } from './stats.js'

// Workout settings, with defaults
export const WORKOUT_DEFAULTS = {
  restAuto: true,      // start the rest timer when a set is checked off
  restMode: 'auto',    // 'auto' = by exercise type (2 min big lifts, 75 s smaller, 45 s core), or 'fixed'
  restSec: 90,         // used when restMode is 'fixed'
  sound: true,
  vibrate: true,
  warmups: true,
  deloadEvery: 5,      // deload every Nth week (0 = off)
}
export const workoutSettings = (state) => ({ ...WORKOUT_DEFAULTS, ...(state.workout || {}) })

export const restFor = (state, id) => {
  const s = workoutSettings(state)
  return s.restMode === 'fixed' ? s.restSec : restSec(id)
}

// Training week number, counted from the week you started
export function trainingWeek(state) {
  const start = mondayOf(state.profile?.startDate || todayStr())
  const days = Math.round((parseDate(mondayOf(todayStr())) - parseDate(start)) / DAY)
  return Math.floor(days / 7) + 1
}

/**
 * Deload week: every Nth week, lighter weights and one less set so joints and nerves recover.
 * You can skip it for the current week, or force one early.
 */
export function isDeloadWeek(state) {
  const mon = mondayOf(todayStr())
  if (state.deloadSkip === mon) return false
  if (state.deloadForce === mon) return true
  const n = workoutSettings(state).deloadEvery
  return !!n && trainingWeek(state) % n === 0
}

const round5 = (n) => Math.round(n / 5) * 5

export function deloadExercise(e) {
  const ex = EXERCISES[e.id]
  const weight = ex.kind === 'weight' ? Math.max(5, round5(e.rec.weight * 0.9)) : 0
  const reps = ex.kind === 'weight' ? e.rec.reps : Math.max(ex.reps[0], Math.round(e.rec.reps * 0.8))
  const n = Math.max(2, e.sets.length - 1)
  return {
    ...e,
    rec: { ...e.rec, weight, reps, kind: 'down', note: 'Deload week: about 10% lighter and one less set. Leave 2 to 3 reps in the tank.' },
    sets: Array.from({ length: n }, () => ({ weight, reps: '', done: false })),
  }
}

export function applyDeload(session) {
  if (session.deload) return session
  return { ...session, deload: true, exercises: session.exercises.map(deloadExercise) }
}

export const prepSession = (session, state) => (isDeloadWeek(state) ? applyDeload(session) : session)

// Set types for intensity techniques
export const SET_TYPES = {
  normal: { short: null, label: 'Normal' },
  drop: { short: 'D', label: 'Drop set' },
  restpause: { short: 'RP', label: 'Rest-pause' },
  failure: { short: 'F', label: 'To failure' },
}
export const nextSetType = (t) => ({ normal: 'drop', drop: 'restpause', restpause: 'failure', failure: 'normal' })[t || 'normal']
