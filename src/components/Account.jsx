import { useEffect, useState } from 'react'
import { useSync } from '../lib/sync.jsx'

// Google's "G" mark, as used on Sign in with Google buttons
export const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

export function GoogleButton({ label = 'Sign in with Google' }) {
  const { signIn } = useSync()
  return <button className="btn google-btn block" onClick={signIn}><GoogleG />{label}</button>
}

function ago(d, now) {
  const s = Math.round((now - d) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} sec ago`
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function AccountCard() {
  const { configured, user, status, error, lastSync, signOut, syncNow } = useSync()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t) }, [])

  if (!configured) {
    return (
      <div className="card stack">
        <h2>Account</h2>
        <p className="muted small">Cloud sync isn't set up on this version of the app. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the hosting settings and redeploy.</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card stack">
        <h2>Account</h2>
        <p className="muted small">Sign in to back up everything you log and use the app on your phone and computer. Nothing you've logged on this device is lost: it's merged into your account.</p>
        <GoogleButton />
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
      </div>
    )
  }

  const meta = user.user_metadata || {}
  const name = meta.full_name || meta.name || user.email
  const line = {
    syncing: 'Syncing…',
    synced: lastSync ? `Synced · ${ago(lastSync, now)}` : 'Synced',
    offline: "Offline. Changes are saved on this device and sync when you're back online.",
    error: error || 'Sync problem. Try again.',
    idle: 'Connecting…',
  }[status]

  return (
    <div className="card stack">
      <h2>Account</h2>
      <div className="row" style={{ gap: 12 }}>
        {meta.avatar_url
          ? <img className="avatar" src={meta.avatar_url} alt="" referrerPolicy="no-referrer" />
          : <span className="avatar">{(name || '?').charAt(0).toUpperCase()}</span>}
        <div className="grow">
          <p style={{ fontWeight: 600 }}>{name}</p>
          {meta.full_name && <p className="muted tiny">{user.email}</p>}
        </div>
      </div>
      <p className={`small sync-line ${status}`}><span className="sync-dot" />{line}</p>
      <div className="row">
        <button className="btn sm" onClick={syncNow} disabled={status === 'syncing'}>Sync now</button>
        <button className="btn sm ghost danger" onClick={() => confirm('Sign out? Your data stays on this device and in your account.') && signOut()}>Sign out</button>
      </div>
    </div>
  )
}
