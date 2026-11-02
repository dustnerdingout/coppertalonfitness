import { EXERCISES, FOCUSES, ROTATIONS } from './program.js'

const round5 = (n) => Math.max(0, Math.round(n / 5) * 5)
export const byNewest = (a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0)

// All logged entries for one exercise, newest first
export function exerciseHistory(exId, lifts) {
  return [...lifts]
    .sort(byNewest)
    .map((l) => ({ date: l.date, entry: l.exercises.find((e) => e.id === exId) }))
    .filter((h) => h.entry && h.entry.sets.some((s) => s.reps > 0))
}

const workingSets = (entry) => entry.sets.filter((s) => s.reps > 0)
const topWeight = (sets) => Math.max(...sets.map((s) => Number(s.weight) || 0))

/**
 * Double progression.
 *  Every set at the top of the rep range  -> add weight, reset to bottom of range.
 *  Inside the range                       -> same weight, chase one more rep per set.
 *  Below the range once                   -> same weight, try again.
 *  Below the range two sessions in a row  -> drop 10% and rebuild.
 */
export function recommend(exId, lifts) {
  const ex = EXERCISES[exId]
  const [lo, hi] = ex.reps
  const hist = exerciseHistory(exId, lifts)

  if (!hist.length) {
    return {
      weight: ex.start, reps: lo, kind: 'start',
      note: ex.kind === 'weight'
        ? 'First time. Suggested start. Adjust so the last rep is hard but clean.'
        : 'First time. Find your baseline.',
    }
  }

  const sets = workingSets(hist[0].entry)
  const minReps = Math.min(...sets.map((s) => s.reps))
  const fullSets = sets.length >= ex.sets

  // Bodyweight and timed moves progress by reps / seconds
  if (ex.kind !== 'weight') {
    if (fullSets && minReps >= hi) {
      return { weight: 0, reps: hi, kind: 'up', note: `Maxed the range. Slow the tempo or add load to make ${hi} hard again.` }
    }
    const next = Math.min(hi, minReps + ex.inc)
    return { weight: 0, reps: next, kind: 'hold', note: `Beat last time: aim for ${next}${ex.kind === 'time' ? 's' : ''} every set.` }
  }

  const w = topWeight(sets)

  if (fullSets && minReps >= hi) {
    return { weight: w + ex.inc, reps: lo, kind: 'up', note: `You hit ${hi} on every set. Add ${ex.inc} lb.` }
  }

  if (minReps < lo) {
    const prev = hist[1] && workingSets(hist[1].entry)
    const missedTwice = prev && prev.length && topWeight(prev) === w && Math.min(...prev.map((s) => s.reps)) < lo
    if (missedTwice) {
      return { weight: round5(w * 0.9), reps: hi, kind: 'down', note: 'Missed the range twice. Drop 10% and build back up.' }
    }
    return { weight: w, reps: lo, kind: 'hold', note: `Fell short of ${lo}. Same weight, own it this time.` }
  }

  const target = Math.min(hi, minReps + 1)
  return { weight: w, reps: target, kind: 'hold', note: `Same weight. Aim for ${target}+ reps on every set.` }
}

// ---------- Building sessions ----------

export function nextFocus(lifts, rotation = 'ppl') {
  const order = (ROTATIONS[rotation] || ROTATIONS.ppl).order
  return order[lifts.length % order.length]
}

// Most recent date an exercise was logged ('' if never)
function lastUsed(exId, lifts) {
  let d = ''
  for (const l of lifts) if (l.date > d && l.exercises.some((e) => e.id === exId)) d = l.date
  return d
}

function pickForSlot(slot, lifts, exclude) {
  const pool = slot.pool.filter((id) => !exclude.includes(id))
  if (!pool.length) return null
  const scored = pool.map((id, i) => ({ id, i, used: lastUsed(id, lifts) }))
  if (slot.anchor) {
    // stick with the most recently trained variation so progression can build
    const done = scored.filter((x) => x.used).sort((a, b) => b.used.localeCompare(a.used))
    return (done[0] || scored[0]).id
  }
  // rotate: least recently used first, never-used counts as oldest
  scored.sort((a, b) => a.used.localeCompare(b.used) || a.i - b.i)
  return scored[0].id
}

export function makeExercise(id, lifts, slot = null) {
  const rec = recommend(id, lifts)
  return {
    id,
    slot,
    rec,
    sets: Array.from({ length: EXERCISES[id].sets }, () => ({ weight: rec.weight, reps: '', done: false })),
  }
}

export function buildSession(focus, lifts) {
  const chosen = []
  const exercises = []
  FOCUSES[focus].slots.forEach((slot, i) => {
    const id = pickForSlot(slot, lifts, chosen)
    if (!id) return
    chosen.push(id)
    exercises.push(makeExercise(id, lifts, i))
  })
  return { focus, startedAt: Date.now(), exercises }
}

