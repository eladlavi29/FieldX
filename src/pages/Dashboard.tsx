import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { storage } from '../services/storage'
import { externalService } from '../services/external'
import type { Slot, Battalion, SetItem, SetRequirements, Cadet } from '../types'
import AddSlotModal from '../components/AddSlotModal'

export default function Dashboard() {
  const [slots, setSlots] = useState<Slot[]>(storage.getSlots())
  const [sets, setSets] = useState<SetItem[]>(storage.getSets())
  const [battalions, setBattalions] = useState<Battalion[]>([])
  const [now, setNow] = useState(new Date())
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false)
  const [isCreatingSlot, setIsCreatingSlot] = useState(false)

  useEffect(() => {
    externalService.getAllBattalions().then(data => {
      setBattalions(data)
    })

    const timer = setInterval(() => setNow(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Calculate progress for a slot
  function getSlotStats(slotId: string) {
    const slotSets = sets.filter(s => s.slotId === slotId)
    let qualified = 0
    let total = 0
    
    slotSets.forEach(set => {
      const stats = getSetStats(set)
      qualified += stats.qualified
      total += stats.total
    })
    
    const percent = total > 0 ? Math.round((qualified / total) * 100) : 0
    return { qualified, total, percent }
  }

  function getSetStats(set: SetItem) {
    const total = set.cadets.length
    const qualified = set.cadets.filter(c => 
      c.history.find(h => h.setId === set.id)?.qualification === 'qualified'
    ).length
    const percent = total > 0 ? Math.round((qualified / total) * 100) : 0
    return { qualified, total, percent }
  }

  function getSlotStatus(slot: Slot) {
    if (slot.isFinished) return 'finished'
    
    const start = new Date(`${slot.date}T${slot.startTime}`)
    const end = slot.endTime ? new Date(`${slot.endDate || slot.date}T${slot.endTime}`) : null
    
    if (now < start) return 'pending'
    if (end && now > end) return 'finished'
    
    return 'active'
  }

  const statusLabels: Record<string, string> = {
    active: 'מתרחש כעת',
    pending: 'טרם התחיל',
    finished: 'הסתיים'
  }

  async function handleAddSlot(slotData: any) {
    setIsCreatingSlot(true)
    try {
    const newSlot: Slot = { 
      id: String(Date.now()), 
      name: slotData.name.trim(),
      battalionId: slotData.battalionId,
      date: slotData.date,
      startTime: slotData.startTime,
      endDate: slotData.endDate,
      endTime: slotData.endTime
    }

    if (slotData.locationId) {
      (newSlot as any).locationId = slotData.locationId
    }

    let newSets: SetItem[] = []

    // Handle Slot Template
    if (slotData.templateId) {
      const slotTemplates = storage.getSlotTemplates()
      const template = slotTemplates.find(t => t.id === slotData.templateId)
      if (template) {
        const setTemplates = storage.getTemplates()
        
        // If using a template (like Field Week), default to ALL cadets in the battalion
        let allCadets: Cadet[] = []
        const battalion = battalions.find(b => b.id === slotData.battalionId)
        
        if (battalion) {
          try {
            for (const comp of battalion.structure) {
              for (const team of comp.teams) {
                const teamCadets = await externalService.getCadetsByTeam(comp.companyName, String(team))
                const mappedCadets = teamCadets.map(c => {
                  const history = storage.getCadetHistory(c.id)
                  return { ...c, history, company: comp.companyName, team: String(team) }
                })
                allCadets = [...allCadets, ...mappedCadets]
              }
            }
          } catch (err) {
            console.error("Failed to fetch default cadets for template", err)
          }
        }

        newSets = template.sets.map((setDef, idx) => {
          const setTmpl = setTemplates.find(t => t.id === setDef.templateId)
          const requirements: SetRequirements | undefined = setTmpl ? {
            template: setTmpl.id,
            minHits: setTmpl.minHits,
            maxGroupSize: setTmpl.maxGroupSize,
            minScore: setTmpl.minScore,
            checklistItems: setTmpl.checklistItems
          } : undefined

          return {
            id: String(Date.now() + idx),
            slotId: newSlot.id,
            name: setDef.name,
            cadets: allCadets, // Default to all cadets for templates
            requirements
          }
        })
      }
    }
    
    const next = [newSlot, ...slots]
    setSlots(next)
    storage.saveSlots(next)
    
    if (newSets.length > 0) {
      const updatedSets = [...sets, ...newSets]
      setSets(updatedSets)
      storage.saveSets(updatedSets)
    }

    setIsAddSlotModalOpen(false)
    } catch (error) {
      console.error("Error creating slot:", error)
    } finally {
      setIsCreatingSlot(false)
    }
  }

  function deleteSlot(e: React.MouseEvent, id: string) {
    e.preventDefault() // Prevent navigation
    if (!window.confirm('האם אתה בטוח שברצונך למחוק משבצת זו?')) return
    
    const next = slots.filter(s => s.id !== id)
    setSlots(next)
    storage.saveSlots(next)
  }

  function toggleFinishSlot(e: React.MouseEvent, slot: Slot) {
    e.preventDefault()
    const next = slots.map(s => {
      if (s.id === slot.id) {
        return { ...s, isFinished: !s.isFinished }
      }
      return s
    })
    setSlots(next)
    storage.saveSlots(next)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>משבצות אימון</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>ניהול משבצות ומקצים</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/resources" className="btn btn-secondary">🗺️ תמונת מצב</Link>
          <button onClick={() => setIsAddSlotModalOpen(true)} className="btn btn-primary">
            + משבצת חדשה
          </button>
        </div>
      </div>

      <div className="slots-grid">
        {slots.length === 0 && <div className="empty">אין משבצות כרגע — הוסף אחת</div>}
        {slots.map(s => {
          const status = getSlotStatus(s)
          const slotSets = sets.filter(set => set.slotId === s.id)
          const slotStats = getSlotStats(s.id)
          return (
            <Link key={s.id} to={`/slots/${s.id}`} className="slot-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="slot-name">{s.name}</div>
                  <div className="slot-meta">
                    <span>📅 {formatDate(s.date)}</span>
                    <span>
                      ⌚ {s.startTime} 
                      {s.endTime ? ` - ${s.endTime} ${s.endDate && s.endDate !== s.date ? `(${formatDate(s.endDate)})` : ''}` : ''}
                    </span>
                    <span>🏢 {battalions.find(b => b.id === s.battalionId)?.name || 'גדוד לא ידוע'}</span>
                  </div>
                </div>
                <span className={`status-badge ${status}`}>
                  {statusLabels[status]}
                </span>
              </div>
              
              <div className="progress-container">
                <div className="progress-label">
                  <span>התקדמות הכשרה כללית</span>
                  <span>{slotStats.qualified}/{slotStats.total}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: slotStats.total > 0 ? `${(slotStats.qualified / slotStats.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              {slotSets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {slotSets.map(set => {
                    const setStats = getSetStats(set)
                    return (
                      <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                        <div style={{ width: '120px', flexShrink: 0, color: 'var(--text-secondary)' }}>{set.name}</div>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-app)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: setStats.total > 0 ? `${(setStats.qualified / setStats.total) * 100}%` : '0%', 
                              height: '100%', 
                              background: 'var(--primary)',
                              opacity: 0.8 
                            }}
                          ></div>
                        </div>
                        <div style={{ width: '40px', textAlign: 'left', fontSize: '0.75rem' }}>{setStats.qualified}/{setStats.total}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="slot-actions">
                <button 
                  onClick={(e) => toggleFinishSlot(e, s)} 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  {s.isFinished ? 'פתח מחדש' : 'סיים משבצת'}
                </button>
                <button onClick={(e) => deleteSlot(e, s.id)} className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                  מחק
                </button>
              </div>
            </Link>
          )
        })}
      </div>

      {isAddSlotModalOpen && (
        <AddSlotModal 
          onClose={() => setIsAddSlotModalOpen(false)} 
          onAdd={handleAddSlot} 
        />
      )}

      {isCreatingSlot && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="spinner"></div>
          <div style={{ color: 'white', marginTop: '1rem', fontWeight: 'bold' }}>יוצר משבצת...</div>
        </div>
      )}
    </div>
  )
}
