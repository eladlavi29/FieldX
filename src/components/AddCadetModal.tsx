import React, { useState, useEffect } from 'react'
import type { Cadet, Battalion } from '../types'
import { externalService } from '../services/external'
import { storage } from '../services/storage'

interface AddCadetModalProps {
  battalionId: string
  onClose: () => void
  onAdd: (cadet: Cadet) => void
}

export default function AddCadetModal({ battalionId, onClose, onAdd }: AddCadetModalProps) {
  const [company, setCompany] = useState('')
  const [team, setTeam] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [battalion, setBattalion] = useState<Battalion | null>(null)
  const [availableCadets, setAvailableCadets] = useState<{id: string, name: string}[]>([])
  const [selectedCadetId, setSelectedCadetId] = useState('')

  useEffect(() => {
    externalService.getBattalion(battalionId).then(b => setBattalion(b || null))
  }, [battalionId])

  // Fetch cadets when team changes
  useEffect(() => {
    if (company && team) {
      setLoading(true)
      externalService.getCadetsByTeam(company, team)
        .then(cadets => {
          setAvailableCadets(cadets)
          setLoading(false)
        })
    } else {
      setAvailableCadets([])
    }
  }, [company, team])

  const selectedCompanyStruct = battalion?.structure.find(c => c.companyName === company)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const cadetInfo = availableCadets.find(c => c.id === selectedCadetId)
      if (!cadetInfo) throw new Error('נא לבחור צוער')

      // Fetch history from Internal DB
      const history = storage.getCadetHistory(cadetInfo.id)
      
      const cadetToAdd: Cadet = {
        ...cadetInfo,
        company,
        team,
        history
      }
      onAdd(cadetToAdd)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>הוסף צוער</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="company">פלוגה</label>
            <select 
              id="company" 
              value={company} 
              onChange={e => {
                setCompany(e.target.value)
                setTeam('') // Reset team when company changes
              }}
              required
            >
              <option value="">בחר פלוגה...</option>
              {battalion?.structure.map(c => (
                <option key={c.companyName} value={c.companyName}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="team">מספר צוות</label>
            <select
              id="team"
              value={team}
              onChange={e => setTeam(e.target.value)}
              required
              disabled={!company}
            >
              <option value="">{company ? 'בחר צוות...' : 'בחר פלוגה קודם'}</option>
              {selectedCompanyStruct?.teams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {availableCadets.length > 0 && (
            <div className="form-group">
              <label htmlFor="cadet">בחר צוער</label>
              <select
                id="cadet"
                value={selectedCadetId}
                onChange={e => setSelectedCadetId(e.target.value)}
                required
              >
                <option value="">בחר...</option>
                {availableCadets.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'חיפוש...' : 'הוסף'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
