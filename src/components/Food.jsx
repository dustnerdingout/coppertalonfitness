import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { computeTargets, dayTotals, recentFoods, caloriesFromMacros, MEAL_SLOTS } from '../lib/nutrition.js'
import { todayStr, weightSummary, parseDate, DAY } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { Seg, Sheet } from './ui.jsx'
import { loadFoods, searchFoods, commonFoods, unitsFor, macrosFor, shortName, searchOnline } from '../lib/foods.js'

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
  const baseName = (n) => n.replace(/ \(\d+(\.\d+)? servings?\)$/, '')
  const saved = (m) => (state.recipes || []).some((r) => r.name === baseName(m.name))
  const saveAsRecipe = (m) => {
    if (saved(m)) return notify('Already in your recipes')
    add('recipes', {
      name: baseName(m.name), servings: 1, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      items: m.items || [{ name: m.name, amount: '1 serving', calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat }],
    })
    notify('Saved to recipes')
  }
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
                      {m.items?.length > 1 && <p className="muted tiny">{m.items.map((i) => `${i.name} ${i.amount}`).join(' · ')}</p>}
                      {m.items?.length === 1 && <p className="muted tiny">{m.items[0].amount}</p>}
                      <p className="muted small num">P {m.protein} · C {m.carbs} · F {m.fat}</p>
                    </div>
                    <b className="num">{m.calories}</b>
                    <button className={`icon-btn ${saved(m) ? 'saved' : ''}`} style={{ width: 32, height: 32 }} onClick={() => saveAsRecipe(m)} aria-label="Save as recipe"><Icon.Bookmark /></button>
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
  const [mode, setMode] = useState('search')
  const [items, setItems] = useState([]) // ingredients in this meal
  const [mealName, setMealName] = useState('')
  const [asRecipe, setAsRecipe] = useState(false)
  const [servings, setServings] = useState('1')
  const [editingId, setEditingId] = useState(null) // recipe being edited
  const { add, update } = useStore()

  const total = items.reduce((t, i) => ({
    calories: t.calories + i.calories, protein: t.protein + i.protein, carbs: t.carbs + i.carbs, fat: t.fat + i.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const defaultName = items.length === 1 ? items[0].name : items.map((i) => i.name).join(', ')
  const n = Math.max(0.5, Number(servings) || 1)
  const perServing = (asRecipe || editingId) && n !== 1

  const saveRecipe = () => {
    const recipe = {
      name: mealName.trim() || defaultName, servings: n, items,
      calories: Math.round(total.calories), protein: Math.round(total.protein), carbs: Math.round(total.carbs), fat: Math.round(total.fat),
    }
    if (editingId) update((s) => ({ recipes: s.recipes.map((r) => (r.id === editingId ? { ...r, ...recipe } : r)) }))
    else add('recipes', recipe)
    return recipe
  }

  const logMeal = () => {
    if (!items.length) return
    const name = mealName.trim() || defaultName
    if (asRecipe || editingId) saveRecipe()
    const k = perServing ? 1 / n : 1
    onSave({
      date, slot, name: perServing ? `${name} (1 serving)` : name,
      calories: Math.round(total.calories * k), protein: Math.round(total.protein * k), carbs: Math.round(total.carbs * k), fat: Math.round(total.fat * k),
      items,
    })
  }

  const editRecipe = (r) => {
    setItems(r.items); setMealName(r.name); setServings(String(r.servings || 1)); setEditingId(r.id); setAsRecipe(true); setMode('search')
  }

  return (
    <Sheet title={`Add to ${slot}`} onClose={onClose}>
      <div className="stack">
        <div className="chips">
          {MEAL_SLOTS.map((m) => <button key={m} className={`chip lg ${slot === m ? 'on lift' : ''}`} onClick={() => setSlot(m)}>{m}</button>)}
        </div>
        <Seg options={[['search', 'Search foods'], ['recipes', `Recipes${state.recipes?.length ? ` (${state.recipes.length})` : ''}`], ['manual', 'Quick add']]} value={mode} onChange={setMode} />

        {mode === 'search' ? (
          <>
            {items.length > 0 && (
              <div className="card meal-build">
                <div className="row between"><h3>This meal</h3><b className="num">{Math.round(total.calories)} cal</b></div>
                <div className="list">
                  {items.map((it, i) => (
                    <div className="list-item" key={i}>
                      <div className="grow">
                        <p style={{ fontWeight: 500 }}>{it.name}</p>
                        <p className="muted tiny num">{it.amount} · P {it.protein} · C {it.carbs} · F {it.fat}</p>
                      </div>
                      <span className="num">{it.calories}</span>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove"><Icon.X /></button>
                    </div>
                  ))}
                </div>
                <p className="muted tiny num" style={{ marginTop: 6 }}>Protein {Math.round(total.protein)} g · Carbs {Math.round(total.carbs)} g · Fat {Math.round(total.fat)} g</p>
              </div>
            )}
            <FoodSearch date={date} slot={slot} recents={recentFoods(state.meals)} onPick={(it) => setItems((x) => [...x, it])} onRelog={onSave} />
            {items.length > 0 && (
              <div className="sheet-sticky">
                <input className="input" placeholder={asRecipe || editingId ? `Recipe name: ${defaultName}` : items.length > 1 ? 'Name this meal (optional)' : items[0].name} value={mealName} onChange={(e) => setMealName(e.target.value)} />
                <div className="row between">
                  {editingId ? <span className="small" style={{ fontWeight: 600 }}>Editing recipe</span> : (
                    <label className="toggle small"><input type="checkbox" checked={asRecipe} onChange={(e) => setAsRecipe(e.target.checked)} />Save as recipe</label>
                  )}
                  {(asRecipe || editingId) && (
                    <label className="row small" style={{ gap: 6 }}>Makes
                      <input className="input num serv-input" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value.replace(/[^\d.]/g, ''))} />
                      servings
                    </label>
                  )}
                </div>
                <div className="row">
                  {editingId && <button className="btn grow" onClick={() => { saveRecipe(); onClose() }}>Save changes</button>}
                  <button className="btn primary grow" onClick={logMeal}><Icon.Check />Log {perServing ? `1 serving · ${Math.round(total.calories / n)}` : `${items.length > 1 ? `${items.length} items · ` : ''}${Math.round(total.calories)}`} cal</button>
                </div>
              </div>
            )}
          </>
        ) : mode === 'recipes' ? (
          <RecipeList date={date} slot={slot} onSave={onSave} onEdit={editRecipe} />
        ) : (
          <ManualEntry date={date} slot={slot} onSave={onSave} />
        )}
      </div>
    </Sheet>
  )
}

