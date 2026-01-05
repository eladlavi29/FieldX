import React, { useState, useEffect } from 'react'
import type { Battalion, SlotTemplateDef } from '../types'
import { storage, Location } from '../services/storage'
import { externalService } from '../services/external'

interface AddSlotModalProps {
  onClose: () => void
  onAdd: (slotData: any) => void
}

export default function AddSlotModal({ onClose, onAdd }: AddSlotModalProps) {
  const [name, setName] = useState('')
  const [battalionId, setBattalionId] = useState('alon')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [endTime, setEndTime] = useState('17:00')
  const [battalions, setBattalions] = useState<Battalion[]>([])
  const [slotTemplates, setSlotTemplates] = useState<SlotTemplateDef[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [locationId, setLocationId] = useState('')
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    externalService.getAllBattalions().then(setBattalions)
    setSlotTemplates(storage.getSlotTemplates())
    setLocations(storage.getLocations())
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd({
      name,
      battalionId,
      date,
      startTime,
      endDate,
      endTime,
      templateId: selectedTemplateId,
      locationId
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>יצירת משבצת אימון חדשה</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>שם המשבצת</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: אימון חורף 2026" required />
          </div>

          <div className="form-group">
            <label>סוג משבצת (תבנית)</label>
            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
              <option value="">משבצת ריקה</option>
              {slotTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>מיקום (מתחם) <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={locationId} onChange={e => setLocationId(e.target.value)} required>
              <option value="">בחר מיקום...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>גדוד</label>
            <select value={battalionId} onChange={e => setBattalionId(e.target.value)}>
              {battalions.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>תאריך התחלה</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>שעת התחלה</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>תאריך סיום</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>שעת סיום</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">צור משבצת</button>
            <button type="button" onClick={onClose} className="btn btn-secondary">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}