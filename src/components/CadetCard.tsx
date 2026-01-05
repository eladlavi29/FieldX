import React, { useState, useEffect } from 'react'
import type { Cadet, QualificationStatus, SetRequirements } from '../types'

interface CadetCardProps {
  cadet: Cadet
  setId: string
  setName: string
  requirements?: SetRequirements
  onUpdate: (cadet: Cadet) => void
}

export default function CadetCard({ cadet, setId, setName, requirements, onUpdate }: CadetCardProps) {
  const currentRecord = cadet.history.find(h => h.setId === setId)

  const [hits, setHits] = useState(currentRecord?.hits ?? 0)
  const [groupSize, setGroupSize] = useState(currentRecord?.groupSize ?? 0)
  const [score, setScore] = useState(currentRecord?.score ?? 0)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(currentRecord?.checklist ?? {})
  const [failures, setFailures] = useState(currentRecord?.failures ?? 0)
  const [customData, setCustomData] = useState<Record<string, any>>(currentRecord?.customData ?? {})
  
  const [qualification, setQualification] = useState<QualificationStatus>(
    currentRecord?.qualification ?? 'pending'
  )

  // Auto-calculate qualification based on requirements
  useEffect(() => {
    if (!requirements) return

    let isQualified = true
    let hasData = false

    // Check Hits
    if (requirements.minHits !== undefined) {
      hasData = true
      if (hits < requirements.minHits) isQualified = false
    }

    // Check Group Size
    if (requirements.maxGroupSize !== undefined) {
      // Only check group size if it's greater than 0 (assuming 0 means not measured yet or perfect, but usually input starts at 0)
      // Actually, let's assume if groupSize is 0 it might be unmeasured. 
      // But for "Zeroing", 0 is a valid (perfect) group. 
      // Let's assume hasData is true if we edited it.
      hasData = true
      if (groupSize > requirements.maxGroupSize) isQualified = false
    }

    // Check Score
    if (requirements.minScore !== undefined) {
      hasData = true
      if (score < requirements.minScore) isQualified = false
    }

    // Check Checklist Items
    if (requirements.checklistItems && requirements.checklistItems.length > 0) {
      const requiredItems = requirements.checklistItems
      const allChecked = requiredItems.every(k => checklist[k])
      if (allChecked) {
        isQualified = true
        hasData = true
      } else {
        isQualified = false
        // If nothing checked, maybe pending?
        if (requiredItems.some(k => checklist[k])) hasData = true
      }
    }

    // Check Custom Fields
    if (requirements.customFields) {
      for (const field of requirements.customFields) {
        const val = customData[field.id]
        if (field.type === 'checkbox') {
          // For checkbox requirement, usually means it must be checked
          if (val !== true) { isQualified = false; }
          if (val === true) hasData = true
        } else if (field.type === 'number') {
          const numVal = typeof val === 'number' ? val : 0
          if (field.min !== undefined && numVal < field.min) isQualified = false
          if (field.max !== undefined && numVal > field.max) isQualified = false
          // Assume if there's a min/max requirement, we need data.
          // If value is 0 and min is 0, it might be valid, but let's assume user interacts.
          // For simplicity, if customData has the key, we consider it hasData.
          if (customData.hasOwnProperty(field.id)) hasData = true
        }
      }
    }

    if (hasData) {
      setQualification(isQualified ? 'qualified' : 'pending')
    }
  }, [hits, groupSize, score, checklist, customData, requirements])

  // Save whenever data changes
  useEffect(() => {
    const updated = { ...cadet }
    const existingIdx = updated.history.findIndex(h => h.setId === setId)
    
    const record = {
      setId,
      setName,
      hits,
      groupSize,
      score,
      checklist,
      qualification,
      failures,
      customData,
      timestamp: existingIdx >= 0 ? updated.history[existingIdx].timestamp : Date.now(),
    }

    // Only update if changed to avoid loops (React handles this but good to be safe)
    // We rely on parent onUpdate to merge.
    if (existingIdx >= 0) {
      updated.history[existingIdx] = record
    } else {
      updated.history.push(record)
    }

    onUpdate(updated)
  }, [hits, groupSize, score, checklist, qualification, failures, customData])

  function toggleChecklist(key: string) {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function cycleQualification() {
    const states: QualificationStatus[] = ['pending', 'qualified']
    const next = states[(states.indexOf(qualification) + 1) % states.length]
    setQualification(next)
  }

  const qualificationLabel: Record<QualificationStatus, string> = {
    'not-qualified': 'עדיין לא מוכשר',
    'pending': 'עדיין לא מוכשר',
    'qualified': 'מוכשר',
  }

  // Render Helpers
  const renderCounter = (val: number, setVal: React.Dispatch<React.SetStateAction<number>>, step = 1) => (
    <div className="counter-control compact">
      <button className="counter-btn" onClick={() => setVal(v => Math.max(0, v - step))}>−</button>
      <input 
        type="number" 
        className="counter-input"
        value={val} 
        onChange={e => setVal(Math.max(0, parseFloat(e.target.value) || 0))} 
      />
      <button className="counter-btn" onClick={() => setVal(v => v + step)}>+</button>
    </div>
  )

  return (
    <div className="cadet-card">
      <div className="cadet-row">
        <div className="cadet-info">
          <div className="cadet-name">{cadet.name}</div>
          <div className="cadet-meta">פלוגה {cadet.company} • צוות {cadet.team}</div>
        </div>
        
        {/* Dynamic Columns based on Template */}
        {requirements?.minHits !== undefined && (
            <div className="cadet-data-cell">
              <span className="label">פגיעות</span>
              {renderCounter(hits, setHits)}
            </div>
        )}

        {requirements?.maxGroupSize !== undefined && (
            <div className="cadet-data-cell">
              <span className="label">מקבץ (ס"מ)</span>
              {renderCounter(groupSize, setGroupSize, 0.5)}
            </div>
        )}

        {requirements?.minScore !== undefined && (
            <div className="cadet-data-cell">
              <span className="label">ניקוד</span>
              {renderCounter(score, setScore, 1)}
            </div>
        )}

        {requirements?.checklistItems && requirements.checklistItems.length > 0 && (
          <div className="cadet-data-cell">
            <span className="label">שלבים</span>
            <div className="checklist-group">
              {requirements.checklistItems.map(item => (
                <label key={item} className="custom-checkbox">
                  <input 
                    type="checkbox" 
                    checked={checklist[item] || false} 
                    onChange={() => toggleChecklist(item)} 
                  />
                  <span className="checkmark"></span>
                  {item}
                </label>
              ))}
            </div>
          </div>
        )}

        {requirements?.customFields && requirements.customFields.map(field => (
          <div key={field.id} className="cadet-data-cell">
            <span className="label">{field.name}</span>
            {field.type === 'number' ? (
              renderCounter(
                typeof customData[field.id] === 'number' ? customData[field.id] : 0,
                (val) => {
                  const newVal = typeof val === 'function' ? val(typeof customData[field.id] === 'number' ? customData[field.id] : 0) : val
                  setCustomData(prev => ({ ...prev, [field.id]: newVal }))
                }
              )
            ) : (
              <label className="custom-checkbox">
                <input type="checkbox" checked={customData[field.id] === true} onChange={() => setCustomData(prev => ({ ...prev, [field.id]: !prev[field.id] }))} />
                <span className="checkmark"></span>
                {customData[field.id] ? 'עבר' : 'לא עבר'}
              </label>
            )}
          </div>
        ))}

        {requirements?.template !== 'custom' && (
          <div className="cadet-data-cell">
            <span className="label">נכשלים</span>
            {renderCounter(failures, setFailures)}
          </div>
        )}

        {/* Status Column - Always visible and clickable */}
        <div className="cadet-data-cell">
          <div 
            className={`status-pill ${qualification}`} 
            onClick={cycleQualification}
            title="לחץ לשינוי סטטוס ידני"
          >
            {qualificationLabel[qualification]}
          </div>
        </div>
      </div>
    </div>
  )
}
