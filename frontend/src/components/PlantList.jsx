import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import './PlantList.css'

const EMPTY_PLANT = { name: '', quantity: 1, notes: '' }

export default function PlantList({ plants, onChange }) {
  const [form, setForm] = useState(EMPTY_PLANT)
  const [editId, setEditId] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      onChange(plants.map(p => p.id === editId ? { ...p, ...form } : p))
      setEditId(null)
    } else {
      onChange([...plants, { ...form, id: uuid(), name: form.name.trim() }])
    }
    setForm(EMPTY_PLANT)
  }

  const remove = (id) => onChange(plants.filter(p => p.id !== id))

  const startEdit = (plant) => {
    setForm({ name: plant.name, quantity: plant.quantity, notes: plant.notes || '' })
    setEditId(plant.id)
  }

  const cancelEdit = () => { setForm(EMPTY_PLANT); setEditId(null) }

  return (
    <div className="plant-list-page">
      <div className="card plant-form-card">
        <div className="section-title">{editId ? 'Edit Plant' : 'Add Plant'}</div>
        <form onSubmit={submit} className="plant-form">
          <div className="form-group">
            <label>Plant Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Cherry Tomato, Basil, Zucchini"
              required
            />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number" min="1" max="100"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. heirloom variety, prefer shade"
            />
          </div>
          <div className="form-actions">
            {editId && <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>}
            <button type="submit" className="btn-primary">{editId ? 'Save Changes' : '+ Add Plant'}</button>
          </div>
        </form>
      </div>

      <div className="card plant-list-card">
        <div className="section-title">
          Plant List
          {plants.length > 0 && <span className="badge" style={{ marginLeft: 8 }}>{plants.length} plants</span>}
        </div>

        {plants.length === 0 ? (
          <div className="empty-state">
            <span>🪴</span>
            <p>No plants added yet. Add your first plant above!</p>
          </div>
        ) : (
          <ul className="plants-ul">
            {plants.map(plant => (
              <li key={plant.id} className={`plant-item ${editId === plant.id ? 'editing' : ''}`}>
                <div className="plant-info">
                  <span className="plant-name">{plant.name}</span>
                  <span className="plant-qty">× {plant.quantity}</span>
                  {plant.notes && <span className="plant-notes">{plant.notes}</span>}
                </div>
                <div className="plant-actions">
                  <button className="btn-secondary btn-sm" onClick={() => startEdit(plant)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(plant.id)}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
