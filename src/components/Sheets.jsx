import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { RUN_TYPES, MOBILITY } from '../lib/program.js'
import { runRecommendation, intervalLabel, intervalMinutes, formatPace } from '../lib/progression.js'
import { todayStr } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Badge, Seg, Sheet } from './ui.jsx'

export function RunSheet({ initialType = 'easy', onClose, notify }) {
  const { state, add } = useStore()
  const [type, setType] = useState(initialType)
  const rec = runRecommendation(type, state.runs)
  const target = type === 'intervals' ? intervalMinutes(rec) : rec.minutes

  const [date, setDate] = useState(todayStr())
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [rpe, setRpe] = useState(5)
  const [pain, setPain] = useState(false)
  const [notes, setNotes] = useState('')

  const save = () => {
    const mins = Number(minutes) || target
    add('runs', {
      date, type, minutes: mins, distance: Number(distance) || 0, rpe, pain, notes,
      plan: type === 'intervals' ? { rounds: rec.rounds, runSec: rec.runSec, walkSec: rec.walkSec } : { minutes: rec.minutes },
    })
    notify('Run saved')
    onClose()
  }

  return (
    <Sheet title="Log a run" onClose={onClose}>
      <div className="stack">
        <Seg options={Object.entries(RUN_TYPES).map(([k, v]) => [k, v.short])} value={type} onChange={setType} />

        <div className="card flat">
          <div className="row between">
            <span className="muted small">Today's target</span>
            <Badge kind={rec.kind} />
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700, margin: '6px 0 2px' }}>
            {type === 'intervals' ? intervalLabel(rec) : `${rec.minutes} min`}
          </div>
          <p className="small">{rec.note}</p>
          <p className="muted small" style={{ marginTop: 6 }}>{RUN_TYPES[type].desc}</p>
        </div>

        <div className="grid-2">
          <label className="field">Minutes
            <input className="input num" inputMode="decimal" placeholder={String(target)} value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
          <label className="field">Distance (mi)
            <input className="input num" inputMode="decimal" placeholder="optional" value={distance} onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
        </div>
        {Number(distance) > 0 && <p className="muted small">Pace: <b className="num">{formatPace(Number(minutes) || target, Number(distance))}</b></p>}

        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
          <span>Effort (1 easy, 10 all out): <b>{rpe}</b></span>
          <div className="rpe">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={rpe === n ? 'on' : ''} onClick={() => setRpe(n)}>{n}</button>
            ))}
          </div>
        </div>

        <label className="toggle"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />Something hurt (joint or sharp pain)</label>

        <label className="field">Date
          <input className="input" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">Notes
          <textarea className="input" placeholder="Route, weather, how you felt" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <button className="btn run block" onClick={save}><Icon.Check />Save run</button>
      </div>
    </Sheet>
  )
}

export function MobilitySheet({ onClose, notify }) {
  const { add } = useStore()
  const [done, setDone] = useState([])
  const toggle = (i) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))

  const save = () => {
    add('mobility', { date: todayStr(), done: done.length })
    notify('Mobility logged')
    onClose()
  }

  return (
    <Sheet title="Mobility flow" onClose={onClose}>
      <div className="stack">
        <p className="muted small">About 20 minutes. Move slow, breathe deep, no pain. Tap each one as you finish.</p>
        {MOBILITY.map((m, i) => (
          <div key={m.name} className={`mob-item ${done.includes(i) ? 'on' : ''}`} onClick={() => toggle(i)} role="checkbox" aria-checked={done.includes(i)}>
            <span className="box">{done.includes(i) && <Icon.Check />}</span>
            <div className="grow"><h3>{m.name}</h3></div>
            <span className="muted small">{m.dose}</span>
          </div>
        ))}
        <button className="btn block" style={{ background: 'var(--mobility)', borderColor: 'var(--mobility)', color: '#fff' }} onClick={save}>
          <Icon.Check />Complete ({done.length}/{MOBILITY.length})
        </button>
      </div>
    </Sheet>
  )
}

export function WeighSheet({ onClose, notify }) {
  const { state, update } = useStore()
  const last = [...state.weights].sort((a, b) => b.date.localeCompare(a.date))[0]
  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState(last ? String(last.weight) : '')

  const save = () => {
    const w = Number(weight)
    if (!w) return
    // one weigh-in per day: replace if one exists
    update((s) => ({
      weights: [...s.weights.filter((x) => x.date !== date), { id: date, date, weight: w }],
    }))
    notify('Weight saved')
    onClose()
  }

  return (
    <Sheet title="Weigh in" onClose={onClose}>
      <div className="stack">
        <p className="muted small">Best practice: same time each morning, after the bathroom, before food. Daily swings of 2 to 4 lb are normal water weight. The trend line is what matters.</p>
        <label className="field">Weight (lb)
          <input className="input num" style={{ fontSize: 28, height: 64, textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 700 }}
            inputMode="decimal" autoFocus value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))} />
        </label>
        <label className="field">Date
          <input className="input" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="btn primary block" onClick={save} disabled={!Number(weight)}><Icon.Check />Save</button>
      </div>
    </Sheet>
  )
}
