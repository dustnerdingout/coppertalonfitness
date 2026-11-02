import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { EXERCISES, FOCUSES, MUSCLES } from '../lib/program.js'
import { buildSession, nextFocus, recommend, exerciseHistory, swapOptions, swapExercise, shuffleSession, makeExercise } from '../lib/progression.js'
import { todayStr, fmtDate } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Badge, Sheet } from './ui.jsx'
import { ExerciseImage, ExerciseInfo } from './ExerciseVisual.jsx'
import { buildCustom } from '../lib/builder.js'

const unitOf = (ex) => (ex.kind === 'time' ? 'sec' : 'reps')

export default function LiftSession({ onClose, notify, onBuild }) {
  const { state, update, add } = useStore()
  const { draft, lifts, rotation } = state
  const [summary, setSummary] = useState(null)
  const [swapIdx, setSwapIdx] = useState(null)
  const [adding, setAdding] = useState(false)
  const [info, setInfo] = useState(null)

  // Start a session if there isn't one in progress
  useEffect(() => {
    if (!draft && !summary) update((s) => ({ draft: buildSession(nextFocus(s.lifts, s.rotation), s.lifts) }))
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

  const removeExercise = (ei) => setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }))

  const switchFocus = (key) => {
    if (key === draft.focus) return
    if (anyDone && !confirm('Switch focus? Sets logged so far will be cleared.')) return
    update((s) => ({ draft: buildSession(key, s.lifts) }))
  }

  const mixItUp = () => {
    if (anyDone && !confirm('Shuffle the accessory exercises? Sets on swapped exercises will be cleared.')) return
    setDraft((d) => (isCustom ? { ...buildCustom(d.muscles, d.minutes || 60, lifts, { random: true }), startedAt: d.startedAt } : shuffleSession(d, lifts)))
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
        sets: e.sets
          .filter((s) => s.done || Number(s.reps) > 0)
          .map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }))
          .filter((s) => s.reps > 0),
      }))
      .filter((e) => e.sets.length)
    if (!exercises.length) {
      alert('Log at least one set first.')
      return
    }
    const entry = {
      date: todayStr(),
      focus: draft.focus,
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

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Strength</div>
          <h1>{focus.name}</h1>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Minimize"><Icon.X /></button>
      </header>

      <div className="chips scroll-x">
        <button className={`chip lg ${isCustom ? 'on lift' : ''}`} onClick={onBuild}><Icon.Plus />Pick muscles</button>
        {Object.entries(FOCUSES).map(([k, f]) => (
          <button key={k} className={`chip lg ${draft.focus === k ? 'on lift' : ''}`} onClick={() => switchFocus(k)}>{f.name}</button>
        ))}
      </div>

      <div className="row">
        <button className="btn grow" onClick={mixItUp}><Icon.Shuffle />Mix it up</button>
        <button className="btn grow" onClick={() => setAdding(true)}><Icon.Plus />Add exercise</button>
      </div>

      {draft.exercises.map((e, ei) => {
        const ex = EXERCISES[e.id]
        const last = exerciseHistory(e.id, lifts)[0]
        const isWeight = ex.kind === 'weight'
        const isAnchor = e.slot != null && FOCUSES[draft.focus]?.slots[e.slot]?.anchor
        return (
          <div className="card exercise" key={e.id + ei}>
            <div className="row between" style={{ alignItems: 'flex-start', gap: 14 }}>
              <button className="ex-thumb" onClick={() => setInfo(e.id)} aria-label={`How to do ${ex.name}`}>
                <ExerciseImage id={e.id} size={76} />
                <span>How to</span>
              </button>
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <span className="pill">{ex.muscle}</span>
                  {isAnchor && <span className="pill copper">Main lift</span>}
                </div>
                <h2 style={{ marginTop: 6 }}>{ex.name}</h2>
                <p className="muted small" style={{ marginTop: 2 }}>{ex.sets} × {ex.reps[0]}–{ex.reps[1]} {unitOf(ex)} · {ex.cue}</p>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="icon-btn" onClick={() => setSwapIdx(ei)} aria-label="Swap exercise"><Icon.Swap /></button>
              </div>
            </div>

            <div className="rec">
              <Badge kind={e.rec.kind} />
              <div>
                <b className="num">{isWeight ? `${e.rec.weight} lb × ${e.rec.reps}` : `${e.rec.reps} ${unitOf(ex)}`}</b>
                <div className="muted">{e.rec.note}</div>
                {last && (
                  <div className="muted tiny" style={{ marginTop: 4 }}>
                    Last ({fmtDate(last.date)}): {last.entry.sets.map((s) => (isWeight ? `${s.weight}×${s.reps}` : s.reps)).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="sets">
              <div className="set-row head">
                <span className="center">Set</span>
                <span className="center">{isWeight ? 'Weight (lb)' : ''}</span>
                <span className="center">{ex.kind === 'time' ? 'Seconds' : 'Reps'}</span>
                <span />
              </div>
              {e.sets.map((s, si) => (
                <div className="set-row" key={si}>
                  <span className="n">{si + 1}</span>
                  {isWeight ? (
                    <input className="input" inputMode="decimal" value={s.weight} aria-label={`Set ${si + 1} weight`}
                      onChange={(ev) => setField(ei, si, { weight: ev.target.value.replace(/[^\d.]/g, '') })} />
                  ) : <span className="muted small center">Bodyweight</span>}
                  <input className="input" inputMode="numeric" placeholder={String(e.rec.reps)} value={s.reps} aria-label={`Set ${si + 1} reps`}
                    onChange={(ev) => setField(ei, si, { reps: ev.target.value.replace(/\D/g, '') })} />
                  <button className={`set-done ${s.done ? 'on' : ''}`} onClick={() => toggleDone(ei, si)} aria-label="Mark set done">
                    <Icon.Check />
                  </button>
                </div>
              ))}
            </div>
            <div className="row between" style={{ marginTop: 10 }}>
              <button className="btn sm ghost" onClick={() => addSet(ei)}><Icon.Plus />Set</button>
              <button className="btn sm ghost" onClick={() => removeExercise(ei)}><Icon.Trash />Remove</button>
            </div>
          </div>
        )
      })}

      <div className="sticky-bar">
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
