// Weight trend math

export const DAY = 86400000
export const parseDate = (s) => new Date(s + 'T12:00:00')

export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const fmtDate = (s, opts = { month: 'short', day: 'numeric' }) => parseDate(s).toLocaleDateString(undefined, opts)

// Sorted weigh-ins with a 7 day rolling average ("trend") that smooths out water weight swings
export function withTrend(weights) {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((w, i) => {
    const t = parseDate(w.date).getTime()
    const window = sorted.slice(0, i + 1).filter((x) => t - parseDate(x.date).getTime() < 7 * DAY)
    const trend = window.reduce((s, x) => s + x.weight, 0) / window.length
    return { ...w, trend: Math.round(trend * 10) / 10 }
  })
}

// Pounds per week over the last 28 days (least squares slope). Negative = losing.
export function weeklyRate(trendPoints) {
  if (trendPoints.length < 2) return null
  const lastT = parseDate(trendPoints.at(-1).date).getTime()
  const pts = trendPoints.filter((p) => lastT - parseDate(p.date).getTime() <= 28 * DAY)
  if (pts.length < 2) return null
  const xs = pts.map((p) => parseDate(p.date).getTime() / (7 * DAY))
  const ys = pts.map((p) => p.weight)
  const mx = xs.reduce((a, b) => a + b) / xs.length
  const my = ys.reduce((a, b) => a + b) / ys.length
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  if (!den) return null
  return Math.round((num / den) * 100) / 100
}

export function weightSummary(profile, weights) {
  const pts = withTrend(weights)
  const start = profile.startWeight
  const goal = profile.goalWeight
  const current = pts.length ? pts.at(-1).trend : start
  const lost = Math.round((start - current) * 10) / 10
  const toGo = Math.max(0, Math.round((current - goal) * 10) / 10)
  const pct = start > goal ? Math.min(100, Math.max(0, ((start - current) / (start - goal)) * 100)) : 0
  const rate = weeklyRate(pts)

  // Sustainable fat loss that protects muscle: about 0.5% to 1% of body weight per week
  const idealLow = Math.round(current * 0.005 * 10) / 10
  const idealHigh = Math.round(current * 0.01 * 10) / 10

  let eta = null
  if (rate && rate < 0 && toGo > 0) {
    eta = new Date(Date.now() + (toGo / -rate) * 7 * DAY)
  }

  let rateStatus = 'none'
  if (rate != null) {
    const loss = -rate
    if (loss > idealHigh) rateStatus = 'fast'
    else if (loss >= idealLow) rateStatus = 'good'
    else rateStatus = 'slow'
  }

  return { pts, start, goal, current, lost, toGo, pct, rate, eta, idealLow, idealHigh, rateStatus }
}
