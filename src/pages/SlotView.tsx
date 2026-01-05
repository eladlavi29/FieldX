import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AddSetModal from '../components/AddSetModal'
import EditSetModal from '../components/EditSetModal'
import SetCard from '../components/SetCard'
import type { Cadet, SetItem, SetRequirements } from '../types'
import { storage, Location } from '../services/storage'
import { externalService } from '../services/external'
import { getBattalion } from '../services/battalions'

export default function SlotView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [slotName, setSlotName] = useState('')
  const [battalionId, setBattalionId] = useState('')
  const [slotLocationId, setSlotLocationId] = useState<string>('')
  const [locations, setLocations] = useState<Location[]>([])
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
    setLocations(storage.getLocations())
    const slots = storage.getSlots()
    const s = slots.find(x => x.id === id)
    if (!s) {
      nav('/')
    } else {
      setSlotName(s.name)
      setBattalionId(s.battalionId || 'alon') // Fallback for old slots
      setSlotLocationId((s as any).locationId || '')
    }
  }, [id, nav])

  const slotSets = allSets.filter(s => s.slotId === id)
  const battalion = getBattalion(battalionId)

  function getLocationName(set: SetItem) {
    const subIds = (set as any).subLocationIds || ((set as any).subLocationId ? [(set as any).subLocationId] : [])
    if (subIds.length === 0) return undefined
    
    const names = subIds.map((sid: string) => {
      for (const loc of locations) {
        const sub = loc.subLocations.find(s => s.id === sid)
        if (sub) return sub.name
      }
      return '?'
    })
    return names.join(', ')
  }

  async function handleAddSet(name: string, selection: Record<string, string[]>, requirements: SetRequirements, subLocationIds: string[], teamLocations: Record<string, string>) {
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

      const newSet: SetItem = { 
        id: String(Date.now()), 
        slotId: id, 
        name: name.trim(), 
        cadets: newCadets,
        requirements,
        // @ts-ignore
        subLocationIds,
        // @ts-ignore
        teamLocations,
        status: 'inactive' // Default status
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

  function handleTeamLocationChange(set: SetItem, company: string, team: string, locationId: string) {
    const teamKey = `${company}_${team}`
    const currentSet = allSets.find(s => s.id === set.id) || set
    const teamLocations = (currentSet as any).teamLocations || {}
    
    const nextLocations = { ...teamLocations, [teamKey]: locationId }
    
    const next = allSets.map(s => 
      s.id === set.id 
        ? { ...s, teamLocations: nextLocations } 
        : s
    )
    setAllSets(next)
    storage.saveSets(next)
  }

  function handleTeamStatusChange(set: SetItem, company: string, team: string, newStatus: 'active' | 'inactive' | 'finished') {
    const teamKey = `${company}_${team}`
    const currentSet = allSets.find(s => s.id === set.id) || set
    const teamLocations = (currentSet as any).teamLocations || {}
    const teamStatuses = (currentSet as any).teamStatuses || {}

    // Validation for activating
    if (newStatus === 'active') {
      const locationId = teamLocations[teamKey]
      if (!locationId) {
        alert('לא ניתן להפעיל את הצוות.\nיש לשייך מיקום לצוות זה לפני ההפעלה.')
        return
      }

      // Check collisions: Iterate all sets, all teams
      for (const s of allSets) {
        const sStatuses = (s as any).teamStatuses || {}
        const sLocations = (s as any).teamLocations || {}
        
        // Get all teams in set s
        const sTeams = new Set<string>()
        s.cadets.forEach(c => sTeams.add(`${c.company}_${c.team}`))
        
        for (const tKey of Array.from(sTeams)) {
          // Skip self (same team in same set)
          if (s.id === set.id && tKey === teamKey) continue 

          const tStatus = sStatuses[tKey] || 'inactive'
          if (tStatus === 'active') {
            const tLoc = sLocations[tKey]
            if (tLoc === locationId) {
               const subLoc = locations.flatMap(l => l.subLocations).find(sl => sl.id === locationId)
               const [otherComp, otherTeam] = tKey.split('_')
               alert(`לא ניתן להפעיל את הצוות.\nהמטווח "${subLoc?.name}" תפוס כרגע ע"י ${otherComp} צוות ${otherTeam}.`)
               return
            }
          }
        }
      }
    }

    // Validation for finishing
    if (newStatus === 'finished') {
      const teamCadets = currentSet.cadets.filter(c => c.company === company && c.team === team)
      const allQualified = teamCadets.every(c => {
        const h = c.history.find(r => r.setId === currentSet.id)
        return h?.qualification === 'qualified'
      })
      
      if (!allQualified) {
        alert('לא ניתן לסיים את הצוות.\nישנם צוערים בצוות שטרם הוסמכו.')
        return
      }
    }

    // Update status
    const nextStatuses = { ...teamStatuses, [teamKey]: newStatus }
    
    // Check if ALL teams in this set are finished
    const allTeams = new Set<string>()
    currentSet.cadets.forEach(c => allTeams.add(`${c.company}_${c.team}`))
    const allFinished = Array.from(allTeams).every(t => nextStatuses[t] === 'finished')

    const next = allSets.map(s => 
      s.id === set.id 
        ? { ...s, teamStatuses: nextStatuses, isFinished: allFinished } 
        : s
    )
    setAllSets(next)
    storage.saveSets(next)
  }

  async function updateSet(id: string, name: string, requirements: SetRequirements, selection: Record<string, string[]>, subLocationIds: string[], teamLocations: Record<string, string>, isFinished?: boolean) {
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
        ? { ...s, name, requirements, cadets: newCadets, subLocationIds, teamLocations, isFinished }
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
    let next = allSets.map(s =>
      s.id === setId
        ? { ...s, cadets: s.cadets.map(c => (c.id === cadet.id ? cadet : c)) }
        : s
    )

    // Removed auto-finish logic to respect manual control requirement
    // But we could keep it if desired. The prompt says "To finish a set I must have all cadets qualified",
    // which implies a condition, not necessarily an automatic action. 
    // I'll leave it manual as per the "Finish" button logic.

    setAllSets(next)
    storage.saveSets(next)
  }

  const filteredLocations = slotLocationId 
    ? locations.filter(l => l.id === slotLocationId)
    : locations

  return (
    <div className="slot-view">
      <div className="slot-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" className="nav-back-btn" title="חזור לדשבורד">🡨</Link>
          <h2>{slotName}</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>מיקום המשבצת:</label>
          <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
            {locations.find(l => l.id === slotLocationId)?.name || 'ללא מיקום מוגדר'}
          </span>
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
                  locations={filteredLocations}
                  onTeamStatusChange={(company, team, status) => handleTeamStatusChange(s, company, team, status)}
                  onTeamLocationChange={(company, team, locId) => handleTeamLocationChange(s, company, team, locId)}
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
                  locations={filteredLocations}
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
          slotLocationId={slotLocationId}
        />
      )}

      {isAddSetModalOpen && (
        <AddSetModal
          battalion={battalion}
          isLoading={isAddingSet}
          onClose={() => setIsAddSetModalOpen(false)}
          onAdd={handleAddSet}
          slotLocationId={slotLocationId}
        />
      )}
    </div>
  )
}
