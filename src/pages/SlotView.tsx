import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AddSetModal from '../components/AddSetModal'
import EditSetModal from '../components/EditSetModal'
import SetCard from '../components/SetCard'
import type { Cadet, SetItem, SetRequirements } from '../types'
import { storage } from '../services/storage'
import { externalService } from '../services/external'
import { getBattalion } from '../services/battalions'

export default function SlotView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [slotName, setSlotName] = useState('')
  const [battalionId, setBattalionId] = useState('')
  const [allSets, setAllSets] = useState<SetItem[]>(storage.getSets())
  
  function getSetStats(set: SetItem) {
    const total = set.cadets.length
    const qualified = set.cadets.filter(c => 
      c.history.find(h => h.setId === set.id)?.qualification === 'qualified'
    ).length
    return { qualified, total }
  }

  // Form State
  const [isAddingSet, setIsAddingSet] = useState(false)
  const [isAddSetModalOpen, setIsAddSetModalOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<SetItem | null>(null)
  const [focusedSetId, setFocusedSetId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const slots = storage.getSlots()
    const s = slots.find(x => x.id === id)
    if (!s) {
      nav('/')
    } else {
      setSlotName(s.name)
      setBattalionId(s.battalionId || 'alon') // Fallback for old slots
    }
  }, [id, nav])

  const slotSets = allSets.filter(s => s.slotId === id)
  const battalion = getBattalion(battalionId)

  async function handleAddSet(name: string, selection: Record<string, string[]>, requirements: SetRequirements, subLocationId?: string) {
    if (!id) return
    setIsAddingSet(true)
    
    // Fetch cadets for all selected teams
    let newCadets: Cadet[] = []
    
    try {
      // Iterate over companies and their selected teams
      for (const [companyName, teams] of Object.entries(selection)) {
        for (const team of teams) {
          const teamCadets = await externalService.getCadetsByTeam(companyName, team)
          
          // Map to full Cadet objects with history from storage if exists
          const mappedCadets = teamCadets.map(c => {
            const history = storage.getCadetHistory(c.id)
            return { ...c, history, company: companyName, team: String(team) }
          })
          
          newCadets = [...newCadets, ...mappedCadets]
        }
      }

      // Enforce Capacity
      if (subLocationId) {
        const locations = storage.getLocations()
        const subLoc = locations.flatMap(l => l.subLocations).find(s => s.id === subLocationId)
        
        if (subLoc) {
          // Calculate existing occupancy in this location during this slot's time
          // We check all sets in the current slot (assuming they run in parallel)
          // Ideally we should also check overlapping slots, but for now we enforce within the slot context
          const currentSlotSets = allSets.filter(s => s.slotId === id && s.subLocationId === subLocationId)
          const currentOccupancy = currentSlotSets.reduce((sum, s) => sum + s.cadets.length, 0)
          
          const totalProjected = currentOccupancy + newCadets.length

          if (totalProjected > subLoc.capacity) {
            const msg = `שגיאה: חריגה מקיבולת המטווח.

המטווח: ${subLoc.name}
קיבולת מקסימלית: ${subLoc.capacity}
תפוסה נוכחית (במשבצת זו): ${currentOccupancy}
דרישה למקצה זה: ${newCadets.length}
סה"כ צפוי: ${totalProjected}

לא ניתן ליצור את המקצה.`
            
            alert(msg)
            setIsAddingSet(false)
            return
          }
        }
      }

      const newSet: SetItem = { 
        id: String(Date.now()), 
        slotId: id, 
        name: name.trim(), 
        cadets: newCadets,
        requirements,
        subLocationId // Save the location
      }
      
      const next = [newSet, ...allSets]
      setAllSets(next)
      storage.saveSets(next)
      
      setIsAddSetModalOpen(false)
    } catch (error) {
      console.error("Failed to fetch cadets", error)
    } finally {
      setIsAddingSet(false)
    }
  }

  function deleteSet(setId: string) {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המקצה? כל הנתונים ימחקו.')) return
    const next = allSets.filter(s => s.id !== setId)
    setAllSets(next)
    storage.saveSets(next)
    if (focusedSetId === setId) setFocusedSetId(null)
  }

  async function updateSet(id: string, name: string, requirements: SetRequirements, selection: Record<string, string[]>) {
    // Fetch cadets based on selection
    let newCadets: Cadet[] = []
    try {
      for (const [companyName, teams] of Object.entries(selection)) {
        for (const team of teams) {
          const teamCadets = await externalService.getCadetsByTeam(companyName, team)
          const mappedCadets = teamCadets.map(c => {
            const history = storage.getCadetHistory(c.id)
            return { ...c, history, company: companyName, team: String(team) }
          })
          newCadets = [...newCadets, ...mappedCadets]
        }
      }
    } catch (error) {
      console.error("Failed to update set cadets", error)
    }

    const next = allSets.map(s => 
      s.id === id 
        ? { ...s, name, requirements, cadets: newCadets }
        : s
    )
    setAllSets(next)
    storage.saveSets(next)
    setEditingSet(null)
  }

  function updateCadet(setId: string, cadet: Cadet) {
    // 1. Find the specific record that was just updated/added in the cadet's history
    const updatedRecord = cadet.history.find(h => h.setId === setId)
    
    // 2. Save ONLY the result to our Internal DB
    if (updatedRecord) {
      storage.saveCadetResult(cadet.id, updatedRecord)
    }

    // 3. Update local state for UI
    const next = allSets.map(s =>
      s.id === setId
        ? { ...s, cadets: s.cadets.map(c => (c.id === cadet.id ? cadet : c)) }
        : s
    )
    setAllSets(next)
    storage.saveSets(next)
  }

  return (
    <div className="slot-view">
      <div className="slot-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" className="nav-back-btn" title="חזור לדשבורד">🡨</Link>
          <h2>{slotName}</h2>
        </div>
      </div>

      <section className="sets-section">
        {!focusedSetId && (
          <div style={{ marginBottom: '2rem' }}>
            <button onClick={() => setIsAddSetModalOpen(true)} className="btn btn-primary">
              + הוסף מקצה חדש
            </button>
          </div>
        )}

        <div className="sets-list">
          {slotSets.length === 0 && <div className="empty">אין מקצים עדיין</div>}
          
          {focusedSetId ? (
            (() => {
              const s = slotSets.find(set => set.id === focusedSetId)
              if (!s) return null
              const stats = getSetStats(s)
              return (
                <SetCard 
                  key={s.id} 
                  set={s} 
                  onUpdateCadet={(cadet) => updateCadet(s.id, cadet)}
                  onEdit={() => setEditingSet(s)}
                  onDelete={() => deleteSet(s.id)}
                  onBack={() => setFocusedSetId(null)}
                  isSummary={false}
                />
              )
            })()
          ) : (
            slotSets.map(s => {
              return (
                <SetCard 
                  key={s.id} 
                  set={s} 
                  onUpdateCadet={(cadet) => updateCadet(s.id, cadet)}
                  onEdit={() => setEditingSet(s)}
                  onDelete={() => deleteSet(s.id)}
                  isSummary={true}
                  onClick={() => setFocusedSetId(s.id)}
                />
              )
            })
          )}
        </div>
      </section>

      {editingSet && (
        <EditSetModal
          set={editingSet}
          battalion={battalion}
          onClose={() => setEditingSet(null)}
          onSave={updateSet}
        />
      )}

      {isAddSetModalOpen && (
        <AddSetModal
          battalion={battalion}
          isLoading={isAddingSet}
          onClose={() => setIsAddSetModalOpen(false)}
          onAdd={handleAddSet}
        />
      )}
    </div>
  )
}
