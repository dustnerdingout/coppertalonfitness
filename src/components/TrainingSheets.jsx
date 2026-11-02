import { useStore } from '../lib/store.jsx'
import { EXERCISES } from '../lib/program.js'
import { exerciseHistory, e1rm } from '../lib/progression.js'
import { workoutSettings, trainingWeek, isDeloadWeek, SET_TYPES } from '../lib/training.js'
import { mondayOf } from '../lib/plan.js'
import { todayStr, fmtDate } from '../lib/stats.js'
import { Sheet, Seg } from './ui.jsx'
import { ExerciseImage } from './ExerciseVisual.jsx'
import LineChart from './LineChart.jsx'

const EFFORT = { easy: 'Easy', good: 'Good', grind: 'Grind' }

/** Every past session of one exercise, with a strength trend */
export function ExerciseHistory({ id, onClose }) {
  const { state } = useStore()
  const ex = EXERCISES[id]
  const isWeight = ex.kind === 'weight'
  const hist = exerciseHistory(id, state.lifts, true)
  const score = (s) => (isWeight ? e1rm(s.weight, s.reps) : s.reps)
  const sessions = hist.map((h) => {
    const best = h.entry.sets.reduce((b, s) => (score(s) > score(b) ? s : b), h.entry.sets[0])
    return { ...h, best, value: score(best) }
  })
  const points = [...sessions].reverse().map((s) => ({ date: s.date, y: s.value, set: s.best }))
  const top = sessions.reduce((b, s) => (!b || s.value > b.value ? s : b), null)
  const first = points[0]
  const last = points.at(-1)

  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 12 }}>
          <ExerciseImage id={id} size={56} />
          <div className="grow">
            <p className="muted small">{ex.muscle} · {ex.sets} × {ex.reps[0]}–{ex.reps[1]}{ex.kind === 'time' ? ' sec' : ''}</p>
            <p className="small">{sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'} logged` : 'No sessions yet'}</p>
          </div>
        </div>

        {sessions.length > 0 && (
          <>
            <div className="stats">
              <div className="stat"><div className="label">{isWeight ? 'Best est. max' : 'Best'}</div><div className="value num">{top.value}<small>{isWeight ? 'lb' : ex.kind === 'time' ? 's' : 'reps'}</small></div></div>
              <div className="stat"><div className="label">Best set</div><div className="value num" style={{ fontSize: 20 }}>{isWeight ? `${top.best.weight}×${top.best.reps}` : top.best.reps}</div></div>
              <div className="stat"><div className="label">Change</div><div className="value num">{last.y - first.y >= 0 ? '+' : ''}{last.y - first.y}</div></div>
            </div>
            {points.length > 1 && (
              <div className="card">
                <p className="muted small" style={{ marginBottom: 8 }}>{isWeight ? 'Estimated 1 rep max per session' : 'Best set per session'}</p>
                <LineChart points={points} height={160} unit={isWeight ? ' lb' : ''}
                  tooltip={(p) => <><b>{p.y}{isWeight ? ' lb' : ''}</b> · {isWeight ? `${p.set.weight}×${p.set.reps}` : p.set.reps} · {fmtDate(p.date)}</>} />
              </div>
            )}
            <div className="card" style={{ padding: '6px 16px' }}>
              {sessions.map((s, i) => (
                <div key={i} className="hist-row">
                  <div className="row between">
                    <b className="small">{fmtDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</b>
                    <span className="row" style={{ gap: 6 }}>
                      {s.deload && <span className="pill">Deload</span>}
                      {s.entry.effort && <span className={`pill effort-${s.entry.effort}`}>{EFFORT[s.entry.effort]}</span>}
                    </span>
                  </div>
                  <p className="muted small num">
                    {s.entry.sets.map((x) => `${isWeight ? `${x.weight}×${x.reps}` : x.reps}${SET_TYPES[x.type]?.short ? ` ${SET_TYPES[x.type].short}` : ''}`).join('  ·  ')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

/** Rest timer, sounds, warm-ups, and deload preferences */
export function WorkoutSettingsSheet({ onClose }) {
  const { state, update } = useStore()
  const s = workoutSettings(state)
  const set = (patch) => update((st) => ({ workout: { ...(st.workout || {}), ...patch } }))
  const mon = mondayOf(todayStr())
  const deloadNow = isDeloadWeek(state)

  return (
    <Sheet title="Workout settings" onClose={onClose}>
      <WorkoutSettingsBody s={s} set={set} state={state} update={update} mon={mon} deloadNow={deloadNow} />
    </Sheet>
  )
}

export function WorkoutSettingsBody({ s, set, state, update, mon, deloadNow }) {
  const Toggle = ({ k, label, sub }) => (
    <label className="set-toggle">
      <div className="grow"><p>{label}</p>{sub && <p className="muted tiny">{sub}</p>}</div>
      <input type="checkbox" className="switch" checked={!!s[k]} onChange={(e) => set({ [k]: e.target.checked })} />
    </label>
  )
  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 12 }}>
        <h3>Rest timer</h3>
        <Toggle k="restAuto" label="Start automatically" sub="Begins when you check off a set" />
        <Seg options={[['auto', 'By exercise'], ['fixed', 'Same every time']]} value={s.restMode} onChange={(v) => set({ restMode: v })} />
        {s.restMode === 'auto'
          ? <p className="muted tiny">2 min after big compound lifts, 75 sec after smaller moves, 45 sec after core.</p>
          : (
            <div className="chips">
              {[60, 75, 90, 120, 150, 180].map((v) => (
                <button key={v} className={`chip lg ${s.restSec === v ? 'on' : ''}`} onClick={() => set({ restSec: v })}>{v % 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : `${v / 60} min`}</button>
              ))}
            </div>
          )}
        <Toggle k="sound" label="Sound when rest is over" />
        <Toggle k="vibrate" label="Vibrate when rest is over" sub="On phones that support it" />
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <h3>Warm-ups</h3>
        <Toggle k="warmups" label="Show warm-up sets" sub="Lighter ramp sets before big compound lifts" />
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <h3>Deload weeks</h3>
        <p className="muted small">A lighter week (about 10% less weight, one less set) every few weeks lets your joints and nervous system recover so you keep progressing.</p>
        <div className="chips">
          {[[0, 'Off'], [4, 'Every 4 weeks'], [5, 'Every 5 weeks'], [6, 'Every 6 weeks']].map(([v, l]) => (
            <button key={v} className={`chip lg ${s.deloadEvery === v ? 'on' : ''}`} onClick={() => set({ deloadEvery: v })}>{l}</button>
          ))}
        </div>
        <p className="small">You're in <b>week {trainingWeek(state)}</b>{deloadNow ? ' · this is a deload week' : s.deloadEvery ? ` · next deload in ${s.deloadEvery - (trainingWeek(state) % s.deloadEvery)} week${s.deloadEvery - (trainingWeek(state) % s.deloadEvery) === 1 ? '' : 's'}` : ''}.</p>
        {deloadNow
          ? <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => update(() => ({ deloadSkip: mon, deloadForce: null }))}>Skip this deload</button>
          : <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => update(() => ({ deloadForce: mon, deloadSkip: null }))}>Deload this week instead</button>}
      </div>
    </div>
  )
}
