import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { planFor, datesBetween, mondayOf, addDays, isOverridden } from '../lib/plan.js'
import { MoveSheet, DaySheet } from './PlanSheets.jsx'
import { todayStr, parseDate, fmtDate } from '../lib/stats.js'
import { dayTotals } from '../lib/nutrition.js'
import { FOCUSES, RUN_TYPES } from '../lib/program.js'
import { Icon } from './Icons.jsx'
import { Seg } from './ui.jsx'
import History, { EntryCard, allEntries } from './History.jsx'

const toneIcon = { lift: Icon.Dumbbell, run: Icon.Run, mobility: Icon.Stretch, rest: Icon.Bed }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Calendar({ open, notify }) {
  const [view, setView] = useState('week')
  const [sel, setSel] = useState(todayStr())
  const goDay = (d) => { setSel(d); setView('day') }

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div><div className="eyebrow">Plan & log</div><h1>Calendar</h1></div>
        {sel !== todayStr() && view !== 'list' && <button className="btn sm" onClick={() => setSel(todayStr())}>Today</button>}
      </header>
      <Seg options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['list', 'List']]} value={view} onChange={setView} />
      {view === 'day' && <DayView date={sel} setDate={setSel} open={open} notify={notify} />}
      {view === 'week' && <WeekView date={sel} setDate={setSel} goDay={goDay} />}
      {view === 'month' && <MonthView date={sel} setDate={setSel} goDay={goDay} />}
      {view === 'list' && <History />}
    </div>
  )
}

function Nav({ label, onPrev, onNext }) {
  return (
    <div className="datenav">
      <button className="icon-btn" onClick={onPrev} aria-label="Previous"><Icon.ChevronLeft /></button>
      <b>{label}</b>
      <button className="icon-btn" onClick={onNext} aria-label="Next"><Icon.Chevron /></button>
    </div>
  )
}