const fmtQty = (n) => (Math.round(n * 100) / 100).toString()

function FoodSearch({ date, slot, recents, onPick, onRelog }) {
  const [foods, setFoods] = useState(null)
  const [query, setQuery] = useState('')
  const [picking, setPicking] = useState(null) // { food, unit index, qty }
  const [online, setOnline] = useState({ state: 'idle', results: [] })

  useEffect(() => { loadFoods().then(setFoods).catch(() => setFoods([])) }, [])
  useEffect(() => { setOnline({ state: 'idle', results: [] }) }, [query])

  const results = useMemo(() => (foods && query.trim().length >= 2 ? searchFoods(foods, query) : []), [foods, query])
  const common = useMemo(() => (foods ? commonFoods(foods) : []), [foods])

  const pick = (food) => {
    const units = unitsFor(food)
    const hasServing = food.units.length > 0
    const staple = common.find((c) => c.name === food.name)
    setPicking({ food, short: staple ? staple.short : shortName(food, query), unit: hasServing ? 0 : units.length - 2, qty: hasServing ? 1 : 100 })
  }

  const goOnline = async () => {
    setOnline({ state: 'loading', results: [] })
    try {
      const r = await searchOnline(query.trim())
      setOnline({ state: 'done', results: r })
    } catch {
      setOnline({ state: 'error', results: [] })
    }
  }

  if (picking) {
    const { food } = picking
    const units = unitsFor(food)
    const u = units[picking.unit]
    const grams = u.g * (Number(picking.qty) || 0)
    const m = macrosFor(food, grams)
    const step = u.label === 'g' ? 10 : u.label === 'oz' ? 1 : 0.5
    const q = Number(picking.qty) || 0
    const amount = u.label === 'g' || u.label === 'oz' ? `${fmtQty(q)} ${u.label}` : q === 1 ? u.label : `${fmtQty(q)} × ${u.label}`
    return (
      <div className="card stack">
        <div>
          <h3>{picking.short}</h3>
          <p className="muted tiny">{food.name}</p>
        </div>
        <div className="amount-row">
          <button className="icon-btn" onClick={() => setPicking({ ...picking, qty: Math.max(0, (Number(picking.qty) || 0) - step) })} aria-label="Less">−</button>
          <input className="input num" inputMode="decimal" value={picking.qty} onChange={(e) => setPicking({ ...picking, qty: e.target.value.replace(/[^\d.]/g, '') })} />
          <button className="icon-btn" onClick={() => setPicking({ ...picking, qty: (Number(picking.qty) || 0) + step })} aria-label="More">+</button>
          <select className="input" value={picking.unit} onChange={(e) => {
            const ni = Number(e.target.value); const nu = units[ni]
            setPicking({ ...picking, unit: ni, qty: nu.label === 'g' ? Math.round(grams) || 100 : nu.label === 'oz' ? Math.round((grams / 28.35) * 10) / 10 || 4 : 1 })
          }}>
            {units.map((x, i) => <option key={i} value={i}>{x.label === 'g' || x.label === 'oz' ? x.label : `${x.label} (${Math.round(x.g)} g)`}</option>)}
          </select>
        </div>
        <div className="macro-preview num">
          <div><b>{m.calories}</b><span>cal</span></div>
          <div><b>{m.protein}</b><span>protein</span></div>
          <div><b>{m.carbs}</b><span>carbs</span></div>
          <div><b>{m.fat}</b><span>fat</span></div>
        </div>
        <p className="muted tiny">{Math.round(grams)} g · {food.kcal} cal per 100 g · {food.source === 'OFF' ? 'Open Food Facts' : 'USDA'}</p>
        <div className="row">
          <button className="btn grow" onClick={() => setPicking(null)}>Back</button>
          <button className="btn primary grow" disabled={!grams} onClick={() => {
            onPick({ name: picking.short, food: food.name, amount, grams: Math.round(grams), ...m })
            setPicking(null); setQuery('')
          }}><Icon.Plus />Add</button>
        </div>
      </div>
    )
  }

  const row = (f, tag) => (
    <button key={f.id} className="food-row" onClick={() => pick(f)}>
      <div className="grow">
        <p className="food-name">{f.short || f.name}</p>
        <p className="muted tiny">{f.short ? f.name : ''}{f.units[0] ? `${f.short ? ' · ' : ''}${f.units[0].label}: ${Math.round((f.kcal * f.units[0].g) / 100)} cal` : `${f.short ? ' · ' : ''}${f.kcal} cal per 100 g`}</p>
      </div>
      {tag && <span className="pill">{tag}</span>}
      <Icon.Plus />
    </button>
  )

  return (
    <div className="stack">
      <div className="search-box">
        <Icon.Search />
        <input className="input" placeholder="Search foods: chicken breast, rice, banana…" value={query} autoFocus onChange={(e) => setQuery(e.target.value)} />
      </div>

      {!foods && <p className="muted small center">Loading food database…</p>}

      {foods && query.trim().length < 2 && (
        <>
          {recents.length > 0 && (
            <>
              <div className="section-label">Log again</div>
              <div className="chips">
                {recents.slice(0, 8).map((m) => (
                  <button key={m.id} className="chip lg" onClick={() => onRelog({ date, slot, name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, ...(m.items ? { items: m.items } : {}) })}>
                    {m.name} · {m.calories}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="section-label">Common foods</div>
          <div className="card food-list">{common.map((f) => row(f))}</div>
        </>
      )}

      {foods && query.trim().length >= 2 && (
        <>
          {results.length ? <div className="card food-list">{results.map((f) => row(f))}</div> : <p className="muted small center">No matches in the built in list.</p>}
          {online.state === 'idle' && <button className="btn block" onClick={goOnline}><Icon.Search />Search packaged foods online</button>}
          {online.state === 'loading' && <p className="muted small center">Searching Open Food Facts…</p>}
          {online.state === 'error' && <p className="muted small center">Couldn't reach the online database. Check your connection and try again.</p>}
          {online.state === 'done' && (online.results.length
            ? <><div className="section-label">Packaged foods</div><div className="card food-list">{online.results.map((f) => row(f, 'Online'))}</div></>
            : <p className="muted small center">No packaged foods found.</p>)}
        </>
      )}
      <p className="muted tiny center">Nutrition data: USDA FoodData (SR28) and Open Food Facts.</p>
    </div>
  )
}

function RecipeList({ date, slot, onSave, onEdit }) {
  const { state, remove } = useStore()
  const recipes = [...(state.recipes || [])].sort((a, b) => a.name.localeCompare(b.name))
  const [open, setOpen] = useState(null)
  const [qty, setQty] = useState(1)
  const [q, setQ] = useState('')
  const shown = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))

  if (!recipes.length) {
    return (
      <div className="card empty">
        <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No recipes yet</p>
        <p className="small" style={{ marginTop: 6 }}>Build a meal in Search foods and tick "Save as recipe", or tap the bookmark on any meal you've logged.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      {recipes.length > 6 && (
        <div className="search-box"><Icon.Search /><input className="input" placeholder="Search your recipes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      )}
      <div className="card food-list">
        {shown.map((r) => {
          const per = (k) => Math.round((r[k] / (r.servings || 1)) * qty)
          const isOpen = open === r.id
          return (
            <div key={r.id} className={`recipe ${isOpen ? 'open' : ''}`}>
              <button className="food-row" onClick={() => { setOpen(isOpen ? null : r.id); setQty(1) }}>
                <div className="grow">
                  <p className="food-name">{r.name}</p>
                  <p className="muted tiny">{r.items.length} item{r.items.length === 1 ? '' : 's'} · {Math.round(r.calories / (r.servings || 1))} cal per serving{r.servings > 1 ? ` · makes ${r.servings}` : ''}</p>
                </div>
                <Icon.Chevron />
              </button>
              {isOpen && (
                <div className="recipe-body stack">
                  <p className="muted tiny">{r.items.map((i) => `${i.name} ${i.amount}`).join(' · ')}</p>
                  <div className="row">
                    <span className="small grow">Servings</span>
                    <div className="amount-row" style={{ gridTemplateColumns: '40px 70px 40px' }}>
                      <button className="icon-btn" onClick={() => setQty(Math.max(0.5, qty - 0.5))} aria-label="Less">−</button>
                      <input className="input num" value={qty} readOnly />
                      <button className="icon-btn" onClick={() => setQty(qty + 0.5)} aria-label="More">+</button>
                    </div>
                  </div>
                  <div className="macro-preview num">
                    <div><b>{per('calories')}</b><span>cal</span></div>
                    <div><b>{per('protein')}</b><span>protein</span></div>
                    <div><b>{per('carbs')}</b><span>carbs</span></div>
                    <div><b>{per('fat')}</b><span>fat</span></div>
                  </div>
                  <div className="row">
                    <button className="btn sm ghost danger" onClick={() => confirm(`Delete "${r.name}"?`) && remove('recipes', r.id)}><Icon.Trash />Delete</button>
                    <button className="btn sm" onClick={() => onEdit(r)}>Edit</button>
                    <button className="btn primary grow" onClick={() => onSave({
                      date, slot, name: qty === 1 && r.servings === 1 ? r.name : `${r.name} (${qty} serving${qty === 1 ? '' : 's'})`,
                      calories: per('calories'), protein: per('protein'), carbs: per('carbs'), fat: per('fat'), items: r.items,
                    })}><Icon.Check />Log {per('calories')} cal</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ManualEntry({ date, slot, onSave }) {
  const [f, setF] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', servings: '1' })
  const set = (k) => (e) => setF({ ...f, [k]: k === 'name' ? e.target.value : e.target.value.replace(/[^\d.]/g, '') })
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
    <div className="stack">
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
  )
}
