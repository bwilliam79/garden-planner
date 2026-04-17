import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import BedsManager from './components/BedsManager.jsx'
import PlantList from './components/PlantList.jsx'
import GardenOverview from './components/GardenOverview.jsx'
import PlanDisplay from './components/PlanDisplay.jsx'
import TopBar from './components/TopBar.jsx'
import { isValidStateShape, safeParseJSON } from './lib/state.js'
import './App.css'

const DEFAULT_BED = { id: 'default', name: 'Bed 1', shape: 'rectangle', width: 10, height: 12, unit: 'feet', x: 0, y: 0, rotation: 0 }

const DEFAULT_STATE = {
  beds: [{ ...DEFAULT_BED }],
  plants: [],
  plan: null,
  placements: []
}

const STATE_KEY = 'garden-planner-state'
const SAVED_PLANS_KEY = 'garden-saved-plans'
const MAX_IMPORT_BYTES = 1_000_000 // 1MB

function migrateBed(bed, index) {
  return {
    x: index * (bed.width + 3),
    y: 0,
    rotation: 0,
    ...bed,
  }
}

function migrateState(raw) {
  if (!isValidStateShape(raw)) return { ...DEFAULT_STATE }
  if (raw.garden && !raw.beds) {
    const bed = migrateBed({ ...raw.garden, id: raw.garden.id || uuid() }, 0)
    return { ...DEFAULT_STATE, ...raw, beds: [bed], garden: undefined }
  }
  return {
    ...DEFAULT_STATE,
    ...raw,
    beds: (raw.beds || DEFAULT_STATE.beds).map(migrateBed)
  }
}

function loadPersistedState() {
  try {
    const saved = localStorage.getItem(STATE_KEY)
    if (!saved) return DEFAULT_STATE
    const parsed = JSON.parse(saved)
    if (!isValidStateShape(parsed)) {
      console.warn('Persisted state has unexpected shape — falling back to defaults.')
      return DEFAULT_STATE
    }
    return migrateState(parsed)
  } catch (err) {
    console.warn('Failed to load persisted state:', err)
    return DEFAULT_STATE
  }
}

function loadSavedPlans() {
  try {
    const raw = localStorage.getItem(SAVED_PLANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function App() {
  const [state, setState] = useState(loadPersistedState)
  const [activeBedId, setActiveBedId] = useState(() => state.beds[0]?.id)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('layout')
  const [savedPlans, setSavedPlans] = useState(loadSavedPlans)

  // Server-side persistence: load once on mount (server wins over localStorage),
  // then debounce-sync on every state/savedPlans change.
  const serverLoaded = useRef(false)
  const syncTimer = useRef(null)

  useEffect(() => {
    fetch('/api/storage/state')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        if (data.state && isValidStateShape(data.state)) {
          const migrated = migrateState(data.state)
          setState(migrated)
          setActiveBedId(migrated.beds[0]?.id)
        }
        if (Array.isArray(data.savedPlans)) setSavedPlans(data.savedPlans)
      })
      .catch(() => {})
      .finally(() => { serverLoaded.current = true })
  }, [])

  useEffect(() => {
    if (!serverLoaded.current) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      fetch('/api/storage/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, savedPlans }),
      }).catch(() => {})
    }, 800)
    return () => clearTimeout(syncTimer.current)
  }, [state, savedPlans])

  const persist = useCallback((key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      // Quota exceeded, private-mode restrictions, etc. Keep working in-memory.
      console.warn(`Failed to persist ${key}:`, err)
      if (err && err.name === 'QuotaExceededError') {
        setError('Browser storage is full — changes will not persist across reloads.')
      }
    }
  }, [])

  const save = useCallback((updates) => {
    setState(prev => {
      const next = { ...prev, ...updates }
      persist(STATE_KEY, next)
      return next
    })
  }, [persist])

  const activeBed = state.beds.find(b => b.id === activeBedId) ?? state.beds[0]

  // Replace all beds (clears plan since shape/size changed)
  const updateBeds = (beds) => {
    save({ beds, plan: null, placements: [] })
    if (!beds.find(b => b.id === activeBedId)) setActiveBedId(beds[0]?.id)
  }

  // Update one bed's position/rotation without clearing the plan
  const moveBed = useCallback((id, updates) => {
    setState(prev => {
      const next = { ...prev, beds: prev.beds.map(b => b.id === id ? { ...b, ...updates } : b) }
      persist(STATE_KEY, next)
      return next
    })
  }, [persist])

  const generatePlan = async () => {
    if (state.plants.length === 0) return setError('Add at least one plant before generating a plan.')
    if (state.beds.length === 0) return setError('Add at least one garden bed before generating a plan.')
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beds: state.beds, plants: state.plants })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to generate plan.' }))
        throw new Error(body.error || 'Failed to generate plan.')
      }
      const data = await res.json()
      save({ plan: data.plan, placements: data.placements })
      setActiveTab('plan')
    } catch (e) {
      setError(e.message || 'Failed to generate plan.')
    } finally {
      setGenerating(false)
    }
  }

  const savePlan = (name) => {
    const entry = { id: uuid(), name, savedAt: Date.now(), state }
    const next = [entry, ...savedPlans]
    setSavedPlans(next)
    persist(SAVED_PLANS_KEY, next)
  }

  const loadPlan = (id) => {
    const entry = savedPlans.find(p => p.id === id)
    if (!entry) return
    const data = migrateState(entry.state)
    save(data)
    setActiveBedId(data.beds[0]?.id)
    setActiveTab('layout')
  }

  const clearPlants = () => save({ plants: [], plan: null, placements: [] })
  const resetPlan = () => save({ plan: null, placements: [] })

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

    const resetInput = () => { e.target.value = '' }

    if (file.size > MAX_IMPORT_BYTES) {
      setError(`Backup file is too large (max ${MAX_IMPORT_BYTES / 1_000_000}MB).`)
      resetInput()
      return
    }
    const looksLikeJson = file.type === 'application/json' || /\.json$/i.test(file.name)
    if (!looksLikeJson) {
      setError('Please select a .json backup file.')
      resetInput()
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      setError('Failed to read backup file.')
      resetInput()
    }
    reader.onload = (ev) => {
      const parsed = safeParseJSON(ev.target.result)
      if (!parsed.ok) {
        setError('Invalid backup file: not valid JSON.')
        resetInput()
        return
      }
      if (!isValidStateShape(parsed.value)) {
        setError('Invalid backup file: unexpected structure.')
        resetInput()
        return
      }
      try {
        const data = migrateState(parsed.value)
        save(data)
        setActiveBedId(data.beds[0]?.id)
        setActiveTab('layout')
      } catch (err) {
        console.warn('Import failed:', err)
        setError('Failed to import backup.')
      }
      resetInput()
    }
    reader.readAsText(file)
  }

  return (
    <div className="app">
      <TopBar
        gardenName={state.beds.length === 1 ? state.beds[0].name : `${state.beds.length} Beds`}
        onExport={exportData}
        onImport={importData}
        onGenerate={generatePlan}
        generating={generating}
        hasPlants={state.plants.length > 0}
        savedPlans={savedPlans}
        onSavePlan={savePlan}
        onLoadPlan={loadPlan}
        onClearPlants={clearPlants}
        onResetPlan={resetPlan}
      />

      <div className="app-tabs">
        {['layout', 'plants', 'plan'].map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
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
              onMoveBed={moveBed}
            />
            <GardenOverview
              beds={state.beds}
              placements={state.placements}
              activeBedId={activeBed?.id}
              onActivate={setActiveBedId}
              onMoveBed={moveBed}
            />
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
