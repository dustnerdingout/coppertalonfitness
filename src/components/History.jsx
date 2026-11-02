import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { EXERCISES, FOCUSES, RUN_TYPES } from '../lib/program.js'
import { formatPace } from '../lib/progression.js'
import { fmtDate } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Seg } from './ui.jsx'

export function EntryBody({ x }) {
  if (x.kind === 'lifts') {
    const f = FOCUSES[x.focus]
    const sets = x.exercises.reduce((s, e) => s + e.sets.length, 0)
    return (
      <>
        <div className="session tone-lift" style={{ padding: 0, border: 0, background: 'none', cursor: 'default' }}>
          <div className="icon"><Icon.Dumbbell /></div>
          <div className="grow"><h3>{f ? f.name : x.title || 'Workout'}</h3><p className="muted small">{x.durationMin} min · {sets} sets</p></div>
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>
          {x.exercises.map((e) => (
            <div key={e.id}>{EXERCISES[e.id]?.name}: {e.sets.map((s) => (s.weight ? `${s.weight}×${s.reps}` : s.reps)).join(', ')}</div>
          ))}
        </div>
      </>
    )
  }
  if (x.kind === 'runs') {
    return (
      <div className="session tone-run" style={{ padding: 0, border: 0, background: 'none', cursor: 'default' }}>
        <div className="icon"><Icon.Run /></div>
        <div className="grow">
          <h3>{x.plan?.name || RUN_TYPES[x.type]?.name}</h3>
          <p className="muted small">{x.minutes} min{x.distance ? ` · ${x.distance} mi · ${formatPace(x.minutes, x.distance)}` : ''} · effort {x.rpe}{x.pain ? ' · pain flagged' : ''}</p>
          {x.notes && <p className="small" style={{ marginTop: 4 }}>{x.notes}</p>}
        </div>
      </div>
    )
  }
  if (x.kind === 'mobility') {
    return (
      <div className="session tone-mobility" style={{ padding: 0, border: 0, background: 'none', cursor: 'default' }}>
        <div className="icon"><Icon.Stretch /></div>
        <div className="grow"><h3>Mobility</h3><p className="muted small">{x.done} movements</p></div>
      </div>
    )
  }
  return (
    <div className="session tone-rest" style={{ padding: 0, border: 0, background: 'none', cursor: 'default' }}>
      <div className="icon"><Icon.Scale /></div>
      <div className="grow"><h3>{x.weight} lb</h3><p className="muted small">Weigh-in</p></div>
    </div>
  )
}

export function EntryCard({ x, onDelete, showDate = true }) {
  return (
    <div className="card" style={{ paddingTop: 12 }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="eyebrow" style={{ color: 'var(--muted)' }}>{showDate ? fmtDate(x.date, { weekday: 'short', month: 'short', day: 'numeric' }) : ({ lifts: 'Strength', runs: 'Run', mobility: 'Mobility', weights: 'Weigh-in' })[x.kind]}</span>
        <button className="btn sm ghost" onClick={onDelete} aria-label="Delete"><Icon.Trash /></button>
      </div>
      <EntryBody x={x} />
    </div>
  )
}

export const allEntries = (state) => [
  ...state.lifts.map((x) => ({ ...x, kind: 'lifts' })),
  ...state.runs.map((x) => ({ ...x, kind: 'runs' })),
  ...state.mobility.map((x) => ({ ...x, kind: 'mobility' })),
  ...state.weights.map((x) => ({ ...x, kind: 'weights' })),
].sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0))

export default function History() {
  const { state, remove } = useStore()
  const [filter, setFilter] = useState('all')

  const items = allEntries(state).filter((x) => filter === 'all' || x.kind === filter)

  const del = (x) => confirm('Delete this entry?') && remove(x.kind, x.id)

  return (
    <div className="stack">
      <Seg options={[['all', 'All'], ['lifts', 'Lifts'], ['runs', 'Runs'], ['weights', 'Weight']]} value={filter} onChange={setFilter} />
      {!items.length && <div className="empty">Nothing logged yet.</div>}
      {items.map((x) => <EntryCard key={x.kind + x.id} x={x} onDelete={() => del(x)} />)}
    </div>
  )
}
