import { useMemo, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { EXERCISES, MUSCLES } from '../lib/program.js'
import { buildCustom, sessionMinutes, PRESETS, restSec, fmtRest } from '../lib/builder.js'
import { swapExercise, swapOptions, recommend } from '../lib/progression.js'
import { ExerciseImage, ExerciseInfo } from './ExerciseVisual.jsx'
import { Icon } from './Icons.jsx'
import { Seg, Sheet } from './ui.jsx'

// Representative photo for each muscle tile
const COVER = {
  Chest: 'bench', Back: 'pulldown', Shoulders: 'dbOhp', Biceps: 'dbCurl', Triceps: 'pushdown',
  Quads: 'squat', 'Hamstrings & Glutes': 'rdl', Calves: 'calfRaise', Core: 'plank',
}
const SHORT = { 'Hamstrings & Glutes': 'Hams & Glutes' }

export default function Builder({ onClose, onStart }) {
  const { state, update } = useStore()
  const { lifts } = state
  const [muscles, setMuscles] = useState(['Chest', 'Triceps'])
  const [minutes, setMinutes] = useState(60)
  const [seed, setSeed] = useState(0)
  const [plan, setPlan] = useState(null) // manual swaps live here
  const [info, setInfo] = useState(null)
  const [swapIdx, setSwapIdx] = useState(null)

  const generated = useMemo(
    () => (muscles.length ? buildCustom(muscles, minutes, lifts, { random: seed > 0 }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [muscles.join(), minutes, seed]
  )
  const session = plan || generated
  const total = session ? sessionMinutes(session.exercises) : 0

  const toggle = (m) => { setPlan(null); setMuscles((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m])) }
  const preset = (list) => { setPlan(null); setMuscles(list) }
  const shuffle = () => { setPlan(null); setSeed((s) => s + 1) }

  const start = () => {
    if (!session) return
    if (state.draft && state.draft.exercises.some((e) => e.sets.some((s) => s.done)) && !confirm('Replace the workout in progress?')) return
    update(() => ({ draft: { ...session, startedAt: Date.now() } }))
    onStart()
  }

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Strength</div>
          <h1>Build a workout</h1>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon.X /></button>
      </header>

      <section className="stack">
        <div className="section-label">Target muscles</div>
        <div className="chips scroll-x">
          {PRESETS.map(([name, list]) => {
            const on = list.length === muscles.length && list.every((m) => muscles.includes(m))
            return <button key={name} className={`chip lg ${on ? 'on' : ''}`} onClick={() => preset(list)}>{name}</button>
          })}
        </div>
        <div className="muscle-grid">
          {MUSCLES.map((m) => {
            const on = muscles.includes(m)
            return (
              <button key={m} className={`muscle ${on ? 'on' : ''}`} onClick={() => toggle(m)} aria-pressed={on}>
                <ExerciseImage id={COVER[m]} size="full" still />
                <span className="muscle-name">{SHORT[m] || m}</span>
                <span className="muscle-check">{on && <Icon.Check />}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="stack">
        <div className="section-label">Length</div>
        <Seg options={[[45, '45 min'], [60, '60 min']]} value={minutes} onChange={(v) => { setPlan(null); setMinutes(v) }} />
      </section>

      {session ? (
        <section className="stack">
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="section-label" style={{ margin: 0 }}>{session.title}</div>
              <p className="muted small">{session.exercises.length} exercises · {total} min incl. warm-up</p>
            </div>
            <button className="btn sm ghost" onClick={shuffle}><Icon.Shuffle />Shuffle</button>
          </div>

          {session.exercises.map((e, i) => {
            const ex = EXERCISES[e.id]
            const rec = e.rec
            return (
              <div key={e.id} className="ex-row">
                <button className="ex-row-main" onClick={() => setInfo(e.id)}>
                  <ExerciseImage id={e.id} size={84} />
                  <div className="grow">
                    <p className="muted tiny">{i + 1} · {ex.muscle}</p>
                    <h3>{ex.name}</h3>
                    <p className="muted small">
                      {e.sets.length} × {ex.reps[0]}–{ex.reps[1]}{ex.kind === 'time' ? 's' : ''}
                      {ex.kind === 'weight' ? ` · ${rec.weight} lb` : ''} · rest {fmtRest(restSec(e.id))}
                    </p>
                  </div>
                </button>
                <button className="icon-btn" onClick={() => setSwapIdx(i)} aria-label={`Swap ${ex.name}`}><Icon.Swap /></button>
              </div>
            )
          })}
          <p className="muted tiny center">Tap any exercise for photos and step by step form.</p>
        </section>
      ) : (
        <div className="card empty">Pick at least one muscle group.</div>
      )}

      <div className="sticky-bar">
        <div>
          <button className="btn primary grow" onClick={start} disabled={!session}>
            Start workout{session ? ` · ${total} min` : ''}
          </button>
        </div>
      </div>

      {info && <ExerciseInfo id={info} onClose={() => setInfo(null)} />}

      {swapIdx != null && session && (
        <Sheet title="Swap exercise" onClose={() => setSwapIdx(null)}>
          <div className="stack">
            {swapOptions(session, swapIdx).map((id) => {
              const ex = EXERCISES[id]
              const r = recommend(id, lifts)
              const current = id === session.exercises[swapIdx].id
              return (
                <button key={id} className={`session ${current ? 'selected' : ''}`}
                  onClick={() => { setPlan(swapExercise(session, swapIdx, lifts, id)); setSwapIdx(null) }}>
                  <ExerciseImage id={id} size={56} still />
                  <div className="grow">
                    <h3>{ex.name}</h3>
                    <p className="muted small">{ex.kind === 'weight' ? `${r.weight} lb × ${r.reps}` : `${r.reps} ${ex.kind === 'time' ? 'sec' : 'reps'}`}</p>
                  </div>
                  {current ? <span className="check"><Icon.Check /></span> : <span className="chev"><Icon.Chevron /></span>}
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
    </div>
  )
}
