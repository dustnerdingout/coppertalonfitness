import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { computeTargets, dayTotals, recentFoods, caloriesFromMacros, MEAL_SLOTS } from '../lib/nutrition.js'
import { todayStr, weightSummary, parseDate, DAY } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Sheet } from './ui.jsx'

function Macro({ name, cls, value, target, unit = 'g' }) {
  const pct = target ? (value / target) * 100 : 0
  return (
    <div className={`macro ${cls} ${pct > 110 ? 'over' : ''}`}>
      <div className="row between"><b>{name}</b><span className="muted num">{Math.round(value)} / {target}{unit}</span></div>
      <div className="bar light"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
    </div>
  )
}

const defaultSlot = () => {
  const h = new Date().getHours()
  return h < 10 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 20 ? 'Dinner' : 'Snack'
}

export default function Food({ notify }) {
  const { state, add, remove } = useStore()
  const [date, setDate] = useState(todayStr())
  const [sheet, setSheet] = useState(null) // null | { slot, prefill? }
  const ws = weightSummary(state.profile, state.weights)
  const t = computeTargets(state.profile, ws.current)
  const tot = dayTotals(state.meals, date)
  const meals = state.meals.filter((m) => m.date === date)
  const left = t.calories - tot.calories
  const isToday = date === todayStr()
  const shift = (n) => {
    const d = todayStr(new Date(parseDate(date).getTime() + n * DAY))
    if (d <= todayStr()) setDate(d)
  }

  // calorie ring
  const r = 52, c = 2 * Math.PI * r
  const pct = Math.min(1, tot.calories / t.calories)

  return (
    <div className="stack-lg">
      <header className="top" style={{ marginBottom: 0 }}>
        <div><div className="eyebrow">Nutrition</div><h1>Food</h1></div>
      </header>

      <div className="datenav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous day"><Icon.ChevronLeft /></button>
        <b>{isToday ? 'Today' : parseDate(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</b>
        <button className="icon-btn" onClick={() => shift(1)} disabled={isToday} style={{ opacity: isToday ? 0.3 : 1 }} aria-label="Next day"><Icon.Chevron /></button>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 18 }}>
          <svg width="128" height="128" viewBox="0 0 128 128" aria-label={`${Math.round(tot.calories)} of ${t.calories} calories`}>
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
            <circle cx="64" cy="64" r={r} fill="none" stroke={left < 0 ? 'var(--warn)' : 'var(--copper)'} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
            <text x="64" y="62" textAnchor="middle" style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700, fill: 'var(--ink)' }}>{Math.abs(Math.round(left)).toLocaleString()}</text>
            <text x="64" y="80" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--muted)' }}>{left >= 0 ? 'cal left' : 'cal over'}</text>
          </svg>
          <div className="grow stack" style={{ gap: 10 }}>
            <Macro name="Protein" cls="protein" value={tot.protein} target={t.protein} />
            <Macro name="Carbs" cls="carbs" value={tot.carbs} target={t.carbs} />
            <Macro name="Fat" cls="fat" value={tot.fat} target={t.fat} />
          </div>
        </div>
        <p className="muted tiny" style={{ marginTop: 10 }}>
          {Math.round(tot.calories).toLocaleString()} of {t.calories.toLocaleString()} cal. {t.custom ? 'Custom targets.' : `Estimated maintenance ~${t.maintenance?.toLocaleString()} cal. Change in Settings.`}
        </p>
      </div>

      {MEAL_SLOTS.map((slot) => {
        const items = meals.filter((m) => m.slot === slot)
        const cal = items.reduce((s, m) => s + m.calories, 0)
        return (
          <div className="card" key={slot}>
            <div className="row between">
              <div><h2>{slot}</h2>{items.length > 0 && <p className="muted small num">{Math.round(cal)} cal · {Math.round(items.reduce((s, m) => s + m.protein, 0))} g protein</p>}</div>
              <button className="btn sm" onClick={() => setSheet({ slot })}><Icon.Plus />Add</button>
            </div>
            {items.length > 0 && (
              <div className="list" style={{ marginTop: 8 }}>
                {items.map((m) => (
                  <div className="list-item" key={m.id}>
                    <div className="grow">
                      <h3>{m.name}</h3>
                      <p className="muted small num">P {m.protein} · C {m.carbs} · F {m.fat}</p>
                    </div>
                    <b className="num">{m.calories}</b>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => remove('meals', m.id)} aria-label="Delete"><Icon.X /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {sheet && (
        <MealSheet slot={sheet.slot} date={date} onClose={() => setSheet(null)}
          onSave={(m) => { add('meals', m); notify('Food logged'); setSheet(null) }} />
      )}
    </div>
  )
}

function MealSheet({ slot: initialSlot, date, onClose, onSave }) {
  const { state } = useStore()
  const [slot, setSlot] = useState(initialSlot || defaultSlot())
  const [f, setF] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', servings: '1' })
  const set = (k) => (e) => setF({ ...f, [k]: k === 'name' ? e.target.value : e.target.value.replace(/[^\d.]/g, '') })
  const recents = recentFoods(state.meals)

  const s = Number(f.servings) || 1
  const autoCal = caloriesFromMacros(f.protein, f.carbs, f.fat)
  const cal = Number(f.calories) || autoCal

  const save = () => {
    if (!f.name.trim() || !cal) return
    onSave({
      date, slot, name: f.name.trim() + (s !== 1 ? ` ×${s}` : ''),
      calories: Math.round(cal * s),
      protein: Math.round((Number(f.protein) || 0) * s),
      carbs: Math.round((Number(f.carbs) || 0) * s),
      fat: Math.round((Number(f.fat) || 0) * s),
    })
  }

  return (
    <Sheet title={`Add to ${slot}`} onClose={onClose}>
      <div className="stack">
        <div className="chips">
          {MEAL_SLOTS.map((m) => <button key={m} className={`chip lg ${slot === m ? 'on lift' : ''}`} onClick={() => setSlot(m)}>{m}</button>)}
        </div>

        {recents.length > 0 && (
          <>
            <div className="section-label">Quick add from recent</div>
            <div className="chips">
              {recents.map((m) => (
                <button key={m.id} className="chip lg" onClick={() => onSave({ date, slot, name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat })}>
                  {m.name} · {m.calories}
                </button>
              ))}
            </div>
            <div className="section-label">Or enter something new</div>
          </>
        )}

        <label className="field">Food
          <input className="input" placeholder="e.g. Chicken rice bowl" value={f.name} onChange={set('name')} />
        </label>
        <div className="grid-2">
          <label className="field">Protein (g)<input className="input num" inputMode="decimal" value={f.protein} onChange={set('protein')} /></label>
          <label className="field">Carbs (g)<input className="input num" inputMode="decimal" value={f.carbs} onChange={set('carbs')} /></label>
          <label className="field">Fat (g)<input className="input num" inputMode="decimal" value={f.fat} onChange={set('fat')} /></label>
          <label className="field">Calories<input className="input num" inputMode="decimal" placeholder={autoCal ? String(autoCal) : ''} value={f.calories} onChange={set('calories')} /></label>
        </div>
        <label className="field">Servings<input className="input num" inputMode="decimal" value={f.servings} onChange={set('servings')} /></label>
        <p className="muted small">Leave calories blank and it's calculated from the macros (protein and carbs are 4 cal per gram, fat is 9).</p>
        <button className="btn primary block" onClick={save} disabled={!f.name.trim() || !cal}><Icon.Check />Log {cal ? `${Math.round(cal * s)} cal` : ''}</button>
      </div>
    </Sheet>
  )
}
