import './TopBar.css'

export default function TopBar({ gardenName, onExport, onImport, onGenerate, generating, hasPlants }) {
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
    </header>
  )
}
