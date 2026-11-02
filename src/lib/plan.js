import { SLOTS, FOCUSES, ROTATIONS, RUN_TYPES } from './program.js'
import { todayStr, parseDate, DAY } from './stats.js'


/**
 * What's planned on each date, and whether it got done.
 * Returns { [date]: [{ slot, tone, label, done, missed, focus? }] }
 * Future lift days are labeled with the focus your rotation will serve up.
 */
export function planFor(state, dates) {
  const { schedule, lifts, runs, mobility, rotation } = state
  const today = todayStr()
  const order = (ROTATIONS[rotation] || ROTATIONS.ppl).order
  const hasLiftSlot = (ds) => (schedule[parseDate(ds).getDay()] || []).includes('lift')
  const liftOn = (ds) => lifts.find((x) => x.date === ds)

  // Which focus a future lift day gets: count pending lift days from today up to it
  const projectedFocus = (d) => {
    let k = lifts.length
    for (let c = today; c < d; c = addDays(c, 1)) if (hasLiftSlot(c) && !liftOn(c)) k++
    return order[k % order.length]
  }

  const out = {}
  for (const d of dates) {
    const slots = schedule[parseDate(d).getDay()] || []
    out[d] = slots.map((slot) => {
      const tone = SLOTS[slot].tone
      let done = false
      let focus = null
      if (tone === 'lift') {
        const l = liftOn(d)
        done = !!l
        if (l) focus = l.focus
        else if (d >= today) focus = projectedFocus(d)
      } else if (tone === 'run') {
        done = runs.some((r) => r.date === d)
      } else if (tone === 'mobility') {
        done = mobility.some((m) => m.date === d)
      }
      const label = tone === 'lift' && focus ? FOCUSES[focus].name : tone === 'run' ? RUN_TYPES[slot.slice(4)].name : SLOTS[slot].label
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
