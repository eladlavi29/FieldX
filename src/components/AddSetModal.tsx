import React, { useState, useEffect } from 'react'
import type { Battalion, SetRequirements, SetTemplate, TemplateDef, CustomFieldDef } from '../types'
import { storage, Location, SubLocation } from '../services/storage'

interface AddSetModalProps {
  battalion: Battalion | undefined
  isLoading: boolean
  onClose: () => void
  onAdd: (name: string, selection: Record<string, string[]>, requirements: SetRequirements, subLocationIds: string[], teamLocations: Record<string, string>) => void
  slotLocationId?: string
}

export default function AddSetModal({ battalion, isLoading, onClose, onAdd, slotLocationId }: AddSetModalProps) {
  const [name, setName] = useState('')
  // Selection map: CompanyName -> Array of Team IDs
  const [selection, setSelection] = useState<Record<string, string[]>>({})
  
  // Requirements State
  const [template, setTemplate] = useState<SetTemplate>('custom')
  const [minHits, setMinHits] = useState<number | undefined>(undefined)
  const [maxGroupSize, setMaxGroupSize] = useState<number | undefined>(undefined)
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<'checkbox' | 'number'>('number')
  const [newFieldMin, setNewFieldMin] = useState<string>('')
  const [newFieldMax, setNewFieldMax] = useState<string>('')
  
  const [availableTemplates, setAvailableTemplates] = useState<TemplateDef[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  
  const [locations, setLocations] = useState<Location[]>([])
  const [teamLocations, setTeamLocations] = useState<Record<string, string>>({})

  const totalTeamsSelected = Object.values(selection).reduce((acc, teams) => acc + teams.length, 0)

  useEffect(() => {
    setAvailableTemplates(storage.getTemplates())
    setLocations(storage.getLocations())
  }, [])

  function handleTemplateChange(t: SetTemplate) {
    setTemplate(t)
    if (t === 'custom') {
      setMinHits(undefined)
      setMaxGroupSize(undefined)
      setMinScore(undefined)
      setChecklistItems([])
      setCustomFields([])
      return
    }

    const selected = availableTemplates.find(tmpl => tmpl.id === t)
    if (selected) {
      setMinHits(selected.minHits)
      setMaxGroupSize(selected.maxGroupSize)
      setMinScore(selected.minScore)
      setChecklistItems(selected.checklistItems || [])
    }
  }

  function saveAsTemplate() {
    if (!newTemplateName.trim()) return
    const newId = `custom_${Date.now()}`
    const newTemplate: TemplateDef = {
      id: newId,
      name: newTemplateName.trim(),
      minHits,
      maxGroupSize,
      minScore,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined
    }
    const updated = [...availableTemplates, newTemplate]
    setAvailableTemplates(updated)
    storage.saveTemplates(updated)
    setTemplate(newId)
    setIsSavingTemplate(false)
    setNewTemplateName('')
  }

  function toggleTeam(companyName: string, team: string) {
    setSelection(prev => {
      const currentTeams = prev[companyName] || []
      const isSelected = currentTeams.includes(team)
      
      let newTeams
      if (isSelected) {
        newTeams = currentTeams.filter(t => t !== team)
      } else {
        newTeams = [...currentTeams, team]
      }

      // Clean up empty keys
      if (newTeams.length === 0) {
        const { [companyName]: _, ...rest } = prev
        return rest
      }

      return { ...prev, [companyName]: newTeams }
    })
  }

  function toggleCompany(companyName: string, teams: number[]) {
    setSelection(prev => {
      const currentSelected = prev[companyName] || []
      const allSelected = teams.every(t => currentSelected.includes(String(t)))
      
      if (allSelected) {
        // Deselect all
        const { [companyName]: _, ...rest } = prev
        return rest
      } else {
        // Select all
        return { ...prev, [companyName]: teams.map(String) }
      }
    })
  }

  function toggleAll() {
    if (!battalion) return
    const allSelected = battalion.structure.every(c => 
      c.teams.every(t => selection[c.companyName]?.includes(String(t)))
    )

    if (allSelected) {
      setSelection({})
    } else {
      const newSelection: Record<string, string[]> = {}
      battalion.structure.forEach(c => {
        newSelection[c.companyName] = c.teams.map(String)
      })
      setSelection(newSelection)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name, selection, { 
      template,
      minHits, 
      maxGroupSize,
      minScore,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
      customFields: customFields.length > 0 ? customFields : undefined
    }, Object.values(teamLocations), teamLocations)
  }

  function addCustomField() {
    if (!newFieldName.trim()) return
    const field: CustomFieldDef = {
      id: String(Date.now()),
      name: newFieldName.trim(),
      type: newFieldType,
      min: newFieldType === 'number' && newFieldMin ? Number(newFieldMin) : undefined,
      max: newFieldType === 'number' && newFieldMax ? Number(newFieldMax) : undefined
    }
    setCustomFields([...customFields, field])
    setNewFieldName('')
    setNewFieldMin('')
    setNewFieldMax('')
  }

  const isFormValid = name.trim().length > 0 && totalTeamsSelected > 0

  const filteredLocations = slotLocationId 
    ? locations.filter(l => l.id === slotLocationId)
    : locations

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>הוספת מקצה חדש</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form" style={{ overflowY: 'auto' }}>
          <div className="form-group">
            <label>שם המקצה <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="לדוגמה: מקצה א' - משולב" 
              autoFocus
              required 
            />
          </div>

          <div className="form-group">
            <label>סוג מקצה (תבנית)</label>
            <select value={template} onChange={e => handleTemplateChange(e.target.value as SetTemplate)}>
              <option value="custom">התאמה אישית</option>
              {availableTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {(template === 'zeroing' || template === 'achievement') && (
            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
              {(template === 'zeroing' || template === 'achievement') && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>מינימום פגיעות</label>
                  <input type="number" value={minHits ?? ''} onChange={e => setMinHits(e.target.value ? Number(e.target.value) : undefined)} min="0" placeholder="ללא" />
                </div>
              )}
              
              {(template === 'zeroing') && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>מקבץ מקסימלי (ס"מ)</label>
                  <input type="number" value={maxGroupSize ?? ''} onChange={e => setMaxGroupSize(e.target.value ? Number(e.target.value) : undefined)} min="0" placeholder="ללא" />
                </div>
              )}

              {(template === 'achievement') && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>מינימום ניקוד</label>
                  <input type="number" value={minScore ?? ''} onChange={e => setMinScore(e.target.value ? Number(e.target.value) : undefined)} min="0" placeholder="ללא" />
                </div>
              )}
            </div>
          )}

          {template === 'custom' && (
            <div className="form-group">
              <label>קריטריונים להכשרה</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {customFields.map(field => (
                  <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.9rem' }}>
                      <strong>{field.name}</strong> ({field.type === 'number' ? 'מספר' : 'תיבת סימון'})
                      {field.type === 'number' && (field.min !== undefined || field.max !== undefined) && 
                        ` [${field.min ?? '-'} - ${field.max ?? '-'}]`
                      }
                    </span>
                    <button type="button" onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>הסר</button>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.75rem' }}>שם המדד</label>
                  <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="שם" style={{ padding: '0.4rem' }} />
                </div>
                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: '0.75rem' }}>סוג</label>
                  <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} style={{ padding: '0.4rem' }}>
                    <option value="number">מספר</option>
                    <option value="checkbox">תיבת סימון</option>
                  </select>
                </div>
                {newFieldType === 'number' && (
                  <>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '0.75rem' }}>מינ'</label><input type="number" value={newFieldMin} onChange={e => setNewFieldMin(e.target.value)} style={{ padding: '0.4rem' }} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '0.75rem' }}>מקס'</label><input type="number" value={newFieldMax} onChange={e => setNewFieldMax(e.target.value)} style={{ padding: '0.4rem' }} /></div>
                  </>
                )}
                <button type="button" onClick={addCustomField} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>הוסף</button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>שיוך מיקומים לצוותים</label>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', maxHeight: '300px', overflowY: 'auto', background: '#f8fafc' }}>
              {filteredLocations.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>אין מיקומים זמינים</div>}
              
              {Object.entries(selection).map(([company, teams]) => (
                teams.map(team => {
                  const key = `${company}_${team}`
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 500, minWidth: '120px' }}>{company} - צוות {team}</div>
                      <select 
                        value={teamLocations[key] || ''} 
                        onChange={e => setTeamLocations(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ flex: 1, padding: '0.3rem' }}
                      >
                        <option value="">-- בחר מיקום --</option>
                        {filteredLocations.map(loc => (
                          <optgroup key={loc.id} label={loc.name}>
                            {loc.subLocations.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )
                })
              ))}
              {totalTeamsSelected === 0 && <div style={{ color: '#94a3b8', textAlign: 'center' }}>נא לבחור צוותים תחילה</div>}
            </div>
          </div>

          <div className="selection-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                בחירת צוותים משתתפים <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button type="button" onClick={toggleAll} className="btn-link">
                בחר/נקה הכל
              </button>
            </div>
            
            <div className="battalion-structure">
              {battalion?.structure.map(company => (
                <div key={company.companyName} className="company-block">
                  <div className="company-header">
                    <div className="company-title">{company.companyName}</div>
                    <button 
                      type="button" 
                      className="btn-link-small"
                      onClick={() => toggleCompany(company.companyName, company.teams)}
                    >בחר פלוגה</button>
                  </div>
                  <div className="teams-list">
                    {company.teams.map(team => {
                      const teamStr = String(team)
                      const isSelected = selection[company.companyName]?.includes(teamStr)
                      return (
                        <button
                          key={team}
                          type="button"
                          className={`team-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleTeam(company.companyName, teamStr)}
                        >
                          צוות {team}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading || !isFormValid}
              style={{ opacity: (isLoading || !isFormValid) ? 0.5 : 1, cursor: (isLoading || !isFormValid) ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'יוצר מקצה...' : `צור מקצה (${totalTeamsSelected} צוותים)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}