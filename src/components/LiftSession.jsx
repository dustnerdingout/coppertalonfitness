import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { EXERCISES, FOCUSES, MUSCLES } from '../lib/program.js'
import { buildSession, nextFocus, recommend, exerciseHistory, swapOptions, swapExercise, shuffleSession, makeExercise } from '../lib/progression.js'
import { todayStr, fmtDate } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Badge, Sheet } from './ui.jsx'
import { ExerciseImage, ExerciseInfo } from './ExerciseVisual.jsx'
import { buildCustom } from '../lib/builder.js'
import { fmtClock } from '../lib/runplans.js'
import { warmupSets, plateMath, isBarbell } from '../lib/warmup.js'
import { prepSession, workoutSettings, restFor, SET_TYPES, nextSetType, deloadExercise } from '../lib/training.js'
import { ExerciseHistory, WorkoutSettingsSheet } from './TrainingSheets.jsx'

// Short double beep and a buzz when rest is over
function restDone(opts = { sound: true, vibrate: true }) {
  if (opts.sound) try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    for (let i = 0; i < 2; i++) {
      const at = ac.currentTime + i * 0.2, o = ac.createOscillator(), g = ac.createGain()
      o.frequency.value = 880; g.gain.setValueAtTime(0.3, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.15)
      o.connect(g).connect(ac.destination); o.start(at); o.stop(at + 0.16)
    }
  } catch { /* no audio */ }
  if (opts.vibrate) navigator.vibrate?.([200, 100, 200])
}

const unitOf = (ex) => (ex.kind === 'time' ? 'sec' : 'reps')

