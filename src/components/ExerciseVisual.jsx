import { useState } from 'react'
import { GUIDE } from '../lib/guide.js'
import { EXERCISES, COMPOUND } from '../lib/program.js'
import { restSec, fmtRest } from '../lib/builder.js'
import { Sheet } from './ui.jsx'
import { AnatomyZoom, ExerciseBody, REGIONS, SIDE } from './BodyMap.jsx'

const src = (f) => `${import.meta.env.BASE_URL}exercises/${f}`

// Exercise thumbnail: the muscles it works, drawn as anatomy (main muscles solid, helpers lighter)
export function ExerciseImage({ id, size = 72, className = '' }) {
  const g = GUIDE[id]
  const fallback = REGIONS[EXERCISES[id]?.muscle] || []
  return (
    <div className={`ex-img anat ${className}`} style={size === 'full' ? undefined : { width: size, height: size }}>
      <AnatomyZoom primary={g?.primary?.length ? g.primary : fallback} secondary={g?.secondary || []} fallbackSide={SIDE[EXERCISES[id]?.muscle] || 'front'} />
    </div>
  )
}

// Demo photos, start and end position (only shown when asked for in How to)
function DemoPhotos({ id, name }) {
  const g = GUIDE[id]
  if (!g?.frames?.length) return null
  return (
    <div className="ex-frames">
      {g.frames.map((f, i) => (
        <figure key={f}>
          <img src={src(f)} alt={`${name} ${i ? 'end' : 'start'} position`} loading="lazy" />
          <figcaption>{i ? 'End' : 'Start'}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// Full how-to: both positions, step by step, rest time
export function ExerciseInfo({ id, onClose }) {
  const ex = EXERCISES[id]
  const g = GUIDE[id]
  const [photos, setPhotos] = useState(false)
  const primary = g?.primary?.length ? g.primary : REGIONS[ex.muscle] || []
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="stack">
        <div className="card target-card">
          <ExerciseBody primary={primary} secondary={g?.secondary || []} labels />
          <div className="legend" style={{ justifyContent: 'center', marginTop: 4 }}>
            <span><i className="dotkey" style={{ background: 'var(--bm-hot-1)' }} />Main muscles</span>
            {g?.secondary?.length > 0 && <span><i className="dotkey" style={{ background: 'var(--bm-hot-1)', opacity: 0.38 }} />Also working</span>}
          </div>
        </div>
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
        {g?.frames?.length > 0 && (
          photos ? <DemoPhotos id={id} name={ex.name} /> : <button className="btn sm ghost" style={{ alignSelf: 'center' }} onClick={() => setPhotos(true)}>Show demo photos</button>
        )}
        <p className="muted tiny center">Instructions and muscle data: Free Exercise DB (public domain)</p>
      </div>
    </Sheet>
  )
}
