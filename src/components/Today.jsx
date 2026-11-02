import { useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { MoveSheet, DaySheet } from './PlanSheets.jsx'
import { ExerciseImage } from './ExerciseVisual.jsx'
import { FOCUSES, RUN_TYPES, SLOTS, DAY_NAMES } from '../lib/program.js'
import { nextFocus, runRecommendation, intervalLabel, intervalMinutes } from '../lib/progression.js'
import { todayStr, weightSummary, DAY, fmtDate } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { computeTargets, dayTotals } from '../lib/nutrition.js'
import { planFor, datesBetween, addDays, slotsFor, isOverridden } from '../lib/plan.js'
import { workoutSummary, planProgress } from '../lib/runplans.js'
import { parseDate } from '../lib/stats.js'
import { EXERCISES } from '../lib/program.js'
import { buildSession } from '../lib/progression.js'
import { sessionMinutes } from '../lib/builder.js'
import { recovery } from '../lib/recovery.js'
import { prepSession } from '../lib/training.js'
import BodyMap from './BodyMap.jsx'

// Today's lift as a full preview: every exercise with its target, time estimate, and the muscles it hits
function WorkoutHero({ session, title, resume, onStart, onMove, onChange }) {
  const muscles = [...new Set(session.exercises.map((e) => EXERCISES[e.id]?.muscle).filter(Boolean))]
  const doneSets = session.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0)
  return (
    <div className="card workout-hero">
      <div className="wh-top">
        <div className="grow">
          <p className="eyebrow" style={{ color: 'var(--copper)' }}>{resume ? 'In progress' : "Today's workout"}{session.deload ? ' · Deload week' : ''}</p>
          <h2 className="wh-title">{title}</h2>
          <p className="muted small">{session.exercises.length} exercises · about {sessionMinutes(session.exercises)} min{resume ? ` · ${doneSets} sets done` : ''}</p>
        </div>
        <div className="wh-map"><BodyMap muscles={muscles} /></div>
      </div>
      <div className="wh-list">
        {session.exercises.map((e) => {
          const ex = EXERCISES[e.id]
          return (
            <div key={e.id} className="wh-row">
              <ExerciseImage id={e.id} size={44} still />
              <div className="grow">
                <p className="wh-name">{ex.name}</p>
                <p className="muted tiny num">{e.sets.length} × {ex.reps[0]}–{ex.reps[1]}{ex.kind === 'weight' ? ` · ${e.rec.weight} lb` : ex.kind === 'time' ? ' sec' : ' reps'}</p>
              </div>
            </div>
          )
        })}
      </div>
      <button className="btn primary block" onClick={onStart}>{resume ? 'Resume workout' : 'Start workout'}</button>
      <div className="row between" style={{ marginTop: 8 }}>
        <button className="btn sm ghost" onClick={onChange}>Pick different muscles</button>
        {onMove && <button className="btn sm ghost" onClick={onMove}><Icon.Move />Move</button>}
      </div>
    </div>
  )
}

function RecoveryCard({ lifts }) {
  const rec = recovery(lifts)
  const fatigue = Object.fromEntries(Object.entries(rec).map(([m, v]) => [m, 1 - v]))
  const tired = Object.entries(rec).filter(([, v]) => v < 0.95).sort((a, b) => a[1] - b[1])
  const fresh = Object.entries(rec).filter(([, v]) => v >= 0.95).map(([m]) => m)
  return (
    <div className="card recovery">
      <div className="rc-map"><BodyMap heat={fatigue} /></div>
      <div className="grow stack" style={{ gap: 8 }}>
        <h3>Muscle recovery</h3>
        {tired.length ? (
          <div className="rc-list">
            {tired.slice(0, 4).map(([m, v]) => (
              <div key={m} className="rc-item">
                <span className="small">{m.replace('Hamstrings & Glutes', 'Hams & Glutes')}</span>
                <div className="bar light"><span style={{ width: `${Math.round(v * 100)}%` }} /></div>
                <span className="tiny muted num">{Math.round(v * 100)}%</span>
              </div>
            ))}
          </div>
        ) : <p className="muted small">Everything is fresh. Go train anything.</p>}
        {tired.length > 0 && fresh.length > 0 && <p className="muted tiny">Fresh: {fresh.slice(0, 4).join(', ').replace('Hamstrings & Glutes', 'Hams & Glutes')}</p>}
      </div>
    </div>
  )
}

const slotIcon = { lift: Icon.Dumbbell, run: Icon.Run, mobility: Icon.Stretch, rest: Icon.Bed }

function weekDates(offset = 0) {
  const now = new Date(Date.now() + offset * 7 * DAY)
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY))
}