// Options for swapping one exercise: its slot's pool plus anything else that hits the same muscle
export function swapOptions(session, index) {
  const cur = session.exercises[index]
  const inSession = session.exercises.map((e) => e.id)
  const slot = cur.slot != null ? FOCUSES[session.focus].slots[cur.slot] : null
  const sameMuscle = Object.keys(EXERCISES).filter((id) => EXERCISES[id].muscle === EXERCISES[cur.id].muscle)
  const all = [...new Set([...(slot ? slot.pool : []), ...sameMuscle])]
  return all.filter((id) => id === cur.id || !inSession.includes(id))
}

export function swapExercise(session, index, lifts, toId) {
  const opts = swapOptions(session, index)
  const cur = session.exercises[index]
  const next = toId || opts[(opts.indexOf(cur.id) + 1) % opts.length]
  if (next === cur.id) return session
  return { ...session, exercises: session.exercises.map((e, i) => (i === index ? makeExercise(next, lifts, cur.slot) : e)) }
}

// Mix it up: random variation for every slot except the anchor lift
export function shuffleSession(session, lifts) {
  const slots = FOCUSES[session.focus].slots
  const taken = []
  const exercises = session.exercises.map((e) => {
    const slot = e.slot != null ? slots[e.slot] : null
    if (!slot || slot.anchor) { taken.push(e.id); return e }
    return e
  })
  return {
    ...session,
    exercises: exercises.map((e) => {
      const slot = e.slot != null ? slots[e.slot] : null
      if (!slot || slot.anchor) return e
      const pool = slot.pool.filter((id) => !taken.includes(id))
      const id = pool[Math.floor(Math.random() * pool.length)] || e.id
      taken.push(id)
      return id === e.id ? e : makeExercise(id, lifts, e.slot)
    }),
  }
}

// Epley estimated 1 rep max
export const e1rm = (weight, reps) => (reps > 0 ? Math.round(weight * (1 + reps / 30)) : 0)

// ---------- Runs ----------

const RUN_START = {
  easy: { minutes: 20 },
  long: { minutes: 30 },
  intervals: { rounds: 6, runSec: 60, walkSec: 120 },
}
const RUN_CAP = { easy: 45, long: 90 }

export function runRecommendation(type, runs) {
  const last = [...runs].filter((r) => r.type === type).sort(byNewest)[0]
  if (!last) {
    return { ...RUN_START[type], kind: 'start', note: 'Starting point. Easy effort, walk breaks are allowed.' }
  }

  if (last.pain) {
    if (type === 'intervals') {
      const p = last.plan?.rounds ? last.plan : RUN_START.intervals
      return { ...p, rounds: Math.max(4, p.rounds - 2), kind: 'down', note: 'You flagged pain. Fewer rounds this time. If it persists, rest it.' }
    }
    return { minutes: Math.max(15, Math.round(last.minutes * 0.8)), kind: 'down', note: 'You flagged pain. Cut back 20%. If it persists, rest it.' }
  }

  const hard = last.rpe >= 8

  if (type === 'intervals') {
    const p = last.plan?.rounds ? last.plan : RUN_START.intervals
    if (hard) return { ...p, kind: 'hold', note: 'Last one was a grind. Repeat it until it feels like a 6 or 7.' }
    if (p.rounds < 8) return { ...p, rounds: p.rounds + 1, kind: 'up', note: 'Add one round.' }
    if (p.runSec >= 300) return { ...p, kind: 'hold', note: '5 minute run intervals. You are ready for continuous easy runs.' }
    return { ...p, rounds: 6, runSec: p.runSec + 30, kind: 'up', note: 'Longer run intervals, back to 6 rounds.' }
  }

  const base = Number(last.minutes) || RUN_START[type].minutes
  if (hard) return { minutes: base, kind: 'hold', note: 'That felt hard. Same time, slower pace.' }
  if (base >= RUN_CAP[type]) return { minutes: RUN_CAP[type], kind: 'hold', note: 'At the cap. Keep it here and let pace improve naturally.' }
  const next = Math.min(RUN_CAP[type], Math.max(base + 2, Math.round(base * 1.1)))
  return { minutes: next, kind: 'up', note: `Felt good. Go ${next} min (about +10%).` }
}

export const formatPace = (minutes, miles) => {
  if (!minutes || !miles) return '—'
  const p = minutes / miles
  const m = Math.floor(p)
  const s = Math.round((p - m) * 60)
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}/mi`
}

export const intervalLabel = (p) => `${p.rounds} × ${fmtSec(p.runSec)} run / ${fmtSec(p.walkSec)} walk`
const fmtSec = (s) => (s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`)
export const intervalMinutes = (p) => Math.round((p.rounds * (p.runSec + p.walkSec)) / 60)
