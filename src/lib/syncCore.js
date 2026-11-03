import { mergeStates, cloudCopy, sameData } from './merge.js'

export const TABLE = 'app_data'

/**
 * One sync pass: pull, merge, apply locally if changed, upload if the cloud is behind.
 * Returns the merged data. Throws on network or database errors.
 */
export async function syncOnce({ client, userId, getLocal, applyLocal }) {
  const { data: row, error: e1 } = await client.from(TABLE).select('data').eq('user_id', userId).maybeSingle()
  if (e1) throw e1
  const local = getLocal()
  const remote = row?.data || null
  const merged = mergeStates(local, remote)
  if (!sameData(merged, local)) applyLocal(merged)
  if (!remote || !sameData(merged, remote)) {
    const { error: e2 } = await client.from(TABLE).upsert({ user_id: userId, data: cloudCopy(merged), updated_at: new Date().toISOString() })
    if (e2) throw e2
  }
  return merged
}
