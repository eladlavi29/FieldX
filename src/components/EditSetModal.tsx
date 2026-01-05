import React, { useState, useEffect } from 'react'
import type { SetItem, SetRequirements, SetTemplate, TemplateDef, Battalion, CustomFieldDef } from '../types'
import { storage } from '../services/storage'

interface EditSetModalProps {
  set: SetItem
  battalion: Battalion | undefined
  onClose: () => void
  onSave: (id: string, name: string, requirements: SetRequirements, selection: Record<string, string[]>) => void
}

export default function EditSetModal({ set, battalion, onClose, onSave }: EditSetModalProps) {
  const [name, setName] = useState(set.name)
  const [template, setTemplate] = useState<SetTemplate>(set.requirements?.template ?? 'custom')
  const [minHits, setMinHits] = useState<number | undefined>(set.requirements?.minHits)
  const [maxGroupSize, setMaxGroupSize] = useState<number | undefined>(set.requirements?.maxGroupSize)
  const [minScore, setMinScore] = useState<number | undefined>(set.requirements?.minScore)
  const [checklistItems, setChecklistItems] = useState<string[]>(set.requirements?.checklistItems || [])
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>(set.requirements?.customFields || [])

  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<'checkbox' | 'number'>('number')
  const [newFieldMin, setNewFieldMin] = useState<string>('')
  const [newFieldMax, setNewFieldMax] = useState<string>('')

  const [availableTemplates, setAvailableTemplates] = useState<TemplateDef[]>([])
  const [selection, setSelection] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setAvailableTemplates(storage.getTemplates())
    
    // Initialize selection from existing cadets
    const initialSelection: Record<string, string[]> = {}
    set.cadets.forEach(c => {
      if (!initialSelection[c.company]) {
        initialSelection[c.company] = []
      }
      if (!initialSelection[c.company].includes(c.team)) {
        initialSelection[c.company].push(c.team)
      }
    })
    setSelection(initialSelection)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(set.id, name, { 
      template, 
      minHits, 
      maxGroupSize, 
      minScore,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
      customFields: customFields.length > 0 ? customFields : undefined
    }, selection)
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
        const { [companyName]: _, ...rest } = prev
        return rest
      } else {
        return { ...prev, [companyName]: teams.map(String) }
      }
    })
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>עריכת מקצה</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>שם המקצה</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>תבנית</label>
            <select value={template} onChange={e => setTemplate(e.target.value as SetTemplate)}>
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
              <label>מדדים מותאמים אישית</label>
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
            <label>רשימת תיוג</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {checklistItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    value={item} 
                    onChange={e => {
                      const newItems = [...checklistItems]
                      newItems[idx] = e.target.value
                      setChecklistItems(newItems)
                    }}
                    placeholder={`פריט ${idx + 1}`}
                  />
                  <button type="button" onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '0.5rem', lineHeight: 1 }}>×</button>
                </div>
              ))}
              {checklistItems.length < 4 && (
                <button type="button" onClick={() => setChecklistItems([...checklistItems, ''])} className="btn-link-small" style={{ alignSelf: 'flex-start' }}>+ הוסף פריט</button>
              )}
            </div>
          </div>

          <div className="selection-area">
            <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              עריכת צוותים משתתפים
            </label>
            <div className="battalion-structure">
              {battalion?.structure.map(company => (
                <div key={company.companyName} className="company-block">
                  <div className="company-header">
                    <div className="company-title">{company.companyName}</div>
                    <button type="button" className="btn-link-small" onClick={() => toggleCompany(company.companyName, company.teams)}>בחר פלוגה</button>
                  </div>
                  <div className="teams-list">
                    {company.teams.map(team => {
                      const teamStr = String(team)
                      const isSelected = selection[company.companyName]?.includes(teamStr)
                      return (
                        <button key={team} type="button" className={`team-chip ${isSelected ? 'selected' : ''}`} onClick={() => toggleTeam(company.companyName, teamStr)}>צוות {team}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">שמור שינויים</button>
            <button type="button" onClick={onClose} className="btn btn-secondary">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}