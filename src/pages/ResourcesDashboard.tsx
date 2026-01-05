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
  const [newSubLocs, setNewSubLocs] = useState<{id?: string, name: string}[]>([{name: ''}])

  useEffect(() => {
    const fetchData = () => {
      setLocations(storage.getLocations())
      setSlots(storage.getSlots())
      setSets(storage.getSets())
    }

    fetchData() // Initial fetch

    const timer = setInterval(() => setNow(new Date()), 60000)
    
    window.addEventListener('focus', fetchData) // Refetch on tab focus

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', fetchData)
    }
  }, [])

  function getSubLocationStatus(subLocationId: string) {
    // 1. Find an active team in an active slot
    for (const set of sets) {
        const slot = slots.find(s => s.id === set.slotId);
        if (!slot || slot.isFinished) continue;

        // Check if slot is active right now
        const start = new Date(`${slot.date}T${slot.startTime}`);
        const end = slot.endTime ? new Date(`${slot.endDate || slot.date}T${slot.endTime}`) : null;
        if (isNaN(start.getTime())) continue;
        const isSlotTimeActive = now >= start && (!end || now <= end);

        if (isSlotTimeActive) {
            const teamStatuses = (set as any).teamStatuses || {};
            const teamLocations = (set as any).teamLocations || {};

            for (const teamKey in teamStatuses) {
                if (teamStatuses[teamKey] === 'active' && teamLocations[teamKey] === subLocationId) {
                    // Found the occupying team
                    const [company, team] = teamKey.split('_');
                    const slotName = slot.name;
                    const occupiedText = `תפוס ע"י: ${company} - צוות ${team} (${slotName})`;

                    return { 
                        status: 'occupied', 
                        text: occupiedText,
                        subText: `${slot.startTime} - ${slot.endTime || '?'}`,
                        occupancy: '',
                        color: '#ef4444' 
                    };
                }
            }
        }
    }

    // 2. If not occupied, check if scheduled for today
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const scheduledSets = sets.filter(set => {
        if ((set as any).isFinished) return false;
        const slot = slots.find(s => s.id === set.slotId);
        if (!slot || slot.isFinished || slot.date !== todayStr) return false;

        const teamLocations = (set as any).teamLocations || {};
        return Object.values(teamLocations).includes(subLocationId);
    });

    if (scheduledSets.length > 0) {
      const setNames = scheduledSets.map(s => s.name).join(', ')
      return {
        status: 'scheduled',
        text: `שמור להיום: ${scheduledSets.length > 1 ? `${scheduledSets.length} מקצים` : setNames}`,
        subText: 'ממתין לשעה היעודה',
        occupancy: '-',
        color: '#eab308' // Yellow
      }
    }

    return { status: 'free', text: 'פנוי', color: '#10b981' }
  }

  function handleAddSubLoc() {
    setNewSubLocs([...newSubLocs, {name: ''}])
  }

  function handleSubLocChange(index: number, field: 'name', value: string) {
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
    setNewSubLocs(location.subLocations.map(s => ({ id: s.id, name: s.name })))
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
              capacity: 1
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
          capacity: 1
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
    setNewSubLocs([{name: ''}])
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
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: info.status === 'occupied' ? '#b91c1c' : '#047857', fontWeight: 500 }}>
                      {info.text}
                    </div>
                    
                    {(info.status === 'occupied' || info.status === 'scheduled') && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <div>🕒 {info.subText}</div>
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