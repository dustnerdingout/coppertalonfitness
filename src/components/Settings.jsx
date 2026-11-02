import { useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { SLOTS, DAY_NAMES, ROTATIONS, DEFAULT_SCHEDULE } from '../lib/program.js'
import { computeTargets } from '../lib/nutrition.js'
import { weightSummary, todayStr } from '../lib/stats.js'
import { Seg } from './ui.jsx'
import { WorkoutSettingsBody } from './TrainingSheets.jsx'
import { workoutSettings, isDeloadWeek } from '../lib/training.js'
import { mondayOf } from '../lib/plan.js'
import { RUN_PLANS, planProgress } from '../lib/runplans.js'

const ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function Settings({ notify }) {
  const { state, update, replaceAll, reset } = useStore()
  const { profile, schedule, theme, rotation } = state
  const fileRef = useRef(null)
  const ws = weightSummary(profile, state.weights)
  const auto = computeTargets({ ...profile, targets: null }, ws.current)
  const t = profile.targets?.custom ? profile.targets : auto
  const [custom, setCustom] = useState(!!profile.targets?.custom)

  const setProfile = (patch) => update((s) => ({ profile: { ...s.profile, ...patch } }))
  const num = (v) => (v === '' ? '' : Number(v.replace(/[^\d.]/g, '')))

  const toggleSlot = (day, slot) => update((s) => {
    const cur = s.schedule[day] || []
    let next = cur.includes(slot) ? cur.filter((x) => x !== slot) : [...cur, slot]
    if (slot === 'rest' && !cur.includes('rest')) next = ['rest']
    else next = next.filter((x) => x !== 'rest' || next.length === 1)
    return { schedule: { ...s.schedule, [day]: next } }
  })

  const counts = Object.values(schedule).flat().reduce((c, s) => ({ ...c, [SLOTS[s].tone]: (c[SLOTS[s].tone] || 0) + 1 }), {})

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `coppertalon-backup-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt)
        if (!data.profile) throw new Error('bad file')
        if (confirm('Replace everything in the app with this backup?')) { replaceAll(data); notify('Backup restored') }
      } catch { alert("That file doesn't look like a Copper Talon backup.") }
    })
    e.target.value = ''
  }

  const setTarget = (k, v) => setProfile({ targets: { ...t, [k]: num(v) || 0, custom: true } })

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div><div className="eyebrow">Setup</div><h1>Settings</h1></div>
      </header>

      <div className="card stack">
        <h2>Appearance</h2>
        <Seg options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} value={theme} onChange={(v) => update(() => ({ theme: v }))} />
      </div>

      <div className="card stack">
        <h2>You</h2>
        <label className="field">Name<input className="input" value={profile.name || ''} onChange={(e) => setProfile({ name: e.target.value })} /></label>
        <div className="grid-2">
          <label className="field">Starting weight (lb)<input className="input num" inputMode="decimal" value={profile.startWeight} onChange={(e) => setProfile({ startWeight: num(e.target.value) })} /></label>
          <label className="field">Goal weight (lb)<input className="input num" inputMode="decimal" value={profile.goalWeight} onChange={(e) => setProfile({ goalWeight: num(e.target.value) })} /></label>
          <label className="field">Height (inches)<input className="input num" inputMode="decimal" placeholder="e.g. 70" value={profile.heightIn || ''} onChange={(e) => setProfile({ heightIn: num(e.target.value) })} /></label>
          <label className="field">Age<input className="input num" inputMode="numeric" value={profile.age || ''} onChange={(e) => setProfile({ age: num(e.target.value) })} /></label>
        </div>
        <Seg options={[['male', 'Male'], ['female', 'Female']]} value={profile.sex || 'male'} onChange={(v) => setProfile({ sex: v })} />
        <p className="muted tiny">Height, age, and sex make the calorie estimate more accurate.</p>
      </div>

      <div className="card stack">
        <h2>Nutrition targets</h2>
        <label className="toggle">
          <input type="checkbox" checked={custom} onChange={(e) => { setCustom(e.target.checked); setProfile({ targets: e.target.checked ? { ...auto, custom: true } : null }) }} />
          Set my own targets
        </label>
        <div className="grid-2">
          {[['calories', 'Calories'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)']].map(([k, l]) => (
            <label className="field" key={k}>{l}
              <input className="input num" inputMode="numeric" disabled={!custom} value={t[k]} onChange={(e) => setTarget(k, e.target.value)} />
            </label>
          ))}
        </div>
        {!custom && <p className="muted tiny">Auto: about 20% under your estimated maintenance ({auto.maintenance.toLocaleString()} cal), 1 g protein per lb of goal weight, 25% fat, rest carbs. Updates as your weight drops.</p>}
      </div>

      <div className="stack">
        <h2 style={{ margin: '4px 2px 0' }}>Workouts</h2>
        <WorkoutSettingsBody s={workoutSettings(state)} set={(patch) => update((st) => ({ workout: { ...(st.workout || {}), ...patch } }))}
          state={state} update={update} mon={mondayOf(todayStr())} deloadNow={isDeloadWeek(state)} />
      </div>

      <div className="card stack">
        <h2>Running plan</h2>
        <p className="muted small">Adaptive runs grow about 10% when they feel easy. A structured plan gives each run day its exact workout, in order.</p>
        <button className={`session tone-run ${!state.runPlan ? 'selected' : ''}`} onClick={() => update(() => ({ runPlan: null }))}>
          <div className="grow"><h3>Adaptive runs</h3><p className="muted small">Easy, interval, and long runs that progress with your effort ratings</p></div>
          {!state.runPlan && <span className="check" style={{ background: 'var(--copper)' }}>✓</span>}
        </button>
        {Object.entries(RUN_PLANS).map(([k, p]) => {
          const on = state.runPlan?.id === k
          const pp = on ? planProgress(state) : null
          return (
            <button key={k} className={`session tone-run ${on ? 'selected' : ''}`}
              onClick={() => !on && update(() => ({ runPlan: { id: k, startedAt: Date.now() } }))}>
              <div className="grow">
                <h3>{p.source} {p.name}</h3>
                <p className="muted small">{on ? `${pp.done} of ${pp.total} done${pp.next ? ` · next: Week ${pp.next.week} ${pp.next.name}` : ' · plan complete'}` : `${p.weeks} weeks · ${p.perWeek} runs a week`}</p>
              </div>
              {on && <span className="check" style={{ background: 'var(--copper)' }}>✓</span>}
            </button>
          )
        })}
        {state.runPlan && <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => confirm('Restart the plan from Week 1? Your logged runs stay in history.') && update(() => ({ runPlan: { ...state.runPlan, startedAt: Date.now() } }))}>Restart plan from Week 1</button>}
      </div>

      <div className="card stack">
        <h2>Lift rotation</h2>
        <p className="muted small">Which body part focus comes up next on lift days. You can always switch focus when you start a workout.</p>
        {Object.entries(ROTATIONS).map(([k, r]) => (
          <button key={k} className={`session tone-lift ${rotation === k ? 'selected' : ''}`} onClick={() => update(() => ({ rotation: k }))}>
            <div className="grow"><h3>{r.name}</h3><p className="muted small">{r.desc}</p></div>
            {rotation === k && <span className="check" style={{ background: 'var(--copper)' }}>✓</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-title">
          <div>
            <h2>Weekly schedule</h2>
            <p className="muted small">{counts.lift || 0} lifts · {counts.run || 0} runs · {counts.mobility || 0} mobility · {counts.rest || 0} rest</p>
          </div>
          <button className="btn sm" onClick={() => update(() => ({ schedule: DEFAULT_SCHEDULE }))}>Reset</button>
        </div>
        {ORDER.map((d) => (
          <div className="sched-day" key={d}>
            <b style={{ paddingTop: 6 }}>{DAY_NAMES[d]}</b>
            <div className="chips">
              {Object.entries(SLOTS).map(([k, s]) => (
                <button key={k} className={`chip ${s.tone} ${(schedule[d] || []).includes(k) ? 'on' : ''}`} onClick={() => toggleSlot(d, k)}>{s.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h2>Your data</h2>
        <p className="muted small">Everything is saved on this device only, in this browser. Export a backup now and then, and to move to a new phone or computer, export here and import there.</p>
        <div className="row wrap">
          <button className="btn grow" onClick={exportData}>Export backup</button>
          <button className="btn grow" onClick={() => fileRef.current?.click()}>Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} />
        </div>
        <button className="btn ghost danger" onClick={() => confirm('Erase ALL data? This cannot be undone.') && reset()}>Erase all data</button>
      </div>

      <div className="card stack small">
        <h2>How progression works</h2>
        <p><b>Lifting:</b> each exercise has a rep range like 8 to 12. Use the suggested weight. When you hit the top of the range on every set, the app adds weight next time. Miss the bottom of the range twice in a row and it drops 10% so you can build back up.</p>
        <p><b>Variety:</b> the main lift in each focus sticks so you can keep adding weight. The other slots rotate through variations automatically. Hit "Mix it up" to shuffle, or swap any exercise.</p>
        <p><b>Running:</b> rate your effort after each run. If it felt easy, the next one grows about 10%. If it was hard, it repeats. Flag pain and it backs off.</p>
      </div>
    </div>
  )
}