// ---------- Day ----------
function DayView({ date, setDate, open, notify }) {
  const { state, remove } = useStore()
  const [moving, setMoving] = useState(null)
  const [editing, setEditing] = useState(false)
  const today = todayStr()
  const plan = planFor(state, [date])[date]
  const entries = allEntries(state).filter((x) => x.date === date)
  const food = dayTotals(state.meals, date)
  const isToday = date === today

  // Past days log on that day (catching up); future days log today (doing it now)
  const logDate = date < today ? date : today
  const start = (p) => {
    if (p.tone === 'lift') open({ type: 'lift', focus: p.focus, date: logDate })
    else if (p.tone === 'run' && p.workout) open({ type: 'runworkout', planId: state.runPlan.id, workoutId: p.workout.id, date: logDate })
    else if (p.tone === 'run') open({ type: 'run', runType: p.slot.slice(4), date: logDate })
    else if (p.tone === 'mobility') open({ type: 'mobility', date: logDate })
  }

  return (
    <>
      <Nav label={isToday ? 'Today' : parseDate(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        onPrev={() => setDate(addDays(date, -1))} onNext={() => setDate(addDays(date, 1))} />

      <section className="stack">
        <div className="row between" style={{ margin: '8px 2px -4px' }}>
          <div className="section-label" style={{ margin: 0 }}>Planned{isOverridden(state, date) ? ' · changed' : ''}</div>
          <button className="btn sm ghost" onClick={() => setEditing(true)}>Edit day</button>
        </div>
        {plan.map((p) => {
          const I = toneIcon[p.tone]
          const clickable = !p.done && p.tone !== 'rest'
          const canMove = !p.done && p.tone !== 'rest'
          return (
            <div key={p.slot} className="slot-wrap">
              <button className={`session tone-${p.tone} ${p.done ? 'done' : ''}`} onClick={() => clickable && start(p)} style={{ ...(!clickable ? { cursor: 'default' } : {}), ...(!canMove ? { paddingBottom: 14 } : {}) }}>
                <div className="icon"><I /></div>
                <div className="grow">
                  <h3>{p.label}</h3>
                  <p className="muted small">{p.done ? 'Done' : p.missed ? 'Missed · tap to log it' : p.tone === 'rest' ? 'Recover' : isToday ? 'Tap to start' : 'Scheduled · tap to do it today'}</p>
                </div>
                {p.done ? <span className="check"><Icon.Check /></span> : clickable && <span className="chev"><Icon.Chevron /></span>}
              </button>
              {canMove && <button className="move-btn" onClick={() => setMoving(p)}><Icon.Move />Move</button>}
            </div>
          )
        })}
        {moving && <MoveSheet date={date} slot={moving.slot} label={moving.label} notify={notify} onClose={() => setMoving(null)} />}
        {editing && <DaySheet date={date} onClose={() => setEditing(false)} />}
        {!plan.length && <div className="card flat empty">Nothing scheduled.</div>}
      </section>

      <section className="stack">
        <div className="section-label">Logged</div>
        {entries.map((x) => <EntryCard key={x.kind + x.id} x={x} showDate={false} onDelete={() => confirm('Delete this entry?') && remove(x.kind, x.id)} />)}
        {food.calories > 0 && (
          <div className="card">
            <div className="row between">
              <div className="row"><span className="icon-btn" style={{ border: 0, background: 'var(--copper-soft)', color: 'var(--copper)' }}><Icon.Food /></span><h3>Food</h3></div>
              <b className="num">{Math.round(food.calories).toLocaleString()} cal</b>
            </div>
            <p className="muted small num" style={{ marginTop: 6 }}>Protein {Math.round(food.protein)} g · Carbs {Math.round(food.carbs)} g · Fat {Math.round(food.fat)} g</p>
          </div>
        )}
        {!entries.length && !food.calories && <div className="card flat empty">Nothing logged{date > today ? ' yet' : ''}.</div>}
      </section>
    </>
  )
}

// ---------- Week ----------
function WeekView({ date, setDate, goDay }) {
  const { state } = useStore()
  const mon = mondayOf(date)
  const days = datesBetween(mon, 7)
  const today = todayStr()
  const plan = planFor(state, days)
  const planned = days.flatMap((d) => plan[d]).filter((p) => p.tone !== 'rest')
  const done = planned.filter((p) => p.done).length

  return (
    <>
      <Nav label={`${fmtDate(mon)} to ${fmtDate(addDays(mon, 6))}`} onPrev={() => setDate(addDays(mon, -7))} onNext={() => setDate(addDays(mon, 7))} />
      <div className="card flat">
        <div className="row between small"><span className="muted">Week completion</span><b className="num">{done} / {planned.length}</b></div>
        <div className="bar light" style={{ marginTop: 8 }}><span style={{ width: `${planned.length ? (done / planned.length) * 100 : 0}%` }} /></div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {days.map((d) => {
          const p = plan[d]
          const lift = state.lifts.find((l) => l.date === d)
          const runs = state.runs.filter((r) => r.date === d)
          const food = dayTotals(state.meals, d)
          const w = state.weights.find((x) => x.date === d)
          const details = [
            lift && `${FOCUSES[lift.focus]?.name || lift.title || 'Lift'} ${lift.durationMin}m`,
            ...runs.map((r) => `${RUN_TYPES[r.type]?.short} ${r.minutes}m${r.distance ? ` ${r.distance}mi` : ''}`),
            w && `${w.weight} lb`,
            food.calories > 0 && `${Math.round(food.calories)} cal`,
          ].filter(Boolean)
          return (
            <button key={d} className={`wk-row ${d === today ? 'today' : ''}`} onClick={() => goDay(d)}>
              <div className="wk-date"><span>{WEEKDAYS[(parseDate(d).getDay() + 6) % 7]}</span><b>{parseDate(d).getDate()}</b></div>
              <div className="grow stack" style={{ gap: 6 }}>
                <div className="chips">
                  {p.map((x) => (
                    <span key={x.slot} className={`chip ${x.tone} ${x.done || x.tone === 'rest' ? 'on' : ''} ${x.missed ? 'missed' : ''}`}>
                      {x.done && '✓ '}{x.label}
                    </span>
                  ))}
                </div>
                {details.length > 0 && <p className="muted tiny">{details.join(' · ')}</p>}
              </div>
              <span className="chev"><Icon.Chevron /></span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ---------- Month ----------
function MonthView({ date, setDate, goDay }) {
  const { state } = useStore()
  const d = parseDate(date)
  const first = todayStr(new Date(d.getFullYear(), d.getMonth(), 1))
  const gridStart = mondayOf(first)
  const cells = datesBetween(gridStart, 42)
  const today = todayStr()
  const plan = planFor(state, cells)
  const month = d.getMonth()
  const shiftMonth = (n) => setDate(todayStr(new Date(d.getFullYear(), d.getMonth() + n, 1)))

  // only show the 6th row if the month actually needs it
  const rows = cells.slice(35).some((c) => parseDate(c).getMonth() === month) ? 6 : 5

  return (
    <>
      <Nav label={d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
      <div className="card" style={{ padding: 10 }}>
        <div className="month">
          {WEEKDAYS.map((w) => <div key={w} className="month-h">{w[0]}</div>)}
          {cells.slice(0, rows * 7).map((c) => {
            const cd = parseDate(c)
            const p = (plan[c] || []).filter((x) => x.tone !== 'rest')
            const out = cd.getMonth() !== month
            return (
              <button key={c} className={`month-cell ${out ? 'out' : ''} ${c === today ? 'today' : ''} ${c === date ? 'sel' : ''}`} onClick={() => goDay(c)}>
                <span>{cd.getDate()}</span>
                <div className="dots">
                  {p.map((x) => <i key={x.slot} className={`dot ${x.done ? x.tone : 'hollow'}`} />)}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="legend" style={{ justifyContent: 'center' }}>
        <span><i className="dotkey" style={{ background: 'var(--copper)' }} />Lift</span>
        <span><i className="dotkey" style={{ background: 'var(--run)' }} />Run</span>
        <span><i className="dotkey" style={{ background: 'var(--mobility)' }} />Mobility</span>
        <span><i className="dotkey" style={{ boxShadow: 'inset 0 0 0 1.5px var(--muted)' }} />Planned</span>
      </div>
    </>
  )
}
