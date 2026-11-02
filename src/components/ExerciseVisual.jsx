import { useEffect, useState } from 'react'
import { GUIDE } from '../lib/guide.js'
import { EXERCISES, COMPOUND } from '../lib/program.js'
import { restSec, fmtRest } from '../lib/builder.js'
import { Sheet } from './ui.jsx'

const src = (f) => `${import.meta.env.BASE_URL}exercises/${f}`

// Start and end positions, crossfading so you can see the movement
export function ExerciseImage({ id, size = 72, still = false, className = '' }) {
  const g = GUIDE[id]
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (still || !g || g.frames.length < 2) return
    const t = setInterval(() => setFrame((f) => 1 - f), 1200)
    return () => clearInterval(t)
  }, [still, g])
  if (!g) return <div className={`ex-img ${className}`} style={{ width: size, height: size }} />
  return (
    <div className={`ex-img ${className}`} style={size === 'full' ? undefined : { width: size, height: size }}>
      {g.frames.map((f, i) => (
        <img key={f} src={src(f)} alt="" loading="lazy" style={{ opacity: i === frame ? 1 : 0 }} />
      ))}
    </div>
  )
}

// Full how-to: both positions, step by step, rest time
export function ExerciseInfo({ id, onClose }) {
  const ex = EXERCISES[id]
  const g = GUIDE[id]
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="stack">
        {g && (
          <div className="ex-frames">
            {g.frames.map((f, i) => (
              <figure key={f}>
                <img src={src(f)} alt={`${ex.name} ${i ? 'end' : 'start'} position`} />
                <figcaption>{i ? 'End' : 'Start'}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="pill">{ex.muscle}</span>
          <span className="pill">{ex.sets} × {ex.reps[0]}–{ex.reps[1]}{ex.kind === 'time' ? ' sec' : ''}</span>
          <span className="pill">Rest {fmtRest(restSec(id))}</span>
          {COMPOUND.has(id) && <span className="pill copper">Compound</span>}
        </div>
        <p className="small"><b>Cue:</b> {ex.cue}</p>
        {g && (
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>How to do it</h3>
            <ol className="steps">
              {g.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}
        <p className="muted tiny center">Photos and instructions: Free Exercise DB (public domain)</p>
      </div>
    </Sheet>
  )
}
