// Daily calorie + macro targets for fat loss while keeping (and building) muscle.
//
// 1. Estimate maintenance calories with the Mifflin St Jeor formula (needs height, age, sex).
//    If those aren't set, fall back to about 13 calories per lb of body weight.
// 2. Multiply by 1.55 for 6 training sessions a week.
// 3. Subtract 20% (capped at 750 cal) for a steady deficit.
// 4. Protein: 1 g per lb of GOAL weight. This is the big one for keeping muscle.
// 5. Fat: 25% of calories. Carbs: whatever is left (fuel for runs and lifts).

export function computeTargets(profile, currentWeight) {
  if (profile.targets?.custom) return profile.targets

  const lb = currentWeight || profile.startWeight
  const kg = lb * 0.4536
  let maintenance
  if (profile.heightIn && profile.age) {
    const cm = profile.heightIn * 2.54
    const bmr = 10 * kg + 6.25 * cm - 5 * profile.age + (profile.sex === 'female' ? -161 : 5)
    maintenance = bmr * 1.55
  } else {
    maintenance = lb * 13
  }
  const deficit = Math.min(750, maintenance * 0.2)
  const calories = Math.round((maintenance - deficit) / 10) * 10
  const protein = Math.round(profile.goalWeight || lb * 0.75)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return { calories, protein, carbs, fat, maintenance: Math.round(maintenance), custom: false }
}

export const caloriesFromMacros = (p, c, f) => Math.round((Number(p) || 0) * 4 + (Number(c) || 0) * 4 + (Number(f) || 0) * 9)

export function dayTotals(meals, date) {
  return meals
    .filter((m) => m.date === date)
    .reduce((t, m) => ({
      calories: t.calories + (m.calories || 0),
      protein: t.protein + (m.protein || 0),
      carbs: t.carbs + (m.carbs || 0),
      fat: t.fat + (m.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

// Unique foods you've logged before, most recent first, for one-tap re-logging
export function recentFoods(meals, limit = 12) {
  const seen = new Set()
  const out = []
  for (const m of [...meals].sort((a, b) => (b.ts || 0) - (a.ts || 0))) {
    const k = m.name.trim().toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(m)
    if (out.length >= limit) break
  }
  return out
}

export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
