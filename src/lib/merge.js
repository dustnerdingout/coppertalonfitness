// Merging two copies of the app's data (this device and the cloud).
//
// Records (lifts, runs, meals, weigh-ins, mobility, recipes) are merged one by one by id:
//   - present on either side -> kept
//   - same id on both sides  -> the most recently edited copy wins
//   - deleted on either side -> stays deleted (tombstones in `deleted`)
//   - older than an "erase all data" (wipedAt) -> dropped
// Everything else (profile, schedule, settings, plans) comes from whichever side changed most recently.

export const RECORD_KEYS = ['weights', 'lifts', 'runs', 'mobility', 'meals', 'recipes']
const META = new Set([...RECORD_KEYS, 'deleted', 'wipedAt', 'updatedAt', 'draft'])
const editedAt = (x) => x._u || x.ts || 0

export function mergeStates(local, remote) {
  if (!remote) return local
  if (!local) return remote
  const deleted = { ...(remote.deleted || {}), ...(local.deleted || {}) }
  const wipedAt = Math.max(local.wipedAt || 0, remote.wipedAt || 0)
  const newer = (local.updatedAt || 0) >= (remote.updatedAt || 0) ? local : remote

  const out = {}
  for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) {
    if (META.has(k)) continue
    out[k] = k in newer ? newer[k] : (local[k] ?? remote[k])
  }
  for (const k of RECORD_KEYS) {
    const byId = new Map()
    for (const x of [...(remote[k] || []), ...(local[k] || [])]) {
      if (!x || deleted[x.id]) continue
      if (wipedAt && editedAt(x) < wipedAt) continue
      const prev = byId.get(x.id)
      if (!prev || editedAt(x) >= editedAt(prev)) byId.set(x.id, x)
    }
    out[k] = [...byId.values()]
  }
  out.deleted = deleted
  out.wipedAt = wipedAt
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0)
  return out
}

// The part of the state that gets uploaded (the in-progress workout stays on this device)
export const cloudCopy = (state) => {
  const { draft, ...rest } = state
  return rest
}

// Stable comparison so we only upload or apply when something actually changed
export const sameData = (a, b) => JSON.stringify(cloudCopy(a || {})) === JSON.stringify(cloudCopy(b || {}))
