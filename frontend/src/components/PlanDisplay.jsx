import { useRef, useEffect, useState, useCallback } from 'react'
import { draw, CANVAS_SIZE, PLANT_COLORS } from './GardenCanvas.jsx'
import './PlanDisplay.css'

function BedMap({ bed, placements }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw(canvas.getContext('2d'), bed, placements, null)
  }, [bed, placements])

  return (
    <div className="bed-map-wrap">
      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="bed-map-canvas" />
      {placements?.length > 0 && (
        <div className="bed-map-legend">
          {placements.map((p, i) => (
            <div key={i} className="bed-map-legend-item">
              <span className="bed-map-dot" style={{ background: PLANT_COLORS[i % PLANT_COLORS.length] }} />
              <span>{p.plant}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReplacementPanel({ placement, bed, allPlacements, onClose }) {
  const [loading, setLoading] = useState(false)
  const [replacements, setReplacements] = useState(null)
  const [error, setError] = useState(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadPlant: placement, bed, allPlacements })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to get recommendations.' }))
        throw new Error(body.error || 'Failed to get recommendations.')
      }
      const data = await res.json().catch(() => ({ replacements: [] }))
      setReplacements(data.replacements || [])
    } catch (e) {
      setError(e.message || 'Failed to get recommendations.')
    } finally {
      setLoading(false)
    }
  }, [placement, bed, allPlacements])

  useEffect(() => { fetch_() }, [fetch_])

  return (
    <div className="replacement-panel">
      <div className="replacement-header">
        <span>🌱 Replacements for <strong>{placement.plant}</strong></span>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      {loading && <p className="replacement-loading">⏳ Getting recommendations…</p>}
      {error && <p className="replacement-error">{error}</p>}
      {replacements && (
        <div className="replacement-list">
          {replacements.map((r, i) => (
            <div key={i} className="replacement-item">
              <div className="replacement-name">🌿 {r.plant}</div>
              <p className="replacement-reason">{r.reason}</p>
              <div className="replacement-meta">
                {r.spacing && <span>Spacing: {r.spacing}</span>}
                {r.watering && <span>Watering: {r.watering}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrintBed({ bed, placements, plan, colorOffset }) {
  const canvasRef = useRef(null)
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    draw(ctx, bed, placements, plan)
    setDataUrl(canvas.toDataURL('image/png'))
  }, [bed, placements, plan])

  return (
    <div className="print-bed">
      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ display: 'none' }} />
      <h3 className="print-bed-title">{bed.name}</h3>
      <div className="print-layout-inner">
        {dataUrl && (
          <div className="print-map">
            <img src={dataUrl} alt={bed.name} className="print-map-img" />
            {placements?.length > 0 && (
              <div className="print-legend">
                {placements.map((p, i) => (
                  <div key={i} className="print-legend-item">
                    <span className="print-legend-dot" style={{ background: PLANT_COLORS[(colorOffset + i) % PLANT_COLORS.length] }} />
                    <span>{p.plant}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {placements?.length > 0 && (
          <div className="print-placements">
            <table className="print-placement-table">
              <thead>
                <tr><th>Plant</th><th>Qty</th><th>Location</th><th>Spacing</th><th>Watering</th></tr>
              </thead>
              <tbody>
                {placements.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <span className="print-legend-dot" style={{ background: PLANT_COLORS[(colorOffset + i) % PLANT_COLORS.length] }} />
                      {p.plant}
                    </td>
                    <td>{p.quantity ?? '—'}</td>
                    <td>{p.location ?? '—'}</td>
                    <td>{p.spacing ?? '—'}</td>
                    <td>{p.watering ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlanDisplay({ plan, placements, beds, onGenerate, generating }) {
  const [deadPlants, setDeadPlants] = useState({}) // key: `bedId-plantName`
  const [replacing, setReplacing] = useState(null)  // { placement, bed }

  const toggleDead = (key) => setDeadPlants(d => ({ ...d, [key]: !d[key] }))

  if (!plan) {
    return (
      <div className="card plan-empty">
        <span className="plan-empty-icon">🌱</span>
        <h2>No Plan Generated Yet</h2>
        <p>Set up your garden beds, add your plants, then click <strong>Generate Plan</strong> to get AI-powered planting recommendations.</p>
        <button className="btn-primary" onClick={onGenerate} disabled={generating}>
          {generating ? '⏳ Generating…' : '✨ Generate Plan'}
        </button>
      </div>
    )
  }

  // Group placements by bed
  const byBed = (beds ?? []).map(bed => ({
    bed,
    placements: (placements ?? []).filter(p => p.bedId === bed.id)
  }))

  // Flat list for on-screen display (all beds together)
  const allPlacements = placements ?? []

  const bedLabel = beds?.length === 1 ? beds[0].name : `${beds?.length} Beds`

  return (
    <div className="plan-page">
      <div className="plan-header card">
        <div>
          <h2>🌻 Garden Plan — {bedLabel}</h2>
          <p className="plan-meta">{beds?.map(b => b.name).join(' · ')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            🖨️ Print
          </button>
          <button className="btn-secondary" onClick={onGenerate} disabled={generating}>
            {generating ? '⏳ Regenerating…' : '🔄 Regenerate'}
          </button>
        </div>
      </div>

      {/* Print-only: one section per bed */}
      <div className="print-all-beds">
        {byBed.map(({ bed, placements: bp }, bedIdx) => {
          const colorOffset = byBed.slice(0, bedIdx).reduce((sum, { placements: p }) => sum + p.length, 0)
          return (
            <PrintBed
              key={bed.id}
              bed={bed}
              placements={bp}
              plan={plan}
              colorOffset={colorOffset}
            />
          )
        })}
      </div>

      {plan.overview && (
        <div className="card plan-overview">
          <div className="section-title">Overview</div>
          <p>{plan.overview}</p>
        </div>
      )}

      {/* On-screen: group placements by bed */}
      {byBed.map(({ bed, placements: bp }) => bp.length > 0 && (
        <div key={bed.id} className="card">
          <div className="section-title">📍 {bed.name} — Plant Placements</div>
          <BedMap bed={bed} placements={bp} />
          <div className="placements-grid">
            {bp.map((p, i) => {
              const key = `${bed.id}-${p.plant}`
              const isDead = !!deadPlants[key]
              const isReplacing = replacing?.placement === p
              return (
                <div key={i} className={`placement-card ${isDead ? 'is-dead' : ''}`}>
                  <div className="placement-header">
                    <span className="placement-name">{isDead ? '☠️ ' : ''}{p.plant}</span>
                    {p.quantity && <span className="badge">×{p.quantity}</span>}
                  </div>
                  {!isDead && (
                    <dl className="placement-details">
                      {p.location && <><dt>Location</dt><dd>{p.location}</dd></>}
                      {p.spacing && <><dt>Spacing</dt><dd>{p.spacing}</dd></>}
                      {p.sunlight && <><dt>Sunlight</dt><dd>{p.sunlight}</dd></>}
                      {p.watering && <><dt>Watering</dt><dd>{p.watering}</dd></>}
                      {p.notes && <><dt>Notes</dt><dd>{p.notes}</dd></>}
                    </dl>
                  )}
                  <div className="placement-footer">
                    <button
                      className={isDead ? 'btn-secondary btn-sm' : 'btn-dead btn-sm'}
                      onClick={() => { toggleDead(key); if (isDead) setReplacing(null) }}
                    >
                      {isDead ? '↩ Mark Alive' : '☠️ Mark as Dead'}
                    </button>
                    {isDead && (
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => setReplacing(isReplacing ? null : { placement: p, bed })}
                      >
                        🌱 {isReplacing ? 'Hide' : 'Get Replacement'}
                      </button>
                    )}
                  </div>
                  {isReplacing && (
                    <ReplacementPanel
                      placement={p}
                      bed={bed}
                      allPlacements={placements}
                      onClose={() => setReplacing(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {plan.wateringSchedule?.length > 0 && (
        <div className="card">
          <div className="section-title">💧 Watering Schedule</div>
          <table className="schedule-table">
            <thead>
              <tr><th>Plant</th><th>Frequency</th><th>Amount</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {plan.wateringSchedule.map((row, i) => (
                <tr key={i}>
                  <td>{row.plant}</td>
                  <td>{row.frequency}</td>
                  <td>{row.amount || '—'}</td>
                  <td>{row.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {plan.companionPlanting?.length > 0 && (
        <div className="card">
          <div className="section-title">🤝 Companion Planting Notes</div>
          <ul className="companion-list">
            {plan.companionPlanting.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.tips?.length > 0 && (
        <div className="card">
          <div className="section-title">💡 Tips</div>
          <ul className="tips-list">
            {plan.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
