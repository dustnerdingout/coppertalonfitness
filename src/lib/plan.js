import { SLOTS, FOCUSES, ROTATIONS, RUN_TYPES } from './program.js'
import { todayStr, parseDate, DAY } from './stats.js'

// ---------- Per-day changes ----------
// The weekly schedule in Settings is the template. `overrides` holds one-off changes
// for specific dates: { '2026-11-02': ['run-easy'] }. An override wins over the template.

export const slotsFor = (state, ds) => state.overrides?.[ds] ?? (state.schedule[parseDate(ds).getDay()] || [])
export const isOverridden = (state, ds) => !!state.overrides?.[ds]

const cleanDay = (slots) => {
  const real = slots.filter((x) => x !== 'rest')
  return real.length ? real : ['rest']
}

// Move one session from a date to another date
export function moveSlot(state, slot, from, to) {
  const o = { ...(state.overrides || {}) }
  o[from] = cleanDay(slotsFor(state, from).filter((x) => x !== slot))
  const dest = slotsFor(state, to).filter((x) => x !== 'rest')
  o[to] = dest.includes(slot) ? dest : [...dest, slot]
  return o
}

// Remove a session from a date
export function skipSlot(state, slot, date) {
  return { ...(state.overrides || {}), [date]: cleanDay(slotsFor(state, date).filter((x) => x !== slot)) }
}

// Turn one session on or off for a single date
export function toggleDaySlot(state, slot, date) {
  const cur = slotsFor(state, date)
  let next
  if (slot === 'rest') next = ['rest']
  else next = cur.includes(slot) ? cur.filter((x) => x !== slot) : [...cur.filter((x) => x !== 'rest'), slot]
  return { ...(state.overrides || {}), [date]: cleanDay(next) }
}

export function resetDay(state, date) {
  const o = { ...(state.overrides || {}) }
  delete o[date]
  return o
}


/**
 * What's planned on each date, and whether it got done.
 * Returns { [date]: [{ slot, tone, label, done, missed, focus? }] }
 * Future lift days are labeled with the focus your rotation will serve up.
 */
export function planFor(state, dates) {
  const { lifts, runs, mobility, rotation } = state
  const today = todayStr()
  const order = (ROTATIONS[rotation] || ROTATIONS.ppl).order
  const hasLiftSlot = (ds) => slotsFor(state, ds).includes('lift')
  const liftOn = (ds) => lifts.find((x) => x.date === ds)

  // Which focus a future lift day gets: count pending lift days from today up to it
  const projectedFocus = (d) => {
    let k = lifts.length
    for (let c = today; c < d; c = addDays(c, 1)) if (hasLiftSlot(c) && !liftOn(c)) k++
    return order[k % order.length]
  }

  const out = {}
  for (const d of dates) {
    const slots = slotsFor(state, d)
    out[d] = slots.map((slot) => {
      const tone = SLOTS[slot].tone
      let done = false
      let focus = null
      let customTitle = null
      if (tone === 'lift') {
        const l = liftOn(d)
        done = !!l
        if (l) { focus = l.focus; customTitle = l.title }
        else if (d >= today) focus = projectedFocus(d)
      } else if (tone === 'run') {
        done = runs.some((r) => r.date === d)
      } else if (tone === 'mobility') {
        done = mobility.some((m) => m.date === d)
      }
      const label = tone === 'lift' && focus ? (FOCUSES[focus]?.name || customTitle || 'Strength') : tone === 'run' ? RUN_TYPES[slot.slice(4)].name : SLOTS[slot].label
      return { slot, tone, label, done, focus, missed: !done && tone !== 'rest' && d < today }
    })
  }
  return out
}

export const datesBetween = (startStr, n) => {
  const s = parseDate(startStr).getTime()
  return Array.from({ length: n }, (_, i) => todayStr(new Date(s + i * DAY)))
}

export const mondayOf = (ds) => {
  const d = parseDate(ds)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return todayStr(d)
}

export const addDays = (ds, n) => todayStr(new Date(parseDate(ds).getTime() + n * DAY))
