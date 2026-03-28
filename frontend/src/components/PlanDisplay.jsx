import './PlanDisplay.css'

export default function PlanDisplay({ plan, placements, garden, onGenerate, generating }) {
  if (!plan) {
    return (
      <div className="card plan-empty">
        <span className="plan-empty-icon">🌱</span>
        <h2>No Plan Generated Yet</h2>
        <p>Set up your garden layout, add your plants, then click <strong>Generate Plan</strong> to get AI-powered planting recommendations.</p>
        <button className="btn-primary" onClick={onGenerate} disabled={generating}>
          {generating ? '⏳ Generating…' : '✨ Generate Plan'}
        </button>
      </div>
    )
  }

  return (
    <div className="plan-page">
      <div className="plan-header card">
        <div>
          <h2>🌻 Garden Plan — {garden.name}</h2>
          <p className="plan-meta">
            {garden.shape} · {garden.width}{garden.shape !== 'circle' && garden.shape !== 'square' ? ` × ${garden.height}` : ''} {garden.unit}
          </p>
        </div>
        <button className="btn-secondary" onClick={onGenerate} disabled={generating}>
          {generating ? '⏳ Regenerating…' : '🔄 Regenerate'}
        </button>
      </div>

      {plan.overview && (
        <div className="card plan-overview">
          <div className="section-title">Overview</div>
          <p>{plan.overview}</p>
        </div>
      )}

      {placements?.length > 0 && (
        <div className="card">
          <div className="section-title">Plant Placements</div>
          <div className="placements-grid">
            {placements.map((p, i) => (
              <div key={i} className="placement-card">
                <div className="placement-header">
                  <span className="placement-name">{p.plant}</span>
                  {p.quantity && <span className="badge">×{p.quantity}</span>}
                </div>
                <dl className="placement-details">
                  {p.location && <><dt>Location</dt><dd>{p.location}</dd></>}
                  {p.spacing && <><dt>Spacing</dt><dd>{p.spacing}</dd></>}
                  {p.sunlight && <><dt>Sunlight</dt><dd>{p.sunlight}</dd></>}
                  {p.watering && <><dt>Watering</dt><dd>{p.watering}</dd></>}
                  {p.notes && <><dt>Notes</dt><dd>{p.notes}</dd></>}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

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
