import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { todayStr } from '../lib/stats.js'
import { Icon } from './Icons.jsx'
import { GoogleButton } from './Account.jsx'
import { useSync } from '../lib/sync.jsx'

export default function Onboarding() {
  const { update } = useStore()
  const sync = useSync()
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState('')
  const n = (v) => v.replace(/[^\d.]/g, '')
  const w = Number(weight)
  const g = Number(goal) || (w ? w - 80 : 0)

  const start = () => {
    if (!w || !g) return
    const date = todayStr()
    update(() => ({
      profile: { name: name.trim(), startWeight: w, goalWeight: g, startDate: date },
      weights: [{ id: date, date, weight: w }],
    }))
  }

  return (
    <div className="onboard stack-lg">
      <div className="brand"><Icon.Logo /><span className="eyebrow">Copper Talon</span></div>
      <div className="stack">
        <h1 style={{ fontSize: 34 }}>Lose the fat.<br />Keep the muscle.</h1>
        <p className="muted">Track lifts, runs, weight, and food. The app tells you what to lift next time and how far to run, so every week you get a little better.</p>
      </div>
      <div className="card stack">
        <label className="field">First name<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" /></label>
        <div className="grid-2">
          <label className="field">Current weight (lb)<input className="input num" inputMode="decimal" value={weight} onChange={(e) => setWeight(n(e.target.value))} /></label>
          <label className="field">Goal weight (lb)<input className="input num" inputMode="decimal" value={goal} placeholder={w ? String(w - 80) : ''} onChange={(e) => setGoal(n(e.target.value))} /></label>
        </div>
        {w > 0 && g > 0 && <p className="muted small">That's <b>{Math.round(w - g)} lb</b> to lose. At a healthy 1 to 2 lb a week, expect roughly {Math.round((w - g) / 2)} to {Math.round(w - g)} weeks.</p>}
        <button className="btn primary block" onClick={start} disabled={!w || !g}>Let's go</button>
      </div>
      {sync.configured && !sync.user && (
        <div className="stack" style={{ gap: 10 }}>
          <p className="muted small center">Already using Copper Talon on another device?</p>
          <GoogleButton label="Sign in with Google to restore" />
        </div>
      )}
      {sync.user && <p className="muted small center">{sync.status === 'syncing' ? 'Looking for your data…' : `Signed in as ${sync.user.email}. No saved data yet, so set up your profile above.`}</p>}
      <p className="muted tiny center">{sync.user ? 'Everything you log syncs to your account.' : 'Your data stays on this device unless you sign in. Back it up anytime from Settings.'}</p>
    </div>
  )
}