export default function LiftSession({ onClose, notify, onBuild, initialFocus = null, logDate = null }) {
  const { state, update, add } = useStore()
  const { draft, lifts, rotation } = state
  const [summary, setSummary] = useState(null)
  const [swapIdx, setSwapIdx] = useState(null)
  const [adding, setAdding] = useState(false)
  const [info, setInfo] = useState(null)
  const [histId, setHistId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [rest, setRest] = useState(null) // { end, total }
  const beeped = useRef(false)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t) }, [])
  const startRest = (id) => { if (!workoutSettings(state).restAuto) return; beeped.current = false; const sec = restFor(state, id); setRest({ end: Date.now() + sec * 1000, total: sec }) }
  useEffect(() => {
    if (!rest || beeped.current || now < rest.end) return
    beeped.current = true
    restDone(workoutSettings(state))
    const t = setTimeout(() => setRest((r) => (r && Date.now() - r.end > 4000 ? null : r)), 5000)
    return () => clearTimeout(t)
  }, [now, rest])

  // Start a session if there isn't one in progress. Opened from a planned day, use that day's focus and date.
  useEffect(() => {
    if (summary) return
    update((s) => {
      const d = s.draft
      const started = d && d.exercises.some((e) => e.sets.some((x) => x.done))
      if (d && (started || !initialFocus || d.focus === initialFocus)) {
        return !started && (d.date || null) !== (logDate || null) ? { draft: { ...d, date: logDate || undefined } } : {}
      }
      const fresh = prepSession(buildSession(initialFocus || nextFocus(s.lifts, s.rotation), s.lifts), s)
      return { draft: logDate ? { ...fresh, date: logDate } : fresh }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!draft && !summary) update((s) => (s.draft ? {} : { draft: prepSession(buildSession(nextFocus(s.lifts, s.rotation), s.lifts), s) }))
  }, [draft, summary, update])

  if (summary) return <Summary summary={summary} onClose={onClose} />
  if (!draft) return null

  const isCustom = draft.focus === 'custom'
  const focus = FOCUSES[draft.focus] || { name: draft.title || 'Custom workout' }
  const anyDone = draft.exercises.some((e) => e.sets.some((s) => s.done))
  const setDraft = (fn) => update((s) => ({ draft: fn(s.draft) }))

  const setField = (ei, si, patch) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((st, j) => (j !== si ? st : { ...st, ...patch })) }
      ),
    }))

  const toggleDone = (ei, si) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e
        const st = e.sets[si]
        const nowDone = !st.done
        return {
          ...e,
          sets: e.sets.map((x, j) => {
            if (j === si) return { ...x, done: nowDone, reps: nowDone && (x.reps === '' || x.reps == null) ? e.rec.reps : x.reps }
            // carry a changed weight forward to the sets you haven't done yet
            if (nowDone && j > si && !x.done) return { ...x, weight: st.weight }
            return x
          }),
        }
      }),
    }))
  }

  const addSet = (ei) => setDraft((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: [...e.sets, { weight: e.sets.at(-1)?.weight ?? e.rec.weight, reps: '', done: false }] })),
  }))

  const setExField = (ei, patch) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)) }))
  const toggleWarm = (ei, wi) => setDraft((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => {
      if (i !== ei) return e
      const cur = e.warmDone || []
      return { ...e, warmDone: cur.includes(wi) ? cur.filter((x) => x !== wi) : [...cur, wi] }
    }),
  }))

  // Superset: link an exercise with the next one. No rest between them, rest after the last one in the pair.
  const toggleSuperset = (ei) => setDraft((d) => {
    const ex = d.exercises
    const cur = ex[ei]
    if (cur.superset) {
      const g = cur.superset
      return { ...d, exercises: ex.map((e) => (e.superset === g ? { ...e, superset: undefined } : e)) }
    }
    const nxt = ex[ei + 1]
    if (!nxt) return d
    // join the next exercise's superset if it already has one, otherwise start a new pair
    const g = nxt.superset || 'ss' + Date.now().toString(36)
    return { ...d, exercises: ex.map((e, i) => (i === ei || i === ei + 1 ? { ...e, superset: g } : e)) }
  })
  // true when this exercise is in a superset and isn't the last one of its group, so no rest yet
  const restsInSuperset = (ei) => {
    const g = draft.exercises[ei].superset
    if (!g) return false
    const idx = draft.exercises.map((e, i) => (e.superset === g ? i : -1)).filter((i) => i >= 0)
    return ei !== idx.at(-1)
  }

  const removeExercise = (ei) => setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }))

  const switchFocus = (key) => {
    if (key === draft.focus) return
    if (anyDone && !confirm('Switch focus? Sets logged so far will be cleared.')) return
    update((s) => ({ draft: prepSession(buildSession(key, s.lifts), s) }))
  }

  const mixItUp = () => {
    if (anyDone && !confirm('Shuffle the accessory exercises? Sets on swapped exercises will be cleared.')) return
    setDraft((d) => {
      const next = isCustom ? { ...buildCustom(d.muscles, d.minutes || 60, lifts, { random: true }), startedAt: d.startedAt } : shuffleSession(d, lifts)
      // in a deload week, lighten only the exercises that changed
      return d.deload ? { ...next, deload: true, exercises: next.exercises.map((e) => (d.exercises.includes(e) ? e : deloadExercise(e))) } : next
    })
  }

  const discard = () => {
    if (anyDone && !confirm('Discard this workout?')) return
    update(() => ({ draft: null }))
    onClose()
  }

  const finish = () => {
    const exercises = draft.exercises
      .map((e) => ({
        id: e.id,
        ...(e.effort ? { effort: e.effort } : {}),
        sets: e.sets
          .filter((s) => s.done || Number(s.reps) > 0)
          .map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, ...(s.type && s.type !== 'normal' ? { type: s.type } : {}) }))
          .filter((s) => s.reps > 0),
      }))
      .filter((e) => e.sets.length)
    if (!exercises.length) {
      alert('Log at least one set first.')
      return
    }
    const entry = {
      date: draft.date || todayStr(),
      focus: draft.focus,
      ...(draft.deload ? { deload: true } : {}),
      ...(isCustom ? { title: draft.title, muscles: draft.muscles } : {}),
      durationMin: Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000)),
      exercises,
    }
    add('lifts', entry)
    const after = [...lifts, { ...entry, ts: Date.now(), id: 'tmp' }]
    setSummary({
      focus: draft.focus,
      duration: entry.durationMin,
      sets: exercises.reduce((s, e) => s + e.sets.length, 0),
      volume: exercises.reduce((s, e) => s + e.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0),
      next: exercises.map((e) => ({ id: e.id, rec: recommend(e.id, after) })),
      upNext: FOCUSES[nextFocus(after, rotation)].name,
    })
    update(() => ({ draft: null }))
    notify('Workout saved')
  }

  const wsSet = workoutSettings(state)
  const doneSets = draft.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0)
  const totalSets = draft.exercises.reduce((t, e) => t + e.sets.length, 0)
  const volume = draft.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).reduce((a, x) => a + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0)
  const elapsed = Math.max(0, Math.floor((now - draft.startedAt) / 1000))
  const restLeft = rest ? Math.ceil((rest.end - now) / 1000) : 0

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Strength{draft.date && draft.date !== todayStr() ? ` · logging for ${fmtDate(draft.date, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}</div>
          <h1>{focus.name}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Workout settings"><Icon.Gear /></button>
          <button className="icon-btn" onClick={onClose} aria-label="Minimize"><Icon.X /></button>
        </div>
      </header>

      <div className="ls-stats num">
        <div><span>Duration</span><b>{fmtClock(elapsed)}</b></div>
        <div><span>Volume</span><b>{volume.toLocaleString()} lb</b></div>
        <div><span>Sets</span><b>{doneSets} / {totalSets}</b></div>
      </div>

      {draft.deload && (
        <div className="deload-banner">
          <b>Deload week</b>
          <span className="small">About 10% lighter and one less set. Recover now, progress next week.</span>
        </div>
      )}

      <div className="stack" style={{ gap: 10 }}>
        <div className="chips scroll-x">
          <button className={`chip lg ${isCustom ? 'on lift' : ''}`} onClick={onBuild}><Icon.Plus />Pick muscles</button>
          {Object.entries(FOCUSES).map(([k, f]) => (
            <button key={k} className={`chip lg ${draft.focus === k ? 'on lift' : ''}`} onClick={() => switchFocus(k)}>{f.name}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 16 }}>
          <button className="btn sm ghost" onClick={mixItUp}><Icon.Shuffle />Shuffle</button>
          <button className="btn sm ghost" onClick={() => setAdding(true)}><Icon.Plus />Add exercise</button>
        </div>
      </div>

      {draft.exercises.map((e, ei) => {
        const ex = EXERCISES[e.id]
        const last = exerciseHistory(e.id, lifts)[0]
        const prev = last ? last.entry.sets : []
        const isWeight = ex.kind === 'weight'
        const isAnchor = e.slot != null && FOCUSES[draft.focus]?.slots[e.slot]?.anchor
        const allDone = e.sets.length > 0 && e.sets.every((x) => x.done)
        const wu = warmupSets(e.id, e.sets[0]?.weight || e.rec.weight)
        const bb = isBarbell(e.id)
        return (
          <div className={`card exercise ${allDone ? 'complete' : ''} ${e.superset ? 'in-ss' : ''} ${e.superset && draft.exercises[ei + 1]?.superset === e.superset ? 'ss-top' : ''} ${e.superset && draft.exercises[ei - 1]?.superset === e.superset ? 'ss-bottom' : ''}`} key={e.id + ei}>
            {e.superset && draft.exercises[ei - 1]?.superset !== e.superset && <p className="ss-label">Superset · no rest between</p>}
            <div className="ex-head">
              <button className="ex-thumb" onClick={() => setInfo(e.id)} aria-label={`How to do ${ex.name}`}>
                <ExerciseImage id={e.id} size={56} />
              </button>
              <div className="grow">
                <button className="ex-name-btn" onClick={() => setHistId(e.id)}><h3 className="ex-name">{ex.name}</h3></button>
                <p className="muted small">{ex.muscle} · {ex.sets} × {ex.reps[0]}–{ex.reps[1]}{ex.kind === 'time' ? 's' : ''}{isAnchor ? <span className="ex-main"> · Main lift</span> : null}</p>
              </div>
              <button className="icon-btn" onClick={() => setSwapIdx(ei)} aria-label="Swap exercise"><Icon.Swap /></button>
            </div>

            <div className="ex-target">
              <Badge kind={e.rec.kind} />
              <b className="num">{isWeight ? `${e.rec.weight} lb × ${e.rec.reps}` : `${e.rec.reps} ${unitOf(ex)}`}</b>
              <span className="muted small grow">{e.rec.note}</span>
            </div>

            {wu.length > 0 && wsSet.warmups && (
              <div className="warmup">
                <p className="warmup-label">Warm-up <span className="muted">· not logged</span></p>
                <div className="warmup-sets">
                  {wu.map((w, wi) => {
                    const done = (e.warmDone || []).includes(wi)
                    return (
                      <button key={wi} className={`warm ${done ? 'on' : ''}`} onClick={() => toggleWarm(ei, wi)}>
                        <b className="num">{w.weight} × {w.reps}</b>
                        <span>{bb ? plateMath(w.weight) : ex.cue.startsWith('Weight per hand') ? 'per hand' : 'lighter'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className={`sets ${isWeight ? '' : 'bw'}`}>
              <div className="set-row head">
                <span>Set</span>
                <span>Previous</span>
                {isWeight && <span className="center">lb</span>}
                <span className="center">{ex.kind === 'time' ? 'Sec' : 'Reps'}</span>
                <span />
              </div>
              {e.sets.map((x, si) => {
                const p = prev[si]
                return (
                  <div className={`set-row ${x.done ? 'done' : ''}`} key={si}>
                    <button className={`n set-type ${x.type && x.type !== 'normal' ? 't-' + x.type : ''}`} onClick={() => setField(ei, si, { type: nextSetType(x.type) })} aria-label="Change set type" title={SET_TYPES[x.type || 'normal'].label}>
                      {SET_TYPES[x.type || 'normal'].short || si + 1}
                    </button>
                    <button className="prev num" disabled={!p} onClick={() => p && setField(ei, si, isWeight ? { weight: p.weight, reps: p.reps } : { reps: p.reps })} aria-label="Use previous">
                      {p ? (isWeight ? `${p.weight} × ${p.reps}` : `${p.reps}${ex.kind === 'time' ? 's' : ''}`) : '—'}
                    </button>
                    {isWeight && (
                      <input className="input" inputMode="decimal" value={x.weight} aria-label={`Set ${si + 1} weight`}
                        onChange={(ev) => setField(ei, si, { weight: ev.target.value.replace(/[^\d.]/g, '') })} />
                    )}
                    <input className="input" inputMode="numeric" placeholder={String(e.rec.reps)} value={x.reps} aria-label={`Set ${si + 1} reps`}
                      onChange={(ev) => setField(ei, si, { reps: ev.target.value.replace(/\D/g, '') })} />
                    <button className={`set-done ${x.done ? 'on' : ''}`} onClick={() => { if (!x.done && !restsInSuperset(ei)) startRest(e.id); toggleDone(ei, si) }} aria-label="Mark set done">
                      <Icon.Check />
                    </button>
                  </div>
                )
              })}
              <button className="add-set" onClick={() => addSet(ei)}><Icon.Plus />Add set</button>
            </div>

            {e.sets.some((x) => x.done) && (
              <div className="effort">
                <span className="small muted">How hard was that?</span>
                <div className="effort-btns">
                  {[['easy', 'Easy'], ['good', 'Good'], ['grind', 'Grind']].map(([k, l]) => (
                    <button key={k} className={`effort-btn ${k} ${e.effort === k ? 'on' : ''}`} onClick={() => setExField(ei, { effort: e.effort === k ? undefined : k })}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="ex-foot">
              <div className="row" style={{ gap: 14 }}>
                <button className="btn sm ghost" onClick={() => setInfo(e.id)}>How to</button>
                <button className="btn sm ghost" onClick={() => setHistId(e.id)}>History</button>
                {(e.superset || ei < draft.exercises.length - 1) && (
                  <button className="btn sm ghost" onClick={() => toggleSuperset(ei)}>{e.superset ? 'Unlink' : 'Superset'}</button>
                )}
              </div>
              <button className="btn sm ghost muted-btn" onClick={() => removeExercise(ei)} aria-label="Remove exercise"><Icon.Trash /></button>
            </div>
          </div>
        )
      })}

      <div className="sticky-bar">
        {rest && (
          <div className={`rest-timer ${restLeft <= 0 ? 'over' : ''}`}>
            <div className="rest-bar"><span style={{ width: `${Math.max(0, Math.min(100, (restLeft / rest.total) * 100))}%` }} /></div>
            <div className="rest-row">
              <div>
                <p className="tiny muted">{restLeft > 0 ? 'Rest' : 'Rest over'}</p>
                <b className="num rest-clock">{restLeft > 0 ? fmtClock(restLeft) : 'Next set'}</b>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => setRest((r) => ({ ...r, end: r.end - 15000, total: Math.max(15, r.total - 15) }))}>−15</button>
                <button className="btn sm" onClick={() => setRest((r) => ({ ...r, end: Math.max(r.end, Date.now()) + 15000, total: r.total + 15 }))}>+15</button>
                <button className="btn sm" onClick={() => setRest(null)}>{restLeft > 0 ? 'Skip' : 'Close'}</button>
              </div>
            </div>
          </div>
        )}
        <div>
          <button className="btn danger" onClick={discard} aria-label="Discard workout"><Icon.Trash /></button>
          <button className="btn primary grow" onClick={finish}><Icon.Check />Finish workout</button>
        </div>
      </div>

      {swapIdx != null && (
        <Sheet title="Swap exercise" onClose={() => setSwapIdx(null)}>
          <div className="stack">
            <p className="muted small">Same job, different movement. Your progress is tracked per exercise, so each one keeps its own history.</p>
            {swapOptions(draft, swapIdx).map((id) => {
              const ex = EXERCISES[id]
              const rec = recommend(id, lifts)
              const current = id === draft.exercises[swapIdx].id
              return (
                <button key={id} className={`session tone-lift ${current ? 'selected' : ''}`}
                  onClick={() => { setDraft((d) => swapExercise(d, swapIdx, lifts, id)); setSwapIdx(null) }}>
                  <div className="grow">
                    <h3>{ex.name}</h3>
                    <p className="muted small">{ex.muscle} · {ex.kind === 'weight' ? `${rec.weight} lb × ${rec.reps}` : `${rec.reps} ${unitOf(ex)}`}</p>
                  </div>
                  {current ? <span className="check"><Icon.Check /></span> : <span className="chev"><Icon.Chevron /></span>}
                </button>
              )
            })}
          </div>
        </Sheet>
      )}

      {info && <ExerciseInfo id={info} onClose={() => setInfo(null)} />}
      {histId && <ExerciseHistory id={histId} onClose={() => setHistId(null)} />}
      {showSettings && <WorkoutSettingsSheet onClose={() => setShowSettings(false)} />}

      {adding && (
        <Sheet title="Add exercise" onClose={() => setAdding(false)}>
          <div className="stack">
            {MUSCLES.map((m) => {
              const ids = Object.keys(EXERCISES).filter((id) => EXERCISES[id].muscle === m && !draft.exercises.some((e) => e.id === id))
              if (!ids.length) return null
              return (
                <div key={m} className="stack" style={{ gap: 6 }}>
                  <div className="section-label">{m}</div>
                  <div className="chips">
                    {ids.map((id) => (
                      <button key={id} className="chip lg" onClick={() => { setDraft((d) => ({ ...d, exercises: [...d.exercises, makeExercise(id, lifts)] })); setAdding(false) }}>
                        {EXERCISES[id].name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Summary({ summary, onClose }) {
  return (
    <Sheet title="Nice work" onClose={onClose}>
      <div className="stack">
        <div className="stats">
          <div className="stat"><div className="label">Time</div><div className="value num">{summary.duration}<small>min</small></div></div>
          <div className="stat"><div className="label">Sets</div><div className="value num">{summary.sets}</div></div>
          <div className="stat"><div className="label">Volume</div><div className="value num">{(summary.volume / 1000).toFixed(1)}<small>k lb</small></div></div>
        </div>
        <div className="section-label">Next time you do these</div>
        <div className="card flat">
          <div className="list">
            {summary.next.map(({ id, rec }) => {
              const ex = EXERCISES[id]
              return (
                <div className="list-item" key={id}>
                  <div className="grow">
                    <h3>{ex.name}</h3>
                    <p className="muted small">{rec.note}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b className="num">{ex.kind === 'weight' ? `${rec.weight} lb` : `${rec.reps}${ex.kind === 'time' ? 's' : ''}`}</b>
                    <div style={{ marginTop: 4 }}><Badge kind={rec.kind} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <p className="muted small center">Up next in your rotation: <b>{summary.upNext}</b></p>
        <button className="btn primary block" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  )
}
