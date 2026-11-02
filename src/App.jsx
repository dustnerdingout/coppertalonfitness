import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from './lib/store.jsx'
import Today from './components/Today.jsx'
import LiftSession from './components/LiftSession.jsx'
import Progress from './components/Progress.jsx'
import Food from './components/Food.jsx'
import Calendar from './components/Calendar.jsx'
import Settings from './components/Settings.jsx'
import Onboarding from './components/Onboarding.jsx'
import Builder from './components/Builder.jsx'
import { RunSheet, MobilitySheet, WeighSheet } from './components/Sheets.jsx'
import { Toast } from './components/ui.jsx'
import { Icon } from './components/Icons.jsx'

const TABS = [
  ['today', 'Home', Icon.Home],
  ['calendar', 'Calendar', Icon.Calendar],
  ['progress', 'Progress', Icon.Chart],
  ['food', 'Food', Icon.Food],
  ['settings', 'Settings', Icon.Gear],
]

function useResolvedTheme(theme) {
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const fn = (e) => setSysDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  const dark = theme === 'dark' || (theme === 'system' && sysDark)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f5f5f7')
  }, [dark])
  return dark
}

export default function App() {
  const { state, update } = useStore()
  const [tab, setTab] = useState('today')
  const [modal, setModal] = useState(null) // { type: 'lift' | 'run' | 'mobility' | 'weigh', runType? }
  const [toast, setToast] = useState('')
  const timer = useRef(null)
  const dark = useResolvedTheme(state.theme)

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [tab, modal?.type === 'lift', modal?.type === 'build'])

  if (!state.profile) return <div className="app"><Onboarding /></div>

  const close = () => setModal(null)
  const toggleTheme = () => update(() => ({ theme: dark ? 'light' : 'dark' }))

  if (modal?.type === 'build') {
    return (
      <div className="app" style={{ paddingBottom: 120 }}>
        <Builder onClose={close} onStart={() => setModal({ type: 'lift' })} />
        <Toast msg={toast} />
      </div>
    )
  }

  if (modal?.type === 'lift') {
    return (
      <div className="app" style={{ paddingBottom: 120 }}>
        <LiftSession onClose={close} notify={notify} onBuild={() => setModal({ type: 'build' })} />
        <Toast msg={toast} />
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'today' && <Today open={setModal} toggleTheme={toggleTheme} dark={dark} goTab={setTab} notify={notify} />}
      {tab === 'progress' && <Progress />}
      {tab === 'food' && <Food notify={notify} />}
      {tab === 'calendar' && <Calendar open={setModal} notify={notify} />}
      {tab === 'settings' && <Settings notify={notify} />}

      <nav className="nav" aria-label="Main">
        {TABS.map(([k, label, I]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}>
            <I />{label}
          </button>
        ))}
      </nav>

      {modal?.type === 'run' && <RunSheet initialType={modal.runType} onClose={close} notify={notify} />}
      {modal?.type === 'mobility' && <MobilitySheet onClose={close} notify={notify} />}
      {modal?.type === 'weigh' && <WeighSheet onClose={close} notify={notify} />}
      <Toast msg={toast} />
    </div>
  )
}
