// Food lookup.
// 1. Built in: USDA National Nutrient Database for Standard Reference (SR28, public domain), ~8,400 foods,
//    values per 100 g plus common household servings. Loaded on demand from /foods.json.
// 2. Online: Open Food Facts (open database of packaged and branded products), searched from the browser.

let cache = null
export async function loadFoods() {
  if (cache) return cache
  const res = await fetch(`${import.meta.env.BASE_URL}foods.json`)
  const data = await res.json()
  cache = data.foods.map(([name, kcal, protein, carbs, fat, fiber, units], i) => ({
    id: 'u' + i, name, kcal, protein, carbs, fat, fiber, source: 'USDA',
    units: units.map(([label, g]) => ({ label: label.replace(/\s+/g, ' ').trim(), g })),
    search: name.toLowerCase(),
  }))
  return cache
}

// Everyday staples shown before you type. Matched to USDA names by prefix.
export const COMMON = [
  ['Chicken breast', 'Chicken, broilers or fryers, breast, meat only, cooked, roasted'],
  ['Ground beef 90/10', 'Beef, ground, 90% lean meat / 10% fat, crumbles, cooked, pan-browned'],
  ['Ground turkey', 'Ground turkey, cooked'],
  ['Salmon', 'Fish, salmon, Atlantic, farmed, cooked, dry heat'],
  ['Tuna, canned', 'Fish, tuna, light, canned in water, drained solids'],
  ['Eggs', 'Egg, whole, cooked, hard-boiled'],
  ['Egg whites', 'Egg, white, raw, fresh'],
  ['White rice', 'Rice, white, long-grain, regular, enriched, cooked'],
  ['Brown rice', 'Rice, brown, long-grain, cooked'],
  ['Oats', 'Cereals, oats, regular and quick, not fortified, dry'],
  ['Pasta', 'Pasta, cooked, enriched, without added salt'],
  ['Whole wheat bread', 'Bread, whole-wheat, commercially prepared'],
  ['Flour tortilla', 'Tortillas, ready-to-bake or -fry, flour, refrigerated'],
  ['Potato', 'Potatoes, baked, flesh and skin, without salt'],
  ['Sweet potato', 'Sweet potato, cooked, baked in skin, flesh, without salt'],
  ['Black beans', 'Beans, black, mature seeds, cooked, boiled, without salt'],
  ['Broccoli', 'Broccoli, cooked, boiled, drained, without salt'],
  ['Spinach', 'Spinach, raw'],
  ['Banana', 'Bananas, raw'],
  ['Apple', 'Apples, raw, with skin'],
  ['Blueberries', 'Blueberries, raw'],
  ['Strawberries', 'Strawberries, raw'],
  ['Avocado', 'Avocados, raw, California'],
  ['Greek yogurt', 'Yogurt, Greek, plain, nonfat'],
  ['Cottage cheese', 'Cheese, cottage, lowfat, 2% milkfat'],
  ['Milk 2%', 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A'],
  ['Cheddar', 'Cheese, cheddar'],
  ['Peanut butter', 'Peanut butter, smooth style, with salt'],
  ['Almonds', 'Nuts, almonds'],
  ['Olive oil', 'Oil, olive, salad or cooking'],
  ['Butter', 'Butter, salted'],
  ['Whey protein', 'Beverages, Protein powder whey based'],
]

export function commonFoods(foods) {
  return COMMON.map(([label, prefix]) => {
    const f = foods.find((x) => x.name.startsWith(prefix))
    return f ? { ...f, short: label } : null
  }).filter(Boolean)
}

// Rank: every word has to start a word in the name. Whole word matches beat partial ones
// ("egg" finds eggs before eggplant), everyday staples come first, and brand or restaurant items sink.
let staple = null
const isLetter = (c) => c >= 'a' && c <= 'z'
function wordHit(text, w) {
  let best = null
  for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) {
    if (i > 0 && isLetter(text[i - 1])) continue
    const rest = text.slice(i + w.length)
    const whole = !isLetter(rest[0] || ' ') || /^(e?s)([^a-z]|$)/.test(rest)
    const cost = (whole ? 0 : 45) + i * 0.5
    if (best == null || cost < best) best = cost
    if (whole) break
  }
  return best
}

export function searchFoods(foods, query, limit = 40) {
  const words = query.toLowerCase().replace(/\boatmeal\b/g, 'oats').replace(/\byoghurt\b/g, 'yogurt').split(/[\s,]+/).filter(Boolean)
  if (!words.length) return []
  staple ||= new Set(commonFoods(foods).map((f) => f.name))
  const out = []
  for (const f of foods) {
    let score = 0
    let ok = true
    for (const w of words) {
      const c = wordHit(f.search, w)
      if (c == null) { ok = false; break }
      score += c
    }
    if (!ok) continue
    if (staple.has(f.name)) score -= 120
    if (/\b[A-Z]{3,}/.test(f.name)) score += 35
    if (/restaurant|fast foods|babyfood|school lunch/.test(f.search)) score += 60
    score += f.name.length * 0.4
    out.push([score, f])
  }
  return out.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1])
}

// Units for the amount picker: the food's household servings, plus grams and ounces
export function unitsFor(food) {
  return [...food.units, { label: 'g', g: 1 }, { label: 'oz', g: 28.35 }]
}

export function macrosFor(food, grams) {
  const k = grams / 100
  return {
    calories: Math.round(food.kcal * k),
    protein: Math.round(food.protein * k * 10) / 10,
    carbs: Math.round(food.carbs * k * 10) / 10,
    fat: Math.round(food.fat * k * 10) / 10,
  }
}

// Friendly short name: what you searched for, or the first part of the USDA name
export function shortName(food, query = '') {
  if (food.short) return food.short
  if (food.source === 'OFF') return food.name
  const q = query.trim()
  if (q) return q.charAt(0).toUpperCase() + q.slice(1)
  return food.name.split(',')[0]
}

// Packaged and branded foods from Open Food Facts. Runs in the browser; needs an internet connection.
export async function searchOnline(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=24&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const data = await res.json()
    return (data.products || [])
      .map((p) => {
        const n = p.nutriments || {}
        const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null)
        if (kcal == null || !p.product_name) return null
        const units = p.serving_quantity ? [{ label: `1 serving (${p.serving_size || `${p.serving_quantity} g`})`, g: Number(p.serving_quantity) }] : []
        return {
          id: 'off' + p.code, source: 'OFF', name: [p.brands?.split(',')[0], p.product_name].filter(Boolean).join(' · '),
          kcal: Math.round(kcal), protein: +(n.proteins_100g || 0), carbs: +(n.carbohydrates_100g || 0), fat: +(n.fat_100g || 0), fiber: +(n.fiber_100g || 0),
          units,
        }
      })
      .filter(Boolean)
  } finally {
    clearTimeout(t)
  }
}
