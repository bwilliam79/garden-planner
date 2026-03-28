import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import BedsManager from './components/BedsManager.jsx'
import PlantList from './components/PlantList.jsx'
import GardenCanvas from './components/GardenCanvas.jsx'
import PlanDisplay from './components/PlanDisplay.jsx'
import TopBar from './components/TopBar.jsx'
import './App.css'

const DEFAULT_BED = { id: null, name: 'Bed 1', shape: 'rectangle', width: 10, height: 12, unit: 'feet' }

const DEFAULT_STATE = {
  beds: [{ ...DEFAULT_BED, id: 'default' }],
  plants: [],
  plan: null,
  placements: []
}

function migrateState(raw) {
  // Migrate old single-garden saves to beds array
  if (raw.garden && !raw.beds) {
    return { ...DEFAULT_STATE, ...raw, beds: [{ ...raw.garden, id: raw.garden.id || uuid() }], garden: undefined }
  }
  return { ...DEFAULT_STATE, ...raw }
}

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem('garden-planner-state')
      return saved ? migrateState(JSON.parse(saved)) : DEFAULT_STATE
    } catch { return DEFAULT_STATE }
  })
  const [activeBedId, setActiveBedId] = useState(() => state.beds[0]?.id)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('layout')

  const save = useCallback((updates) => {
    setState(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('garden-planner-state', JSON.stringify(next))
      return next
    })
  }, [])

  const activeBed = state.beds.find(b => b.id === activeBedId) ?? state.beds[0]

  const updateBeds = (beds) => {
    save({ beds, plan: null, placements: [] })
    // If active bed was removed, switch to first
    if (!beds.find(b => b.id === activeBedId)) {
      setActiveBedId(beds[0]?.id)
    }
  }

  const generatePlan = async () => {
    if (state.plants.length === 0) {
      setError('Add at least one plant before generating a plan.')
      return
    }
    if (state.beds.length === 0) {
      setError('Add at least one garden bed before generating a plan.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beds: state.beds, plants: state.plants })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      save({ plan: data.plan, placements: data.placements })
      setActiveTab('plan')
    } catch (e) {
      setError(e.message || 'Failed to generate plan.')
    } finally {
      setGenerating(false)
    }
  }

  const exportData = () => {
    const name = state.beds[0]?.name ?? 'garden'
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-backup.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = migrateState(JSON.parse(ev.target.result))
        save(data)
        setActiveBedId(data.beds[0]?.id)
        setActiveTab('layout')
      } catch {
        setError('Invalid backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const activePlacements = state.placements?.filter(p => p.bedId === activeBed?.id) ?? []

  return (
    <div className="app">
      <TopBar
        gardenName={state.beds.length === 1 ? state.beds[0].name : `${state.beds.length} Beds`}
        onExport={exportData}
        onImport={importData}
        onGenerate={generatePlan}
        generating={generating}
        hasPlants={state.plants.length > 0}
      />

      <div className="app-tabs">
        {['layout', 'plants', 'plan'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'layout' ? '🌱 Garden Beds' : tab === 'plants' ? '🪴 Plants' : '📋 Plan'}
            {tab === 'plan' && state.plan && <span className="badge" style={{ marginLeft: 6 }}>Ready</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      <div className="app-body">
        {activeTab === 'layout' && (
          <div className="layout-tab">
            <BedsManager
              beds={state.beds}
              activeBedId={activeBed?.id}
              onActivate={setActiveBedId}
              onChange={updateBeds}
            />
            {activeBed && (
              <GardenCanvas
                key={activeBed.id}
                garden={activeBed}
                placements={activePlacements}
                plan={state.plan}
              />
            )}
          </div>
        )}
        {activeTab === 'plants' && (
          <PlantList plants={state.plants} onChange={plants => save({ plants, plan: null, placements: [] })} />
        )}
        {activeTab === 'plan' && (
          <PlanDisplay
            plan={state.plan}
            placements={state.placements}
            beds={state.beds}
            onGenerate={generatePlan}
            generating={generating}
          />
        )}
      </div>
    </div>
  )
}