export default function Today({ open, toggleTheme, dark, goTab, goDay, notify }) {
  const { state } = useStore()
  const [moving, setMoving] = useState(null)
  const [editing, setEditing] = useState(false)
  const [weekOff, setWeekOff] = useState(0)
  const swipe = useRef(null)
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

  // Open an upcoming session. Doing it now, so it logs today.
  const goPlanned = (x) => {
    if (x.tone === 'lift') open({ type: 'lift', focus: x.focus, date: today })
    else if (x.tone === 'run' && x.workout) open({ type: 'runworkout', planId: state.runPlan.id, workoutId: x.workout.id, date: today })
    else if (x.tone === 'run') open({ type: 'run', runType: x.slot.slice(4), date: today })
    else if (x.tone === 'mobility') open({ type: 'mobility', date: today })
  }
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const renderSlot = (slot) => {
    if (slot === 'lift' && (draft || !didLift(today))) {
      const session = draft || prepSession(buildSession(nextKey, lifts), state)
      const f = FOCUSES[nextKey]
      return (
        <WorkoutHero key="lift" session={session} title={f ? f.name : draft?.title || 'Workout'} resume={!!draft}
          onStart={() => open({ type: 'lift' })} onChange={() => open({ type: 'build' })}
          onMove={draft ? null : () => setMoving({ slot: 'lift', label: f ? f.name : 'Strength' })} />
      )
    }
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

      <div className="week-wrap">
        <div className="row between week-head">
          <button className="icon-btn sm" onClick={() => setWeekOff(weekOff - 1)} aria-label="Previous week"><Icon.ChevronLeft /></button>
          <button className="small week-title" onClick={() => setWeekOff(0)}>
            {weekOff === 0 ? 'This week' : weekOff === 1 ? 'Next week' : weekOff === -1 ? 'Last week' : `${fmtDate(todayStr(weekDates(weekOff)[0]))} to ${fmtDate(todayStr(weekDates(weekOff)[6]))}`}
            {weekOff !== 0 && <span className="copper"> · Today</span>}
          </button>
          <button className="icon-btn sm" onClick={() => setWeekOff(weekOff + 1)} aria-label="Next week"><Icon.Chevron /></button>
        </div>
      <div className="week"
        onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY } }}
        onPointerUp={(e) => {
          const st = swipe.current; swipe.current = null
          if (!st) return
          const dx = e.clientX - st.x, dy = e.clientY - st.y
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { setWeekOff((w) => w + (dx < 0 ? 1 : -1)) }
        }}>
        {weekDates(weekOff).map((d) => {
          const ds = todayStr(d)
          const slots = slotsFor(state, ds)
          return (
            <button key={ds} className={`day ${ds === today ? 'today' : ''}`} onClick={() => goDay(ds)} aria-label={`Open ${DAY_NAMES[d.getDay()]} ${d.getDate()}`}>
              <span>{DAY_NAMES[d.getDay()]}</span>
              <b>{d.getDate()}</b>
              <div className="dots">
                {slots.filter((s) => s !== 'rest').map((s) => {
                  const tone = SLOTS[s].tone
                  const done = tone === 'lift' ? didLift(ds) : tone === 'run' ? didRun(ds) : didMob(ds)
                  return <i key={s} className={`dot ${done ? tone : 'hollow'}`} />
                })}
              </div>
            </button>
          )
        })}
      </div>
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

      <RecoveryCard lifts={lifts} />

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
                    x.tone === 'rest'
                      ? <span key={x.slot} className={`chip ${x.tone} on`} style={{ height: 26, display: 'inline-flex', alignItems: 'center', cursor: 'default' }}>{x.label}</span>
                      : <button key={x.slot} className={`chip ${x.tone} on up-link`} onClick={() => goPlanned(x)}>{x.label}<Icon.Chevron /></button>
                  )) : <span className="muted small">Open day</span>}
                </div>
              </div>
            ))
          })()}
        </div>
      </section>

      <section className="stack">
        <div className="section-label">Today so far</div>
        <div className="card day-summary">
          {(() => {
            const plan = planFor(state, [today])[today].filter((p) => p.tone !== 'rest')
            const liftLog = lifts.find((l) => l.date === today)
            const runLog = runs.filter((r) => r.date === today)
            const w = weights.find((x) => x.date === today)
            const doneCount = plan.filter((p) => p.done).length
            return (
              <>
                <div className="ds-row">
                  <span className="ds-icon"><Icon.Dumbbell /></span>
                  <div className="grow">
                    <p className="ds-label">Training</p>
                    <p className="muted small">
                      {plan.length ? plan.map((p) => `${p.label}${p.done ? ' ✓' : ''}`).join(' · ') : 'Rest day'}
                    </p>
                  </div>
                  <b className="num">{plan.length ? `${doneCount}/${plan.length}` : '—'}</b>
                </div>
                {(liftLog || runLog.length > 0) && (
                  <p className="muted tiny ds-sub num">
                    {[liftLog && `Lifted ${liftLog.durationMin} min · ${liftLog.exercises.reduce((t, e) => t + e.sets.length, 0)} sets`, ...runLog.map((r) => `Ran ${r.minutes} min${r.distance ? ` · ${r.distance} mi` : ''}`)].filter(Boolean).join('  ·  ')}
                  </p>
                )}
                <button className="ds-row" onClick={() => goTab('food')}>
                  <span className="ds-icon"><Icon.Food /></span>
                  <div className="grow">
                    <p className="ds-label">Calories</p>
                    <div className="bar light"><span style={{ width: `${Math.min(100, (eaten.calories / targets.calories) * 100)}%`, background: calLeft < 0 ? 'var(--warn)' : undefined }} /></div>
                  </div>
                  <b className="num">{Math.round(eaten.calories).toLocaleString()}<span className="muted small"> / {targets.calories.toLocaleString()}</span></b>
                </button>
                <button className="ds-row" onClick={() => goTab('food')}>
                  <span className="ds-icon"><Icon.Flame /></span>
                  <div className="grow">
                    <p className="ds-label">Protein</p>
                    <div className="bar light"><span style={{ width: `${Math.min(100, (eaten.protein / targets.protein) * 100)}%`, background: 'var(--good)' }} /></div>
                  </div>
                  <b className="num">{Math.round(eaten.protein)}<span className="muted small"> / {targets.protein} g</span></b>
                </button>
                <button className="ds-row" onClick={() => open({ type: 'weigh' })}>
                  <span className="ds-icon"><Icon.Scale /></span>
                  <div className="grow"><p className="ds-label">Weigh-in</p></div>
                  {w ? <b className="num">{w.weight} lb</b> : <span className="copper small">Log weight</span>}
                </button>
              </>
            )
          })()}
        </div>
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
