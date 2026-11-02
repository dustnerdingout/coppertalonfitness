import { useEffect } from 'react'
import { Icon, kindIcon, kindLabel } from './Icons.jsx'

export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="grabber" />
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon.X /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Badge = ({ kind }) => (
  <span className={`badge ${kind}`}>{kindIcon(kind)}{kindLabel[kind]}</span>
)

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)} role="tab" aria-selected={value === v}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Toast({ msg }) {
  return msg ? <div className="toast" role="status">{msg}</div> : null
}
