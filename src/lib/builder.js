import { EXERCISES, MUSCLES, COMPOUND } from './program.js'
import { makeExercise } from './progression.js'

// Bigger muscle groups get more exercises
const BIG = new Set(['Chest', 'Back', 'Quads', 'Hamstrings & Glutes'])
export const WARMUP_MIN = 5

// Movement patterns. The builder avoids two of the same pattern so a session covers more angles.
const FAMILY = {
  bench: 'flatPress', dbBench: 'flatPress', machinePress: 'flatPress', pushup: 'flatPress',
  inclineDb: 'inclinePress', inclineBar: 'inclinePress',
  cableFly: 'fly', pecDeck: 'fly', inclineCableFly: 'fly',
  pushdown: 'pushdown', ohTriExt: 'triOverhead', skull: 'triOverhead', closeGrip: 'triPress',
  pulldown: 'vPull', closePulldown: 'vPull', straightArm: 'vPull',
  cableRow: 'row', chestSupRow: 'row', dbRow: 'row', barbellRow: 'row',
  dbCurl: 'curl', ezCurl: 'curl', cableCurl: 'curl', preacher: 'curl', inclineCurl: 'curl', hammer: 'hammer',
  ohp: 'ohPress', dbOhp: 'ohPress', arnold: 'ohPress', lateralRaise: 'lateral', cableLateral: 'lateral', rearDelt: 'rearDelt', facePull: 'rearDelt',
  squat: 'squat', gobletSquat: 'squat', hackSquat: 'squat', legPress: 'squat',
  splitSquat: 'singleLeg', lunge: 'singleLeg', stepUp: 'singleLeg',
  trapDl: 'hinge', rdl: 'hinge', dbRdl: 'hinge',
  hipThrust: 'glute', gluteKickback: 'glute',
  calfRaise: 'calf', seatedCalf: 'calf',
  plank: 'antiExt', deadBug: 'antiExt', hangingKnee: 'flexion', legRaise: 'flexion', cableCrunch: 'flexion', russianTwist: 'rotation',
}
const WORK_SEC = 45   // about how long one set takes
const SETUP_SEC = 60  // moving between stations, loading plates

export const restSec = (id) => (COMPOUND.has(id) ? 120 : EXERCISES[id].muscle === 'Core' ? 45 : 75)
export const fmtRest = (s) => (s % 60 === 0 ? `${s / 60} min` : `${s} sec`)
const exMinutes = (id, sets) => (sets * (WORK_SEC + restSec(id)) + SETUP_SEC) / 60

export const sessionMinutes = (exercises) =>
  Math.round(WARMUP_MIN + exercises.reduce((t, e) => t + exMinutes(e.id, e.sets.length), 0))

export const PRESETS = [
  ['Chest & Triceps', ['Chest', 'Triceps']],
  ['Back & Biceps', ['Back', 'Biceps']],
  ['Legs', ['Quads', 'Hamstrings & Glutes', 'Calves']],
  ['Shoulders & Arms', ['Shoulders', 'Biceps', 'Triceps']],
  ['Upper Body', ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps']],
  ['Full Body', ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings & Glutes', 'Core']],
]

export function titleFor(muscles) {
  const preset = PRESETS.find(([, m]) => m.length === muscles.length && m.every((x) => muscles.includes(x)))
  if (preset) return preset[0]
  const sorted = MUSCLES.filter((m) => muscles.includes(m))
  if (sorted.length <= 2) return sorted.join(' & ')
  if (sorted.length >= 5) return 'Full Body Mix'
  return `${sorted.slice(0, -1).join(', ')} & ${sorted.at(-1)}`
}

function lastUsed(id, lifts) {
  let d = ''
  for (const l of lifts) if (l.date > d && l.exercises.some((e) => e.id === id)) d = l.date
  return d
}

/**
 * Build a session for the chosen muscles that fits the time.
 * Round robin across muscles: compound lifts first, then isolation work.
 * Within a muscle it favors what you've done least recently, so workouts vary.
 * random: true shuffles the picks for "Mix it up".
 */
export function buildCustom(muscles, minutes, lifts, { random = false } = {}) {
  const sel = MUSCLES.filter((m) => muscles.includes(m))
  const budget = minutes - WARMUP_MIN

  // Per muscle: alternate a compound and an isolation move, freshest first
  const queue = {}
  for (const m of sel) {
    const ids = Object.keys(EXERCISES).filter((id) => EXERCISES[id].muscle === m)
    const key = Object.fromEntries(ids.map((id) => [id, random ? Math.random() : lastUsed(id, lifts)]))
    const byKey = (a, b) => (random ? key[a] - key[b] : key[a].localeCompare(key[b]))
    const comp = ids.filter((id) => COMPOUND.has(id)).sort(byKey)
    const iso = ids.filter((id) => !COMPOUND.has(id)).sort(byKey)
    const q = []
    while (comp.length || iso.length) {
      if (comp.length) q.push(comp.shift())
      if (iso.length) q.push(iso.shift())
    }
    queue[m] = q
  }

  const baseCap = (m) => (BIG.has(m) ? (sel.length <= 2 ? 4 : 3) : sel.length <= 2 ? 3 : 2)
  const picked = []
  const count = {}
  const families = new Set()
  let used = 0

  // Take the next exercise for a muscle, skipping repeats of a movement pattern unless nothing else is left
  const takeNext = (m, allowRepeat) => {
    const i = queue[m].findIndex((id) => allowRepeat || !FAMILY[id] || !families.has(FAMILY[id]))
    return i < 0 ? null : queue[m].splice(i, 1)[0]
  }

  for (let extra = 0; extra < 4; extra++) {
    let progress = true
    while (progress) {
      progress = false
      for (const m of sel) {
        if ((count[m] || 0) >= baseCap(m) + extra) continue
        const id = takeNext(m, extra > 0)
        if (!id) continue
        const cost = exMinutes(id, 3)
        const everyMuscleHasOne = sel.every((x) => count[x])
        if (used + cost > budget + 2 && everyMuscleHasOne) { queue[m].unshift(id); continue }
        picked.push(id)
        if (FAMILY[id]) families.add(FAMILY[id])
        used += cost
        count[m] = (count[m] || 0) + 1
        progress = true
      }
    }
    if (used >= budget - 4) break
  }

  // Compounds first, isolation after, core last
  const rank = (id) => (EXERCISES[id].muscle === 'Core' ? 2 : COMPOUND.has(id) ? 0 : 1)
  const ordered = picked.map((id, i) => ({ id, i })).sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i).map((x) => x.id)

  // Time left over? Give the compound lifts a 4th set
  const sets = Object.fromEntries(ordered.map((id) => [id, 3]))
  for (const id of ordered.filter((x) => COMPOUND.has(x))) {
    const extra = (WORK_SEC + restSec(id)) / 60
    if (used + extra <= budget) { sets[id] = 4; used += extra }
  }

  const exercises = ordered.map((id) => {
    const e = makeExercise(id, lifts)
    const n = sets[id]
    const s = e.sets[0]
    return { ...e, sets: Array.from({ length: n }, () => ({ ...s })) }
  })

  return { focus: 'custom', title: titleFor(sel), muscles: sel, minutes, startedAt: Date.now(), exercises }
}
