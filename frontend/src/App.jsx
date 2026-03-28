import { useState, useCallback } from 'react'
import GardenSetup from './components/GardenSetup.jsx'
import PlantList from './components/PlantList.jsx'
import GardenCanvas from './components/GardenCanvas.jsx'
import PlanDisplay from './components/PlanDisplay.jsx'
import TopBar from './components/TopBar.jsx'
import './App.css'

const DEFAULT_STATE = {
  garden: { name: 'My Garden', shape: 'rectangle', width: 10, height: 12, unit: 'feet' },
  plants: [],
  plan: null,
  placements: []
}

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem('garden-planner-state')
      return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE
    } catch { return DEFAULT_STATE }
  })
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

  const generatePlan = async () => {
    if (state.plants.length === 0) {
      setError('Add at least one plant before generating a plan.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garden: state.garden, plants: state.plants })
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
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.garden.name.replace(/\s+/g, '-').toLowerCase()}-backup.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        save(data)
        setActiveTab('layout')
      } catch {
        setError('Invalid backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="app">
      <TopBar
        gardenName={state.garden.name}
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
            {tab === 'layout' ? '🌱 Garden Layout' : tab === 'plants' ? '🪴 Plants' : '📋 Plan'}
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
            <GardenSetup garden={state.garden} onChange={g => save({ garden: g, plan: null, placements: [] })} />
            <GardenCanvas garden={state.garden} placements={state.placements} plan={state.plan} />
          </div>
        )}
        {activeTab === 'plants' && (
          <PlantList plants={state.plants} onChange={plants => save({ plants, plan: null, placements: [] })} />
        )}
        {activeTab === 'plan' && (
          <PlanDisplay plan={state.plan} placements={state.placements} garden={state.garden} onGenerate={generatePlan} generating={generating} />
        )}
      </div>
    </div>
  )
}
