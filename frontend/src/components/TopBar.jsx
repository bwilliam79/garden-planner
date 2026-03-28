import { useState } from 'react'
import './TopBar.css'

export default function TopBar({
  gardenName, onExport, onImport, onGenerate, generating, hasPlants,
  savedPlans, onSavePlan, onLoadPlan, onClearPlants, onResetPlan
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleSave = () => {
    if (!saveName.trim()) return
    onSavePlan(saveName.trim())
    setSaveName('')
    setShowSaveInput(false)
    setShowMenu(false)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">🌻</span>
        <div>
          <h1 className="topbar-title">Garden Planner</h1>
          <span className="topbar-sub">{gardenName}</span>
        </div>
      </div>
      <div className="topbar-actions">

        {/* Plans menu */}
        <div className="topbar-menu-wrap">
          <button className="btn btn-secondary" onClick={() => setShowMenu(m => !m)}>
            📁 Plans {savedPlans?.length > 0 && <span className="topbar-badge">{savedPlans.length}</span>}
          </button>
          {showMenu && (
            <div className="topbar-dropdown">
              <div className="dropdown-section-label">Save current plan</div>
              {showSaveInput ? (
                <div className="dropdown-save-row">
                  <input
                    autoFocus
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="Plan name…"
                  />
                  <button className="btn-primary btn-xs" onClick={handleSave}>Save</button>
                  <button className="btn-secondary btn-xs" onClick={() => setShowSaveInput(false)}>✕</button>
                </div>
              ) : (
                <button className="dropdown-item" onClick={() => setShowSaveInput(true)}>💾 Save as…</button>
              )}

              {savedPlans?.length > 0 && (
                <>
                  <div className="dropdown-section-label" style={{ marginTop: 8 }}>Saved plans</div>
                  {savedPlans.map(p => (
                    <div key={p.id} className="dropdown-plan-row">
                      <button className="dropdown-item plan-load-btn" onClick={() => { onLoadPlan(p.id); setShowMenu(false) }}>
                        📋 {p.name}
                        <span className="plan-date">{new Date(p.savedAt).toLocaleDateString()}</span>
                      </button>
                    </div>
                  ))}
                </>
              )}

              <div className="dropdown-divider" />
              <button className="dropdown-item danger-item" onClick={() => { onClearPlants(); setShowMenu(false) }}>
                🗑️ Clear all plants
              </button>
              <button className="dropdown-item danger-item" onClick={() => { onResetPlan(); setShowMenu(false) }}>
                ↺ Reset plan
              </button>
            </div>
          )}
        </div>

        <label className="btn btn-secondary" title="Import backup">
          📂 Import
          <input type="file" accept=".json" onChange={onImport} style={{ display: 'none' }} />
        </label>
        <button className="btn btn-secondary" onClick={onExport} title="Export backup">
          💾 Export
        </button>
        <button
          className="btn btn-primary"
          onClick={onGenerate}
          disabled={generating || !hasPlants}
          title={!hasPlants ? 'Add plants first' : 'Generate AI planting plan'}
        >
          {generating ? '⏳ Generating…' : '✨ Generate Plan'}
        </button>
      </div>

      {showMenu && <div className="topbar-overlay" onClick={() => setShowMenu(false)} />}
    </header>
  )
}
