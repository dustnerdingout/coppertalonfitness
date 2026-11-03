import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { DEFAULT_SCHEDULE } from './program.js'
import { RECORD_KEYS } from './merge.js'

// Data lives in this browser's localStorage. When signed in with Google it also syncs to the cloud (see sync.js).
const KEY = 'coppertalon-v1'

const EMPTY = {
  profile: null, // { name, startWeight, goalWeight, heightIn, age, sex, startDate, targets }
  schedule: DEFAULT_SCHEDULE,
  rotation: 'ppl', // key of ROTATIONS
  overrides: {},
  runPlan: null,   // active structured run plan: { id, startedAt }   // one-off changes per date: { 'YYYY-MM-DD': [slots] }
  weights: [],   // { id, date, weight }
  lifts: [],     // { id, date, ts, focus, durationMin, exercises: [{ id, sets: [{ weight, reps }] }] }
  runs: [],      // { id, date, ts, type, minutes, distance, rpe, pain, notes, plan }
  mobility: [],  // { id, date, ts, done: number }
  meals: [],     // { id, date, ts, slot, name, calories, protein, carbs, fat, items? }
  recipes: [],   // saved meals: { id, ts, name, servings, items, calories, protein, carbs, fat } (totals for the whole recipe)
  draft: null,   // in-progress lift session
  theme: 'system',
  workout: {},       // workout settings, see WORKOUT_DEFAULTS in training.js
  deloadSkip: null,  // Monday of a week where the scheduled deload is skipped
  deloadForce: null, // Monday of a week deloaded early
  deleted: {},       // ids removed on this device, so a sync never brings them back: { id: deletedAt }
  updatedAt: 0,      // last local change (ms), used to pick the newer settings when merging devices
}


/**
 * Bookkeeping for sync on every change:
 * - records that disappeared get a tombstone in `deleted`
 * - records that were edited get `_u` (edited at) so the newer copy wins a merge
 * - `updatedAt` moves forward when anything other than the in-progress workout changes
 */
function stamp(prev, next) {
  const now = Date.now()
  let deleted = next.deleted || prev.deleted || {}
  let touched = false
  for (const k of Object.keys(next)) {
    if (k !== 'draft' && k !== 'updatedAt' && next[k] !== prev[k]) touched = true
  }
  const out = { ...next }
  for (const k of RECORD_KEYS) {
    if (next[k] === prev[k] || !Array.isArray(prev[k]) || !Array.isArray(next[k])) continue
    const before = new Map(prev[k].map((x) => [x.id, x]))
    const nextIds = new Set()
    out[k] = next[k].map((x) => {
      nextIds.add(x.id)
      const old = before.get(x.id)
      return old && old !== x ? { ...x, _u: now } : x
    })
    for (const id of before.keys()) if (!nextIds.has(id)) deleted = { ...deleted, [id]: now }
  }
  out.deleted = deleted
  if (touched) out.updatedAt = now
  return out
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch { /* storage blocked or corrupt */ }
  return EMPTY
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const update = useCallback((fn) => setState((s) => stamp(s, { ...s, ...fn(s) })), [])
  // Replace everything with a merged copy from the cloud (no extra bookkeeping)
  const applySynced = useCallback((data) => setState((s) => ({ ...EMPTY, ...data, draft: s.draft })), [])

  const api = {
    state,
    update,
    add: (key, item) => update((s) => ({ [key]: [...s[key], { id: uid(), ts: Date.now(), ...item }] })),
    remove: (key, id) => update((s) => ({ [key]: s[key].filter((x) => x.id !== id) })),
    replaceAll: (data) => setState({ ...EMPTY, ...data, updatedAt: Date.now() }),
    applySynced,
    // Erase all: also tells other devices (via sync) to drop everything logged before now
    reset: () => setState({ ...EMPTY, wipedAt: Date.now(), updatedAt: Date.now() }),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
