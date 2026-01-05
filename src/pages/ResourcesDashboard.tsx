import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { storage, Location } from '../services/storage'
import type { Slot, SetItem } from '../types'

export default function ResourcesDashboard() {
  const [locations, setLocations] = useState<Location[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [sets, setSets] = useState<SetItem[]>([])
  const [now, setNow] = useState(new Date())
  const [isAdding, setIsAdding] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  
  // New Location Form State
  const [newLocName, setNewLocName] = useState('')
  const [newSubLocs, setNewSubLocs] = useState<{id?: string, name: string, capacity: number}[]>([{name: '', capacity: 0}])

  useEffect(() => {
    setLocations(storage.getLocations())
    setSlots(storage.getSlots())
    setSets(storage.getSets())

    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Helper to check if a set is currently active
  function isSetActive(set: SetItem) {
    const slot = slots.find(s => s.id === set.slotId)
    if (!slot || slot.isFinished) return false
    
    const start = new Date(`${slot.date}T${slot.startTime}`)
    const end = slot.endTime ? new Date(`${slot.endDate || slot.date}T${slot.endTime}`) : null
    
    // Check if NOW is within the slot time (or after start if no end time defined)
    if (now >= start && (!end || now <= end)) {
      return true
    }
    return false
  }

  function getSubLocationStatus(subLocationId: string) {
    // Find all sets assigned to this location
    const assignedSets = sets.filter(s => (s as any).subLocationId === subLocationId)
    
    // Find active ones
    const activeSets = assignedSets.filter(isSetActive)

    if (activeSets.length === 0) return { status: 'free', text: 'פנוי', color: '#10b981' }
    
    // If occupied
    const totalCadets = activeSets.reduce((sum, s) => sum + s.cadets.length, 0)
    const setNames = activeSets.map(s => s.name).join(', ')
    
    // Find time range from the first active set's slot (approximation)
    const firstSlot = slots.find(s => s.id === activeSets[0].slotId)
    
    return { 
      status: 'occupied', 
      text: `בשימוש: ${activeSets.length > 1 ? `${activeSets.length} מקצים` : setNames}`,
      subText: firstSlot ? `${firstSlot.startTime} - ${firstSlot.endTime || '?'}` : '',
      occupancy: `${totalCadets}`, // Just the number
      color: '#ef4444' 
    }
  }

  function handleAddSubLoc() {
    setNewSubLocs([...newSubLocs, {name: '', capacity: 0}])
  }

  function handleSubLocChange(index: number, field: 'name' | 'capacity', value: string | number) {
    const updated = [...newSubLocs]
    updated[index] = { ...updated[index], [field]: value }
    setNewSubLocs(updated)
  }

  function removeSubLoc(index: number) {
    setNewSubLocs(newSubLocs.filter((_, i) => i !== index))
  }

  function startEdit(location: Location) {
    setEditingLocationId(location.id)
    setNewLocName(location.name)
    // Keep existing IDs to preserve links to sets
    setNewSubLocs(location.subLocations.map(s => ({ id: s.id, name: s.name, capacity: s.capacity })))
    setIsAdding(true)
  }

  function saveLocation() {
    if (!newLocName.trim()) return
    const validSubLocs = newSubLocs.filter(s => s.name.trim())
    if (validSubLocs.length === 0) {
      alert('יש להוסיף לפחות מטווח/תת-מיקום אחד')
      return
    }

    let updatedLocations: Location[]

    if (editingLocationId) {
      // Update existing
      updatedLocations = locations.map(loc => {
        if (loc.id === editingLocationId) {
          return {
            ...loc,
            name: newLocName.trim(),
            subLocations: validSubLocs.map((s, i) => ({
              id: s.id || `sub_${Date.now()}_${i}`, // Preserve ID if exists, else generate
              name: s.name.trim(),
              capacity: Number(s.capacity)
            }))
          }
        }
        return loc
      })
    } else {
      // Create new
      const newLocation: Location = {
        id: `loc_${Date.now()}`,
        name: newLocName.trim(),
        subLocations: validSubLocs.map((s, i) => ({
          id: `sub_${Date.now()}_${i}`,
          name: s.name.trim(),
          capacity: Number(s.capacity)
        }))
      }
      updatedLocations = [...locations, newLocation]
    }

    setLocations(updatedLocations)
    storage.saveLocations(updatedLocations)
    
    // Reset
    setIsAdding(false)
    setEditingLocationId(null)
    setNewLocName('')
    setNewSubLocs([{name: '', capacity: 0}])
  }

  function deleteLocation(id: string) {
    if(!window.confirm('האם למחוק את המיקום?')) return
    const updated = locations.filter(l => l.id !== id)
    setLocations(updated)
    storage.saveLocations(updated)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>תמונת מצב</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>ניהול משאבים, מטווחים וסטטוס בזמן אמת</p>
        </div>
        <Link to="/" className="btn btn-secondary">חזרה ללוח ראשי</Link>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {!isAdding ? (
          <button onClick={() => {
            setIsAdding(true)
            setEditingLocationId(null)
            setNewLocName('')
            setNewSubLocs([{name: '', capacity: 0}])
          }} className="btn btn-primary">+ הוסף מתחם חדש</button>
        ) : (
          <div className="card" style={{ maxWidth: '600px', padding: '1.5rem' }}>
            <h3>{editingLocationId ? 'עריכת מתחם' : 'הוספת מתחם חדש'}</h3>
            <div className="form-group">
              <label>שם המתחם (למשל: מתחם א')</label>
              <input value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="שם המתחם" />
            </div>
            
            <div className="form-group">
              <label>מטווחים/עמדות במתחם</label>
              {newSubLocs.map((sub, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    placeholder="שם המטווח" 
                    value={sub.name} 
                    onChange={e => handleSubLocChange(idx, 'name', e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <input 
                    type="number" 
                    placeholder="קיבולת" 
                    value={sub.capacity || ''} 
                    onChange={e => handleSubLocChange(idx, 'capacity', Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => removeSubLoc(idx)} className="btn-danger" style={{ padding: '0 0.5rem' }}>×</button>
                </div>
              ))}
              <button onClick={handleAddSubLoc} className="btn-link-small">+ הוסף מטווח</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={saveLocation} className="btn btn-primary">{editingLocationId ? 'עדכן' : 'שמור'} מתחם</button>
              <button onClick={() => { setIsAdding(false); setEditingLocationId(null); }} className="btn btn-secondary">ביטול</button>
            </div>
          </div>
        )}
      </div>

      <div className="locations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {locations.length === 0 && !isAdding && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            לא נמצאו מיקומים. לחץ על "הוסף מתחם חדש" כדי להתחיל.
          </div>
        )}
        {locations.map(loc => (
          <div key={loc.id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{loc.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => startEdit(loc)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>ערוך</button>
                <button onClick={() => deleteLocation(loc.id)} className="btn-danger" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>מחק</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {loc.subLocations.map(sub => {
                const info = getSubLocationStatus(sub.id)
                return (
                  <div key={sub.id} style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '0.75rem', 
                    borderRadius: '6px',
                    borderRight: `4px solid ${info.color}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{sub.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>עד {sub.capacity}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: info.status === 'occupied' ? '#b91c1c' : '#047857', fontWeight: 500 }}>
                      {info.text}
                    </div>
                    
                    {info.status === 'occupied' && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <div>🕒 {info.subText}</div>
                        <div style={{ fontWeight: 'bold' }}>👥 {info.occupancy} / {sub.capacity} צוערים</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}