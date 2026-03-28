import './GardenSetup.css'

const SHAPES = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'square', label: 'Square' },
  { value: 'l-shape', label: 'L-Shape' },
  { value: 'circle', label: 'Circle' },
]

export default function GardenSetup({ garden, onChange }) {
  const update = (field, value) => onChange({ ...garden, [field]: value })

  const isCircle = garden.shape === 'circle'
  const isSquare = garden.shape === 'square'
  const isLShape = garden.shape === 'l-shape'

  return (
    <div className="card garden-setup">
      <div className="section-title">Garden Setup</div>

      <div className="form-group">
        <label>Garden Name</label>
        <input
          type="text"
          value={garden.name}
          onChange={e => update('name', e.target.value)}
          placeholder="e.g. Backyard Bed"
        />
      </div>

      <div className="form-group">
        <label>Shape</label>
        <div className="shape-grid">
          {SHAPES.map(s => (
            <button
              key={s.value}
              className={`shape-btn ${garden.shape === s.value ? 'active' : ''}`}
              onClick={() => update('shape', s.value)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Unit</label>
        <select value={garden.unit} onChange={e => update('unit', e.target.value)}>
          <option value="feet">Feet</option>
          <option value="meters">Meters</option>
        </select>
      </div>

      {isCircle ? (
        <div className="form-group">
          <label>Diameter ({garden.unit})</label>
          <input type="number" min="1" max="200" value={garden.width}
            onChange={e => update('width', Number(e.target.value))} />
        </div>
      ) : (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>{isSquare ? 'Size' : 'Width'} ({garden.unit})</label>
              <input type="number" min="1" max="200" value={garden.width}
                onChange={e => {
                  const v = Number(e.target.value)
                  onChange({ ...garden, width: v, ...(isSquare ? { height: v } : {}) })
                }} />
            </div>
            {!isSquare && (
              <div className="form-group">
                <label>Height ({garden.unit})</label>
                <input type="number" min="1" max="200" value={garden.height}
                  onChange={e => update('height', Number(e.target.value))} />
              </div>
            )}
          </div>
          {isLShape && (
            <>
              <p className="hint">L-Shape: define the notch cut from the top-right corner</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Notch Width ({garden.unit})</label>
                  <input type="number" min="1" max={garden.width - 1} value={garden.notchW ?? Math.floor(garden.width / 2)}
                    onChange={e => update('notchW', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Notch Height ({garden.unit})</label>
                  <input type="number" min="1" max={garden.height - 1} value={garden.notchH ?? Math.floor(garden.height / 2)}
                    onChange={e => update('notchH', Number(e.target.value))} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div className="garden-summary">
        {getSummary(garden)}
      </div>
    </div>
  )
}

function getSummary(g) {
  const u = g.unit
  if (g.shape === 'circle') return `⊙ Circle, ${g.width}${u} diameter`
  if (g.shape === 'square') return `□ ${g.width} × ${g.width} ${u}`
  if (g.shape === 'l-shape') {
    const total = g.width * g.height - (g.notchW ?? Math.floor(g.width/2)) * (g.notchH ?? Math.floor(g.height/2))
    return `⌐ L-Shape, ~${total} sq ${u}`
  }
  return `▭ ${g.width} × ${g.height} ${u} = ${g.width * g.height} sq ${u}`
}
