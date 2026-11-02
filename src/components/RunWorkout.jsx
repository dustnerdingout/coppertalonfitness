import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { RUN_PLANS, STEP_LABEL, flattenSteps, fmtClock, workoutSummary, findWorkout, planProgress } from '../lib/runplans.js'
import { Icon } from './Icons.jsx'

// ---------- Workout detail ----------
export default function RunWorkout({ planId, workoutId, onClose, onLog, onPlay }) {
  const { state } = useStore()
  const [id, setId] = useState(workoutId)
  const plan = RUN_PLANS[planId]
  const w = findWorkout(planId, id)
  const pp = planProgress(state)
  if (!w) return null
  let n = 0

  const renderStep = (s, key) => {
    n += 1
    return (
      <div key={key} className={`rstep ${s.kind}`}>
        <div className="rstep-body">
          <h3>{n} {STEP_LABEL[s.kind]}</h3>
          <p className="muted">{s.sec ? <><Icon.Clock />{fmtClock(s.sec)}</> : <><Icon.Route />{s.mi} mi</>}</p>
          {s.cadence && <p className="muted">Cadence | {s.cadence[0]}–{s.cadence[1]}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">{plan.source} · {plan.name} · Week {w.week}</div>
          <h1>{w.name}</h1>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon.X /></button>
      </header>

      <div className="stack" style={{ gap: 6 }}>
        <p className="run-total num">{w.minutes ? fmtClock(w.minutes * 60) : `${w.km} km`}</p>
        <p className="muted small">{workoutSummary(w)}</p>
        <p style={{ marginTop: 6 }}>{w.desc}</p>
      </div>

      {w.steps ? (
        <section className="stack">
          {w.steps.map((s, i) =>
            s.repeat ? (
              <div key={i} className="rrepeat">
                <p className="rrepeat-label">Repeat {s.repeat} Times</p>
                <div className="stack" style={{ gap: 10 }}>{s.steps.map((x, j) => renderStep(x, `${i}-${j}`))}</div>
              </div>
            ) : renderStep(s, i)
          )}
        </section>
      ) : (
        <div className="card stack">
          <h3>Step details not loaded yet</h3>
          <p className="muted small">
            This workout is {workoutSummary(w)}. The exact warm up, interval, and walk times aren't in the app yet,
            so the guided timer is off for it. Open it in COROS for the steps, and you can still log it here when you're done.
          </p>
        </div>
      )}

      <section className="stack">
        <div className="section-label">The plan</div>
        <div className="card" style={{ padding: '6px 16px' }}>
          {Array.from({ length: plan.weeks }, (_, i) => i + 1).map((wk) => (
            <div key={wk} className="plan-week">
              <p className="muted tiny">Week {wk}</p>
              {plan.workouts.filter((x) => x.week === wk).map((x) => {
                const done = pp?.doneIds.has(x.id)
                const isNext = pp?.next?.id === x.id
                return (
                  <button key={x.id} className={`plan-row ${x.id === id ? 'sel' : ''}`} onClick={() => { setId(x.id); window.scrollTo(0, 0) }}>
                    <span className={`plan-dot ${done ? 'done' : isNext ? 'next' : ''}`}>{done && <Icon.Check />}</span>
                    <span className="grow">{x.name}</span>
                    <span className="muted small num">{x.minutes ? `${x.minutes} min` : `${x.km} km`}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      <div className="sticky-bar">
        <div>
          <button className="btn grow" onClick={() => onLog(w.id)}>Log run</button>
          {w.steps && <button className="btn run grow" onClick={() => onPlay(w.id)}><Icon.Play />Start guided run</button>}
        </div>
      </div>
    </div>
  )
}

// ---------- Guided player ----------
// Counts down each step, beeps and vibrates on changes, and can tick a cadence metronome.
function useMetronome(bpm, on) {
  const ctx = useRef(null)
  useEffect(() => {
    if (!on || !bpm) return
    ctx.current ||= new (window.AudioContext || window.webkitAudioContext)()
    const ac = ctx.current
    ac.resume?.()
    let next = ac.currentTime + 0.05
    const interval = 60 / bpm
    const t = setInterval(() => {
      while (next < ac.currentTime + 0.12) {
        const o = ac.createOscillator(), g = ac.createGain()
        o.frequency.value = 1400
        g.gain.setValueAtTime(0.25, next)
        g.gain.exponentialRampToValueAtTime(0.001, next + 0.03)
        o.connect(g).connect(ac.destination)
        o.start(next); o.stop(next + 0.04)
        next += interval
      }
    }, 25)
    return () => clearInterval(t)
  }, [bpm, on])
  return ctx
}

function beep(ctxRef, times = 2) {
  try {
    ctxRef.current ||= new (window.AudioContext || window.webkitAudioContext)()
    const ac = ctxRef.current
    for (let i = 0; i < times; i++) {
      const at = ac.currentTime + i * 0.18
      const o = ac.createOscillator(), g = ac.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.35, at)
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.14)
      o.connect(g).connect(ac.destination)
      o.start(at); o.stop(at + 0.15)
    }
  } catch { /* audio unavailable */ }
  navigator.vibrate?.([180, 80, 180])
}

export function RunPlayer({ planId, workoutId, onClose, onDone }) {
  const w = findWorkout(planId, workoutId)
  const steps = flattenSteps(w?.steps)
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [metro, setMetro] = useState(true)
  const [now, setNow] = useState(Date.now())
  const stepStart = useRef(Date.now())
  const pausedAt = useRef(null)
  const startedAt = useRef(Date.now())
  const pausedTotal = useRef(0)
  const finished = idx >= steps.length
  const step = steps[idx]
  const bpm = step?.cadence && !paused ? Math.round((step.cadence[0] + step.cadence[1]) / 2) : 0
  const audio = useMetronome(bpm, metro)

  // keep the screen awake during the run
  useEffect(() => {
    let lock
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release?.() }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const elapsedStep = paused ? (pausedAt.current - stepStart.current) / 1000 : (now - stepStart.current) / 1000
  const remaining = step?.sec ? step.sec - elapsedStep : null

  const advance = () => {
    beep(audio)
    stepStart.current = Date.now()
    setIdx((i) => i + 1)
  }
  useEffect(() => { if (!paused && remaining != null && remaining <= 0) advance() })

  const togglePause = () => {
    if (paused) {
      const gap = Date.now() - pausedAt.current
      stepStart.current += gap
      pausedTotal.current += gap
      setPaused(false)
    } else {
      pausedAt.current = Date.now()
      setPaused(true)
    }
  }

  const totalSec = steps.reduce((t, s) => t + (s.sec || 0), 0)
  const doneSec = steps.slice(0, idx).reduce((t, s) => t + (s.sec || 0), 0) + Math.min(elapsedStep, step?.sec || 0)
  const activeMin = () => Math.max(1, Math.round((Date.now() - startedAt.current - pausedTotal.current) / 60000))
  const nextStep = steps[idx + 1]

  if (!w) return null

  return (
    <div className={`player ${step?.kind || 'done'}`}>
      <div className="player-top">
        <button className="icon-btn" onClick={() => confirm('End this run?') && onClose()} aria-label="End run"><Icon.X /></button>
        <p className="small">{w.name}</p>
        <button className={`icon-btn ${metro ? 'on' : ''}`} onClick={() => setMetro((m) => !m)} aria-label="Toggle cadence metronome"><Icon.Metronome /></button>
      </div>

      {!finished ? (
        <div className="player-main">
          <p className="player-kind">{STEP_LABEL[step.kind]}{step.rounds ? ` · ${step.round} of ${step.rounds}` : ''}</p>
          <p className="player-clock num">{remaining != null ? fmtClock(remaining) : `${step.mi} mi`}</p>
          {step.cadence && <p className="player-cad">Cadence {step.cadence[0]}–{step.cadence[1]} spm{metro ? ` · metronome ${bpm || Math.round((step.cadence[0] + step.cadence[1]) / 2)}` : ''}</p>}
          {step.kind === 'rest' && <p className="player-cad">Walk it out. Breathe deep.</p>}
          {remaining == null && <p className="player-cad">{fmtClock(elapsedStep)} so far. Tap Done when you finish the distance.</p>}
          <p className="player-next">{nextStep ? `Next: ${STEP_LABEL[nextStep.kind]} ${nextStep.sec ? fmtClock(nextStep.sec) : `${nextStep.mi} mi`}` : 'Last step'}</p>
        </div>
      ) : (
        <div className="player-main">
          <p className="player-kind">Done</p>
          <p className="player-clock">Nice run.</p>
          <p className="player-cad">{activeMin()} minutes. Log it so the plan moves forward.</p>
        </div>
      )}

      <div className="player-bottom">
        <div className="player-bar"><span style={{ width: `${totalSec ? Math.min(100, (doneSec / totalSec) * 100) : 0}%` }} /></div>
        <div className="row between small num" style={{ opacity: 0.75 }}>
          <span>{fmtClock(doneSec)}</span><span>{fmtClock(totalSec)}</span>
        </div>
        {!finished ? (
          <div className="row" style={{ gap: 12 }}>
            <button className="btn player-btn grow" onClick={togglePause}>{paused ? <><Icon.Play />Resume</> : <><Icon.Pause />Pause</>}</button>
            <button className="btn player-btn grow" onClick={advance}>{remaining == null ? 'Done' : 'Skip'}<Icon.Chevron /></button>
          </div>
        ) : (
          <button className="btn player-btn solid block" onClick={() => onDone(activeMin())}><Icon.Check />Log this run</button>
        )}
      </div>
    </div>
  )
}
