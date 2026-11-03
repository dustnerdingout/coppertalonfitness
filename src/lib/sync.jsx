import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useStore } from './store.jsx'
import { supabase } from './supabase.js'
import { syncOnce } from './syncCore.js'

/**
 * Google sign in + cloud sync.
 * One row per user in `app_data` holds the whole app (minus the in-progress workout).
 * Every sync: pull the cloud copy, merge it with this device, apply locally if anything changed,
 * and upload if the cloud is behind. Runs on sign in, 2 s after local changes, when the app comes
 * back into view, when the connection returns, and every 30 s while open.
 */
const Ctx = createContext({ configured: false })

export function SyncProvider({ children, client = supabase }) {
  const { state, applySynced } = useStore()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('idle') // idle | syncing | synced | offline | error
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const stateRef = useRef(state)
  const busy = useRef(false)
  const again = useRef(false)
  stateRef.current = state

  // Session: restore on load and follow sign in / sign out
  useEffect(() => {
    if (!client) return
    client.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = client.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [client])

  const sync = useCallback(async () => {
    if (!client || !user) return
    if (busy.current) { again.current = true; return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setStatus('offline'); return }
    busy.current = true
    setStatus('syncing')
    try {
      // a stalled connection (gym wifi, dead zone) shouldn't leave the app stuck on "Syncing…"
      let timer
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('network timeout')), 15000) })
      try {
        await Promise.race([syncOnce({ client, userId: user.id, getLocal: () => stateRef.current, applyLocal: applySynced }), timeout])
      } finally { clearTimeout(timer) }
      setStatus('synced'); setError(''); setLastSync(new Date())
    } catch (e) {
      const msg = String(e?.message || e)
      const offline = /fetch|network|timeout|Load failed/i.test(msg)
      setStatus(offline ? 'offline' : 'error')
      setError(offline ? '' : /relation .* does not exist|app_data/i.test(msg) ? 'The app_data table is missing. Run supabase/schema.sql in the Supabase SQL editor.' : msg)
    } finally {
      busy.current = false
      if (again.current) { again.current = false; setTimeout(() => sync(), 300) }
    }
  }, [client, user, applySynced])

  // On sign in
  useEffect(() => { if (user) sync() }, [user, sync])

  // 2 s after a local change
  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => sync(), 2000)
    return () => clearTimeout(t)
  }, [state.updatedAt, user, sync])

  // Back in view, back online, and every 30 s while open
  useEffect(() => {
    if (!user) return
    const onVis = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', sync)
    window.addEventListener('focus', sync)
    const t = setInterval(() => document.visibilityState === 'visible' && sync(), 30000)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', sync); window.removeEventListener('focus', sync); clearInterval(t) }
  }, [user, sync])

  const signIn = useCallback(async () => {
    if (!client) return
    setError('')
    const { error: e } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
    if (e) { setStatus('error'); setError(e.message) }
  }, [client])

  const signOut = useCallback(async () => {
    if (!client) return
    await sync()
    await client.auth.signOut()
    setUser(null); setStatus('idle'); setLastSync(null)
  }, [client, sync])

  return (
    <Ctx.Provider value={{ configured: !!client, user, status, error, lastSync, signIn, signOut, syncNow: sync }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSync = () => useContext(Ctx)
