import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { MoveSheet, DaySheet } from './PlanSheets.jsx'
import { ExerciseImage } from './ExerciseVisual.jsx'
import { FOCUSES, RUN_TYPES, SLOTS, DAY_NAMES } from '../lib/program.js'
import { nextFocus, runRecommendation, intervalLabel, intervalMinutes } from '../lib/progression.js'
import { todayStr, weightSummary, DAY } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { computeTargets, dayTotals } from '../lib/nutrition.js'
import { planFor, datesBetween, addDays, slotsFor, isOverridden } from '../lib/plan.js'
import { workoutSummary, planProgress } from '../lib/runplans.js'
import { parseDate } from '../lib/stats.js'

const slotIcon = { lift: Icon.Dumbbell, run: Icon.Run, mobility: Icon.Stretch, rest: Icon.Bed }

function weekDates() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY))
}

export default function Today({ open, toggleTheme, dark, goTab, notify }) {
  const { state } = useStore()
  const [moving, setMoving] = useState(null)
  const [editing, setEditing] = useState(false)
  const { profile, lifts, runs, mobility, weights, draft } = state
  const today = todayStr()
  const dow = new Date().getDay()
  const todaySlots = slotsFor(state, today)
  const todayPlan = planFor(state, [today])[today]
  const planName = planProgress(state)?.plan.name
  const ws = weightSummary(profile, weights)
  const targets = computeTargets(profile, ws.current)
  const eaten = dayTotals(state.meals, today)
  const calLeft = targets.calories - eaten.calories

  const didLift = (d) => lifts.some((l) => l.date === d)
  const didRun = (d, type) => runs.some((r) => r.date === d && (!type || r.type === type))
  const didMob = (d) => mobility.some((m) => m.date === d)

  const week = weekDates().map((d) => todayStr(d))
  const inWeek = (arr) => arr.filter((x) => week.includes(x.date)).length

  const nextKey = draft ? draft.focus : nextFocus(lifts, state.rotation)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const renderSlot = (slot) => {
    const tone = SLOTS[slot].tone
    const I = slotIcon[tone]
    let title, sub, done, onClick

    if (slot === 'lift') {
      const f = FOCUSES[nextKey] || { name: draft?.title || 'Workout', slots: draft?.exercises || [] }
      title = draft ? `Resume ${f.name}` : f.name
      sub = draft ? 'Workout in progress' : `Strength · ${f.slots.length} exercises`
      done = !draft && didLift(today)
      onClick = () => open({ type: 'lift' })
    } else if (slot.startsWith('run-')) {
      const type = slot.slice(4)
      const pw = todayPlan.find((p) => p.slot === slot)?.workout
      if (pw) {
        title = pw.name
        sub = `${planName} · Week ${pw.week} · ${workoutSummary(pw)}`
        done = false
        onClick = () => open({ type: 'runworkout', planId: state.runPlan.id, workoutId: pw.id })
      } else {
        const rec = runRecommendation(type, runs)
        title = RUN_TYPES[type].name
        sub = type === 'intervals' ? `${intervalLabel(rec)} · ~${intervalMinutes(rec)} min` : `${rec.minutes} min target`
        done = didRun(today, type) || (!!state.runPlan && didRun(today))
        onClick = () => open({ type: 'run', runType: type })
      }
    } else if (slot === 'mobility') {
      title = 'Mobility'
      sub = 'Active recovery · about 20 min'
      done = didMob(today)
      onClick = () => open({ type: 'mobility' })
    } else {
      title = 'Full Rest'
      sub = 'Recovery is where you get stronger. Walk, hydrate, sleep.'
      done = false
      onClick = null
    }

    const canMove = !done && slot !== 'rest' && !(slot === 'lift' && draft)
    return (
      <div key={slot} className="slot-wrap">
        <button className={`session tone-${tone} ${done ? 'done' : ''}`} onClick={onClick || undefined} style={{ ...(!onClick ? { cursor: 'default' } : {}), ...(!canMove ? { paddingBottom: 14 } : {}) }}>
          <div className="icon"><I /></div>
          <div className="grow">
            <h3>{title}</h3>
            <p className="muted small">{sub}</p>
          </div>
          {done ? <span className="check"><Icon.Check /></span> : onClick && <span className="chev"><Icon.Chevron /></span>}
        </button>
        {canMove && (
          <button className="move-btn" onClick={() => setMoving({ slot, label: title })} aria-label={`Move ${title}`}>
            <Icon.Move />Move
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>{greet}{profile.name ? `, ${profile.name}` : ''}</h1>
        </div>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{dark ? <Icon.Sun /> : <Icon.Moon />}</button>
      </header>

      <div className="card hero">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div>
            <p className="muted small">Current trend weight</p>
            <div className="hero-num num">{ws.current}<span className="hero-unit">lb</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="muted small">Lost so far</p>
            <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700 }} className="num">{ws.lost > 0 ? ws.lost : 0} lb</div>
          </div>
        </div>
        <div className="bar" style={{ margin: '16px 0 8px' }}><span style={{ width: `${ws.pct}%` }} /></div>
        <div className="row between small">
          <span className="muted">{Math.round(ws.pct)}% to goal</span>
          <span className="muted">{ws.toGo} lb to {ws.goal}</span>
        </div>
      </div>

      <div className="week">
        {weekDates().map((d) => {
          const ds = todayStr(d)
          const slots = slotsFor(state, ds)
          return (
            <div key={ds} className={`day ${ds === today ? 'today' : ''}`}>
              <span>{DAY_NAMES[d.getDay()]}</span>
              <b>{d.getDate()}</b>
              <div className="dots">
                {slots.filter((s) => s !== 'rest').map((s) => {
                  const tone = SLOTS[s].tone
                  const done = tone === 'lift' ? didLift(ds) : tone === 'run' ? didRun(ds) : didMob(ds)
                  return <i key={s} className={`dot ${done ? tone : 'hollow'}`} />
                })}
              </div>
            </div>
          )
        })}
      </div>

      <section className="stack">
        <div className="row between" style={{ margin: '8px 2px -4px' }}>
          <div className="section-label" style={{ margin: 0 }}>Today · {DAY_NAMES[dow]}{isOverridden(state, today) ? ' · changed' : ''}</div>
          <button className="btn sm ghost" onClick={() => setEditing(true)}>Edit today</button>
        </div>
        {todaySlots.length ? todaySlots.map(renderSlot) : <div className="card flat empty">Nothing scheduled.</div>}
      </section>
      {moving && <MoveSheet date={today} slot={moving.slot} label={moving.label} notify={notify} onClose={() => setMoving(null)} />}
      {editing && <DaySheet date={today} onClose={() => setEditing(false)} />}

      <button className="build-card" onClick={() => open({ type: 'build' })}>
        <div className="build-imgs">
          <ExerciseImage id="inclineDb" size={64} />
          <ExerciseImage id="cableRow" size={64} />
          <ExerciseImage id="lateralRaise" size={64} />
        </div>
        <div className="grow">
          <h3>Build a workout</h3>
          <p className="muted small">Pick muscles, get a 45 or 60 minute session</p>
        </div>
        <span className="chev"><Icon.Chevron /></span>
      </button>

      <section className="stack">
        <div className="row between" style={{ margin: '8px 2px -4px' }}>
          <div className="section-label" style={{ margin: 0 }}>Coming up</div>
          <button className="btn sm ghost" onClick={() => goTab('calendar')}>Calendar</button>
        </div>
        <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {(() => {
            const days = datesBetween(addDays(today, 1), 6)
            const plan = planFor(state, days)
            return days.map((d) => (
              <div className="upcoming" key={d}>
                <div className="wk-date"><span>{DAY_NAMES[parseDate(d).getDay()]}</span><b>{parseDate(d).getDate()}</b></div>
                <div className="chips grow">
                  {plan[d].length ? plan[d].map((x) => (
                    <span key={x.slot} className={`chip ${x.tone} on`} style={{ height: 26, display: 'inline-flex', alignItems: 'center', cursor: 'default' }}>{x.label}</span>
                  )) : <span className="muted small">Open day</span>}
                </div>
              </div>
            ))
          })()}
        </div>
      </section>

      <section className="stack">
        <div className="section-label">Fuel</div>
        <button className="card session" style={{ display: 'block', boxShadow: 'none' }} onClick={() => goTab('food')}>
          <div className="row between">
            <div>
              <p className="muted small">{calLeft >= 0 ? 'Calories left' : 'Over target'}</p>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700 }} className="num">{Math.abs(calLeft).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="muted small">Protein</p>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700 }} className="num">{Math.round(eaten.protein)}<span className="muted small"> / {targets.protein} g</span></div>
            </div>
          </div>
          <div className="bar light" style={{ marginTop: 10 }}><span style={{ width: `${Math.min(100, (eaten.protein / targets.protein) * 100)}%` }} /></div>
        </button>
      </section>

      <section className="stack">
        <div className="section-label">This week</div>
        <div className="stats">
          <div className="stat"><div className="label">Strength</div><div className="value num">{inWeek(lifts)}<small>/3</small></div></div>
          <div className="stat"><div className="label">Runs</div><div className="value num">{inWeek(runs)}<small>/3</small></div></div>
          <div className="stat"><div className="label">Mobility</div><div className="value num">{inWeek(mobility)}<small>/1</small></div></div>
        </div>
      </section>

      <section className="stack">
        <div className="section-label">Log anything</div>
        <div className="quick">
          <button onClick={() => open({ type: 'lift' })}><Icon.Dumbbell />Lift</button>
          <button onClick={() => open({ type: 'run', runType: 'easy' })}><Icon.Run />Run</button>
          <button onClick={() => goTab('food')}><Icon.Food />Meal</button>
          <button onClick={() => open({ type: 'weigh' })}><Icon.Scale />Weigh in</button>
        </div>
      </section>
    </div>
  )
}
