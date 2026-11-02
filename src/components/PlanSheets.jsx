import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { SLOTS, DAY_NAMES } from '../lib/program.js'
import { moveSlot, skipSlot, toggleDaySlot, resetDay, slotsFor, isOverridden, planFor, addDays } from '../lib/plan.js'
import { todayStr, parseDate, fmtDate } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Sheet } from './ui.jsx'

const dayLabel = (d) => {
  const t = todayStr()
  if (d === t) return 'Today'
  if (d === addDays(t, 1)) return 'Tomorrow'
  return `${DAY_NAMES[parseDate(d).getDay()]} ${parseDate(d).getDate()}`
}

// Move or skip one session
export function MoveSheet({ date, slot, label, onClose, notify }) {
  const { state, update } = useStore()
  const [pick, setPick] = useState('')
  const start = date < todayStr() ? todayStr() : date
  const options = Array.from({ length: 7 }, (_, i) => addDays(start, i + 1))
  const plan = planFor(state, options)

  const moveTo = (to) => {
    update((s) => ({ overrides: moveSlot(s, slot, date, to) }))
    notify(`${label} moved to ${dayLabel(to).toLowerCase() === 'tomorrow' ? 'tomorrow' : dayLabel(to)}`)
    onClose()
  }
  const skip = () => {
    update((s) => ({ overrides: skipSlot(s, slot, date) }))
    notify(`${label} skipped`)
    onClose()
  }

  return (
    <Sheet title={`Move ${label}`} onClose={onClose}>
      <div className="stack">
        <p className="muted small">From {dayLabel(date).toLowerCase() === 'today' ? 'today' : fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}. Your normal weekly schedule stays the same.</p>
        {options.map((d) => {
          const has = plan[d].filter((x) => x.tone !== 'rest')
          return (
            <button key={d} className="session" onClick={() => moveTo(d)}>
              <div className="wk-date"><span>{DAY_NAMES[parseDate(d).getDay()]}</span><b>{parseDate(d).getDate()}</b></div>
              <div className="grow">
                <h3>{dayLabel(d)}</h3>
                <p className="muted small">{has.length ? `Already: ${has.map((x) => x.label).join(', ')}` : 'Open day'}</p>
              </div>
              <span className="chev"><Icon.Chevron /></span>
            </button>
          )
        })}
        <label className="field">Or pick a date
          <div className="row">
            <input className="input" type="date" min={addDays(todayStr(), 0)} value={pick} onChange={(e) => setPick(e.target.value)} />
            <button className="btn primary" disabled={!pick || pick === date} onClick={() => moveTo(pick)}>Move</button>
          </div>
        </label>
        <button className="btn ghost danger block" onClick={skip}><Icon.X />Skip it, don't reschedule</button>
      </div>
    </Sheet>
  )
}

// Change everything planned for one date
export function DaySheet({ date, onClose }) {
  const { state, update } = useStore()
  const cur = slotsFor(state, date)
  const changed = isOverridden(state, date)
  const usual = state.schedule[parseDate(date).getDay()] || []

  return (
    <Sheet title={`Edit ${dayLabel(date).toLowerCase() === 'today' ? 'today' : fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}`} onClose={onClose}>
      <div className="stack">
        <p className="muted small">Turn sessions on or off for just this day. Your weekly template in Settings doesn't change.</p>
        <div className="stack" style={{ gap: 8 }}>
          {Object.entries(SLOTS).map(([k, s]) => {
            const on = cur.includes(k)
            return (
              <button key={k} className={`mob-item day-toggle ${on ? 'on ' + s.tone : ''}`} onClick={() => update((st) => ({ overrides: toggleDaySlot(st, k, date) }))}>
                <span className="box">{on && <Icon.Check />}</span>
                <div className="grow"><h3>{s.label}</h3></div>
              </button>
            )
          })}
        </div>
        {changed && (
          <button className="btn block" onClick={() => update((st) => ({ overrides: resetDay(st, date) }))}>
            Reset to usual ({usual.map((x) => SLOTS[x].label).join(' + ') || 'nothing'})
          </button>
        )}
        <button className="btn primary block" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  )
}
