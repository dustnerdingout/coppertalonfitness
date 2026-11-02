import { useMemo, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { EXERCISES, MUSCLES, RUN_TYPES } from '../lib/program.js'
import { e1rm, formatPace } from '../lib/progression.js'
import { weightSummary, todayStr, parseDate, fmtDate, DAY } from '../lib/stats.js'
import { computeTargets, dayTotals } from '../lib/nutrition.js'
import LineChart from './LineChart.jsx'
import BarChart from './BarChart.jsx'

// ---------- helpers ----------
const mondayOf = (ds) => {
  const d = parseDate(ds)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return todayStr(d)
}
const lastWeeks = (n) => {
  const thisMon = parseDate(mondayOf(todayStr()))
  return Array.from({ length: n }, (_, i) => todayStr(new Date(thisMon.getTime() - (n - 1 - i) * 7 * DAY)))
}
const lastDays = (n) => Array.from({ length: n }, (_, i) => todayStr(new Date(Date.now() - (n - 1 - i) * DAY)))
const wkLabel = (ds) => fmtDate(ds, { month: 'numeric', day: 'numeric' })
const paceStr = (p) => `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, '0')}`

function Stat({ label, value, unit }) {
  return <div className="stat"><div className="label">{label}</div><div className="value num">{value}{unit && <small>{unit}</small>}</div></div>
}

function Card({ title, sub, children, right }) {
  return (
    <div className="card">
      <div className="card-title">
        <div><h2>{title}</h2>{sub && <p className="muted small">{sub}</p>}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

const Empty = ({ children }) => <div className="empty">{children}</div>

const TABS = [['overview', 'Overview'], ['body', 'Body'], ['strength', 'Strength'], ['running', 'Running'], ['fuel', 'Fuel']]

export default function Progress() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div><div className="eyebrow">Breakdowns</div><h1>Progress</h1></div>
      </header>
      <div className="chips scroll-x">
        {TABS.map(([k, l]) => (
          <button key={k} className={`chip lg ${tab === k ? 'on lift' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'body' && <Body />}
      {tab === 'strength' && <Strength />}
      {tab === 'running' && <Running />}
      {tab === 'fuel' && <Fuel />}
    </div>
  )
}

// ---------- Overview ----------
function Overview() {
  const { state } = useStore()
  const { lifts, runs, mobility } = state
  const weeks = 16

  const counts = useMemo(() => {
    const c = {}
    for (const x of [...lifts, ...runs, ...mobility]) c[x.date] = (c[x.date] || 0) + 1
    return c
  }, [lifts, runs, mobility])

  const start = parseDate(lastWeeks(weeks)[0])
  const today = todayStr()
  const cells = Array.from({ length: weeks * 7 }, (_, i) => todayStr(new Date(start.getTime() + i * DAY)))

  // Weeks in a row hitting the plan (3 lifts + 3 runs)
  const wk = lastWeeks(52).reverse()
  let streak = 0
  for (let i = 0; i < wk.length; i++) {
    const end = todayStr(new Date(parseDate(wk[i]).getTime() + 6 * DAY))
    const inW = (arr) => arr.filter((x) => x.date >= wk[i] && x.date <= end).length
    const hit = inW(lifts) >= 3 && inW(runs) >= 3
    if (hit) streak++
    else if (i > 0) break // the current week can still be in progress
  }

  const activeDays = Object.keys(counts).length
  const minutes = runs.reduce((s, r) => s + (r.minutes || 0), 0) + lifts.reduce((s, l) => s + (l.durationMin || 0), 0)

  return (
    <>
      <div className="stats">
        <Stat label="Workouts" value={lifts.length} />
        <Stat label="Runs" value={runs.length} />
        <Stat label="Mobility" value={mobility.length} />
        <Stat label="Active days" value={activeDays} />
        <Stat label="Hours trained" value={Math.round(minutes / 6) / 10} />
        <Stat label="Week streak" value={streak} />
      </div>

      <Card title="Consistency" sub={`Last ${weeks} weeks. Each square is a day.`}>
        <div className="heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
          {cells.map((d) => {
            const n = counts[d] || 0
            const cls = d > today ? 'future' : n >= 3 ? 'l3' : n === 2 ? 'l2' : n === 1 ? 'l1' : ''
            return <i key={d} className={cls} title={`${fmtDate(d)}: ${n} session${n === 1 ? '' : 's'}`} />
          })}
        </div>
        <div className="heat-legend">
          Less <i style={{ background: 'var(--surface-2)' }} /><i className="l1" style={{ background: 'color-mix(in srgb, var(--copper) 35%, var(--surface-2))' }} />
          <i style={{ background: 'color-mix(in srgb, var(--copper) 65%, var(--surface-2))' }} /><i style={{ background: 'var(--copper)' }} /> More
        </div>
      </Card>

      <WeeklySessions />
    </>
  )
}

function WeeklySessions() {
  const { state } = useStore()
  const weeks = lastWeeks(8)
  const per = (arr, w) => arr.filter((x) => mondayOf(x.date) === w).length
  const bars = weeks.map((w) => {
    const l = per(state.lifts, w), r = per(state.runs, w), m = per(state.mobility, w)
    return { label: wkLabel(w), value: l + r + m, tip: <><b>{l + r + m} sessions</b> · {l} lift, {r} run, {m} mobility</> }
  })
  return (
    <Card title="Sessions per week" sub="Plan is 7: 3 lifts, 3 runs, 1 mobility">
      <BarChart bars={bars} target={7} targetLabel="Plan" />
    </Card>
  )
}

// ---------- Body ----------
function Body() {
  const { state } = useStore()
  const ws = weightSummary(state.profile, state.weights)

  if (!ws.pts.length) return <Empty>Log your weight to see trends here.</Empty>

  const weeks = lastWeeks(12)
  const avgFor = (w) => {
    const end = todayStr(new Date(parseDate(w).getTime() + 6 * DAY))
    const p = ws.pts.filter((x) => x.date >= w && x.date <= end)
    return p.length ? p.reduce((s, x) => s + x.weight, 0) / p.length : null
  }
  const avgs = weeks.map(avgFor)
  const change = weeks.slice(1).map((w, i) => {
    const prev = avgs[i], cur = avgs[i + 1]
    const v = prev != null && cur != null ? Math.round((prev - cur) * 10) / 10 : 0
    return { label: wkLabel(w), value: v, tip: <><b>{v >= 0 ? `${v} lb lost` : `${-v} lb gained`}</b> · week of {wkLabel(w)}</> }
  })

  const rateText = {
    none: 'Need a couple of weeks of weigh-ins.',
    good: 'Right in the sweet spot for losing fat and keeping muscle.',
    fast: 'Faster than ideal. Eat a bit more, especially protein, to protect muscle.',
    slow: 'Slower than target. Tighten up food logging or add daily steps.',
  }[ws.rateStatus]

  const bmiH = state.profile.heightIn
  const bmi = bmiH ? Math.round((ws.current / (bmiH * bmiH)) * 703 * 10) / 10 : null

  return (
    <>
      <div className="stats">
        <Stat label="Lost" value={Math.max(0, ws.lost)} unit="lb" />
        <Stat label="To go" value={ws.toGo} unit="lb" />
        <Stat label="Lost / wk" value={ws.rate == null ? '—' : -ws.rate} unit={ws.rate == null ? '' : 'lb'} />
      </div>

      <Card title="Weight trend" sub="Line is the 7 day average. Dots are daily weigh-ins.">
        <LineChart
          points={ws.pts.map((p) => ({ date: p.date, y: p.trend, raw: p.weight }))}
          goal={ws.goal}
          unit=" lb"
          tooltip={(p) => <><b>{p.y} lb</b> trend · {p.raw} scale · {fmtDate(p.date)}</>}
        />
        <div className="legend">
          <span><i style={{ background: 'var(--chart-line)' }} />7 day trend</span>
          <span><i className="dotkey" style={{ background: 'var(--chart-dot)' }} />Weigh-ins</span>
          <span><i className="dash" />Goal</span>
        </div>
      </Card>

      <Card title="Weekly change" sub="Pounds lost each week (gray means a gain)">
        <BarChart bars={change} fmt={(v) => v} />
      </Card>

      <Card title="Pace check">
        <div className="stack small">
          <p>Healthy range for you right now: <b>{ws.idealLow} to {ws.idealHigh} lb/week</b> (0.5% to 1% of body weight).</p>
          <p className="muted">{rateText}</p>
          {ws.eta && <p>At this pace you hit <b>{ws.goal} lb</b> around <b>{ws.eta.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>.</p>}
          {bmi && <p className="muted">BMI {bmi}. Useful as a rough guide only, it can't tell muscle from fat.</p>}
          <div className="bar light" style={{ marginTop: 4 }}><span style={{ width: `${ws.pct}%` }} /></div>
          <p className="muted tiny">{Math.round(ws.pct)}% of the way from {ws.start} to {ws.goal} lb</p>
        </div>
      </Card>
    </>
  )
}

// ---------- Strength ----------
function Strength() {
  const { state } = useStore()
  const { lifts } = state

  const perExercise = useMemo(() => {
    const m = {}
    for (const l of [...lifts].sort((a, b) => a.date.localeCompare(b.date))) {
      for (const e of l.exercises) {
        const ex = EXERCISES[e.id]
        if (!ex || ex.kind !== 'weight') continue
        const best = e.sets.reduce((b, s) => (e1rm(s.weight, s.reps) > b.e ? { e: e1rm(s.weight, s.reps), s } : b), { e: 0, s: null })
        ;(m[e.id] ||= []).push({ date: l.date, y: best.e, set: best.s })
      }
    }
    return m
  }, [lifts])

  const ids = Object.keys(perExercise).sort((a, b) => perExercise[b].length - perExercise[a].length)
  const [sel, setSel] = useState(ids[0])
  const cur = sel && perExercise[sel] ? sel : ids[0]

  if (!lifts.length) return <Empty>Finish a workout to see strength progress.</Empty>

  const series = cur ? perExercise[cur] : []
  const best = series.reduce((b, p) => (p.y > b.y ? p : b), series[0] || { y: 0 })
  const gain = series.length > 1 ? series.at(-1).y - series[0].y : 0

  // weekly volume (lb moved)
  const weeks = lastWeeks(12)
  const vol = weeks.map((w) => {
    const v = lifts.filter((l) => mondayOf(l.date) === w)
      .reduce((s, l) => s + l.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.weight * x.reps, 0), 0), 0)
    return { label: wkLabel(w), value: Math.round(v / 100) / 10, tip: <><b>{Math.round(v).toLocaleString()} lb</b> · week of {wkLabel(w)}</> }
  })

  // sets per muscle, last 4 weeks, shown as weekly average
  const since = todayStr(new Date(Date.now() - 28 * DAY))
  const muscleSets = Object.fromEntries(MUSCLES.map((m) => [m, 0]))
  for (const l of lifts.filter((x) => x.date >= since)) {
    for (const e of l.exercises) if (EXERCISES[e.id]) muscleSets[EXERCISES[e.id].muscle] += e.sets.length
  }
  const maxSets = Math.max(1, ...Object.values(muscleSets))

  // personal records
  const prs = ids.map((id) => ({ id, best: perExercise[id].reduce((b, p) => (p.y > b.y ? p : b)) }))
    .sort((a, b) => b.best.y - a.best.y).slice(0, 8)

  return (
    <>
      <Card title="Estimated max" sub="Best set each session turned into an estimated 1 rep max"
        right={
          <select className="input" style={{ width: 'auto', height: 36, fontSize: 13 }} value={cur} onChange={(e) => setSel(e.target.value)}>
            {ids.map((id) => <option key={id} value={id}>{EXERCISES[id].name}</option>)}
          </select>
        }>
        {series.length ? (
          <>
            <LineChart points={series} unit=" lb" tooltip={(p) => <><b>{p.y} lb</b> est. · {p.set.weight}×{p.set.reps} · {fmtDate(p.date)}</>} />
            <div className="stats" style={{ marginTop: 12 }}>
              <Stat label="Best est." value={best.y} unit="lb" />
              <Stat label="Change" value={`${gain >= 0 ? '+' : ''}${gain}`} unit="lb" />
              <Stat label="Sessions" value={series.length} />
            </div>
          </>
        ) : <Empty>No weighted sets yet.</Empty>}
      </Card>

      <Card title="Weekly volume" sub="Total weight moved (thousands of lb)">
        <BarChart bars={vol} fmt={(v) => `${v}k`} />
      </Card>

      <Card title="Sets per muscle" sub="Last 4 weeks. Aim for about 10+ hard sets per muscle per week over time.">
        <div className="hbars">
          {MUSCLES.map((m) => (
            <div className="hbar" key={m}>
              <span className="muted">{m}</span>
              <div className="track"><span style={{ width: `${(muscleSets[m] / maxSets) * 100}%` }} /></div>
              <span className="v">{muscleSets[m]}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Personal records">
        <div className="list">
          {prs.map(({ id, best }) => (
            <div className="list-item" key={id}>
              <div className="grow"><h3>{EXERCISES[id].name}</h3><p className="muted small">{best.set.weight} lb × {best.set.reps} · {fmtDate(best.date)}</p></div>
              <b className="num">{best.y} lb</b>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

// ---------- Running ----------
function Running() {
  const { state } = useStore()
  const { runs } = state
  if (!runs.length) return <Empty>Log a run to see your running trends.</Empty>

  const weeks = lastWeeks(12)
  const mins = weeks.map((w) => {
    const rs = runs.filter((r) => mondayOf(r.date) === w)
    const v = rs.reduce((s, r) => s + (r.minutes || 0), 0)
    return { label: wkLabel(w), value: Math.round(v), tip: <><b>{Math.round(v)} min</b> · {rs.length} run{rs.length === 1 ? '' : 's'}</> }
  })

  const withDist = [...runs].filter((r) => r.distance > 0 && r.minutes > 0).sort((a, b) => a.date.localeCompare(b.date))
  const pace = withDist.map((r) => ({ date: r.date, y: Math.round((r.minutes / r.distance) * 100) / 100, r }))

  const miles = runs.reduce((s, r) => s + (r.distance || 0), 0)
  const hours = runs.reduce((s, r) => s + (r.minutes || 0), 0) / 60
  const longest = runs.reduce((b, r) => ((r.minutes || 0) > (b.minutes || 0) ? r : b), runs[0])
  const fastest = pace.reduce((b, p) => (!b || p.y < b.y ? p : b), null)
  const avgRpe = (type) => {
    const rs = runs.filter((r) => r.type === type)
    return rs.length ? Math.round((rs.reduce((s, r) => s + r.rpe, 0) / rs.length) * 10) / 10 : null
  }

  return (
    <>
      <div className="stats">
        <Stat label="Runs" value={runs.length} />
        <Stat label="Miles" value={Math.round(miles * 10) / 10} />
        <Stat label="Hours" value={Math.round(hours * 10) / 10} />
        <Stat label="Longest" value={longest.minutes} unit="min" />
        <Stat label="Best pace" value={fastest ? paceStr(fastest.y) : '—'} unit={fastest ? '/mi' : ''} />
        <Stat label="This week" value={mins.at(-1).value} unit="min" />
      </div>

      <Card title="Minutes per week" sub="Build slowly. About 10% more per week is a safe ceiling.">
        <BarChart bars={mins} color="var(--run)" />
      </Card>

      <Card title="Pace" sub="Minutes per mile. Lower is faster. Log distance to see this.">
        {pace.length ? (
          <LineChart points={pace} yLabel={(v) => paceStr(v)} tooltip={(p) => <><b>{formatPace(p.r.minutes, p.r.distance)}</b> · {p.r.distance} mi · {fmtDate(p.date)}</>} />
        ) : <Empty>No runs with distance yet.</Empty>}
      </Card>

      <Card title="Average effort by run type" sub="1 is easy, 10 is all out">
        <div className="hbars">
          {Object.entries(RUN_TYPES).map(([k, t]) => {
            const v = avgRpe(k)
            return (
              <div className="hbar" key={k}>
                <span className="muted">{t.short}</span>
                <div className="track"><span style={{ width: `${((v || 0) / 10) * 100}%`, background: 'var(--run)' }} /></div>
                <span className="v">{v ?? '—'}</span>
              </div>
            )
          })}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Easy and long runs should sit around 3 to 5. If they creep up, slow down.</p>
      </Card>
    </>
  )
}

// ---------- Fuel ----------
function Fuel() {
  const { state } = useStore()
  const ws = weightSummary(state.profile, state.weights)
  const t = computeTargets(state.profile, ws.current)
  const days = lastDays(14)
  const totals = days.map((d) => ({ d, ...dayTotals(state.meals, d) }))
  const logged = totals.filter((x) => x.calories > 0)

  if (!state.meals.length) return <Empty>Log meals in the Food tab to see nutrition trends.</Empty>

  const avg = (k) => (logged.length ? Math.round(logged.reduce((s, x) => s + x[k], 0) / logged.length) : 0)
  const label = (d) => fmtDate(d, { month: 'numeric', day: 'numeric' })

  return (
    <>
      <div className="stats">
        <Stat label="Avg calories" value={avg('calories').toLocaleString()} />
        <Stat label="Avg protein" value={avg('protein')} unit="g" />
        <Stat label="Days logged" value={`${logged.length}/14`} />
      </div>

      <Card title="Calories" sub="Last 14 days">
        <BarChart bars={totals.map((x) => ({ label: label(x.d), value: Math.round(x.calories), tip: <><b>{Math.round(x.calories).toLocaleString()} cal</b> · {fmtDate(x.d)}</> }))}
          target={t.calories} targetLabel="Target" fmt={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
      </Card>

      <Card title="Protein" sub="Last 14 days. Hitting this is the #1 way to keep muscle while cutting.">
        <BarChart bars={totals.map((x) => ({ label: label(x.d), value: Math.round(x.protein), tip: <><b>{Math.round(x.protein)} g</b> · {fmtDate(x.d)}</> }))}
          target={t.protein} targetLabel="Target" />
      </Card>

      <Card title="Average vs target" sub="Days you logged food, last 14 days">
        <div className="hbars">
          {[['Calories', 'calories', t.calories, ''], ['Protein', 'protein', t.protein, 'g'], ['Carbs', 'carbs', t.carbs, 'g'], ['Fat', 'fat', t.fat, 'g']].map(([n, k, target, u]) => {
            const pct = target ? Math.round((avg(k) / target) * 100) : 0
            return (
              <div className="hbar" key={k}>
                <span className="muted">{n} <span className="tiny">({target}{u})</span></span>
                <div className="track"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <span className="v">{pct}%</span>
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}
