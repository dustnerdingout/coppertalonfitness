import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { DEFAULT_SCHEDULE } from './program.js'

// All data lives in this browser's localStorage. Use Settings > Export to back it up.
const KEY = 'coppertalon-v1'

const EMPTY = {
  profile: null, // { name, startWeight, goalWeight, heightIn, age, sex, startDate, targets }
  schedule: DEFAULT_SCHEDULE,
  rotation: 'ppl', // key of ROTATIONS
  weights: [],   // { id, date, weight }
  lifts: [],     // { id, date, ts, focus, durationMin, exercises: [{ id, sets: [{ weight, reps }] }] }
  runs: [],      // { id, date, ts, type, minutes, distance, rpe, pain, notes, plan }
  mobility: [],  // { id, date, ts, done: number }
  meals: [],     // { id, date, ts, slot, name, calories, protein, carbs, fat }
  draft: null,   // in-progress lift session
  theme: 'system',
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

  const update = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), [])

  const api = {
    state,
    update,
    add: (key, item) => update((s) => ({ [key]: [...s[key], { id: uid(), ts: Date.now(), ...item }] })),
    remove: (key, id) => update((s) => ({ [key]: s[key].filter((x) => x.id !== id) })),
    replaceAll: (data) => setState({ ...EMPTY, ...data }),
    reset: () => setState(EMPTY),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
