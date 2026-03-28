import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import './BedsManager.css'

const SHAPES = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'square', label: 'Square' },
  { value: 'l-shape', label: 'L-Shape' },
  { value: 'circle', label: 'Circle' },
]

function newBed(n) {
  return { id: uuid(), name: `Bed ${n}`, shape: 'rectangle', width: 10, height: 8, unit: 'feet' }
}

export default function BedsManager({ beds, activeBedId, onActivate, onChange }) {
  const [editing, setEditing] = useState(activeBedId)

  const activeBed = beds.find(b => b.id === editing) ?? beds[0]

  const addBed = () => {
    const bed = newBed(beds.length + 1)
    onChange([...beds, bed])
    setEditing(bed.id)
    onActivate(bed.id)
  }

  const removeBed = (id) => {
    if (beds.length === 1) return
    const next = beds.filter(b => b.id !== id)
    onChange(next)
    if (editing === id) {
      setEditing(next[0].id)
      onActivate(next[0].id)
    }
  }

  const updateBed = (field, value) => {
    onChange(beds.map(b => b.id === activeBed.id
      ? { ...b, [field]: value, ...(field === 'width' && b.shape === 'square' ? { height: value } : {}) }
      : b
    ))
  }

  const selectBed = (id) => {
    setEditing(id)
    onActivate(id)
  }

  const isCircle = activeBed?.shape === 'circle'
  const isSquare = activeBed?.shape === 'square'
  const isLShape = activeBed?.shape === 'l-shape'

  return (
    <div className="beds-manager">
      {/* Bed list */}
      <div className="card beds-list-card">
        <div className="beds-list-header">
          <div className="section-title" style={{ margin: 0 }}>Garden Beds</div>
          <button className="btn-primary btn-sm" onClick={addBed}>+ Add Bed</button>
        </div>
        <ul className="beds-ul">
          {beds.map(bed => (
            <li
              key={bed.id}
              className={`bed-item ${bed.id === editing ? 'active' : ''}`}
              onClick={() => selectBed(bed.id)}
            >
              <div className="bed-item-info">
                <span className="bed-item-name">{bed.name}</span>
                <span className="bed-item-meta">{getSummary(bed)}</span>
              </div>
              {beds.length > 1 && (
                <button
                  className="btn-danger btn-sm bed-remove"
                  onClick={e => { e.stopPropagation(); removeBed(bed.id) }}
                  title="Remove bed"
                >✕</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Bed editor */}
      {activeBed && (
        <div className="card bed-editor-card">
          <div className="section-title">Edit: {activeBed.name}</div>

          <div className="form-group">
            <label>Bed Name</label>
            <input
              type="text"
              value={activeBed.name}
              onChange={e => updateBed('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Shape</label>
            <div className="shape-grid">
              {SHAPES.map(s => (
                <button
                  key={s.value}
                  className={`shape-btn ${activeBed.shape === s.value ? 'active' : ''}`}
                  onClick={() => updateBed('shape', s.value)}
                  type="button"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Unit</label>
            <select value={activeBed.unit} onChange={e => updateBed('unit', e.target.value)}>
              <option value="feet">Feet</option>
              <option value="meters">Meters</option>
            </select>
          </div>

          {isCircle ? (
            <div className="form-group">
              <label>Diameter ({activeBed.unit})</label>
              <input type="number" min="1" max="200" value={activeBed.width}
                onChange={e => updateBed('width', Number(e.target.value))} />
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>{isSquare ? 'Size' : 'Width'} ({activeBed.unit})</label>
                  <input type="number" min="1" max="200" value={activeBed.width}
                    onChange={e => updateBed('width', Number(e.target.value))} />
                </div>
                {!isSquare && (
                  <div className="form-group">
                    <label>Height ({activeBed.unit})</label>
                    <input type="number" min="1" max="200" value={activeBed.height}
                      onChange={e => updateBed('height', Number(e.target.value))} />
                  </div>
                )}
              </div>
              {isLShape && (
                <>
                  <p className="hint">Notch cut from the top-right corner</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Notch Width ({activeBed.unit})</label>
                      <input type="number" min="1" max={activeBed.width - 1}
                        value={activeBed.notchW ?? Math.floor(activeBed.width / 2)}
                        onChange={e => updateBed('notchW', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Notch Height ({activeBed.unit})</label>
                      <input type="number" min="1" max={activeBed.height - 1}
                        value={activeBed.notchH ?? Math.floor(activeBed.height / 2)}
                        onChange={e => updateBed('notchH', Number(e.target.value))} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="garden-summary">{getSummary(activeBed)}</div>
        </div>
      )}
    </div>
  )
}

function getSummary(g) {
  if (!g) return ''
  const u = g.unit
  if (g.shape === 'circle') return `⊙ Circle, ${g.width} ${u} diameter`
  if (g.shape === 'square') return `□ ${g.width} × ${g.width} ${u}`
  if (g.shape === 'l-shape') {
    const nw = g.notchW ?? Math.floor(g.width / 2)
    const nh = g.notchH ?? Math.floor((g.height || g.width) / 2)
    const area = g.width * (g.height || g.width) - nw * nh
    return `⌐ L-Shape, ~${area} sq ${u}`
  }
  return `▭ ${g.width} × ${g.height} ${u}`
}
