import React, { useState, useMemo } from 'react'
import type { SetItem, Cadet } from '../types'
import CadetCard from './CadetCard'

interface SetCardProps {
  set: SetItem
  onUpdateCadet: (cadet: Cadet) => void
  onEdit: () => void
  onDelete: () => void
  isSummary?: boolean
  onClick?: () => void
  onBack?: () => void
}

export default function SetCard({ set, onUpdateCadet, onEdit, onDelete, isSummary, onClick, onBack }: SetCardProps) {
  const [view, setView] = useState<'companies' | 'teams' | 'cadets'>('companies')
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  const getStats = (cadets: Cadet[]) => {
    const qualified = cadets.filter(c => 
      c.history.find(h => h.setId === set.id)?.qualification === 'qualified'
    ).length
    const total = cadets.length
    const percent = total > 0 ? Math.round((qualified / total) * 100) : 0
    return { qualified, total, percent }
  }

  const statsCadets = useMemo(() => {
    if (selectedTeam && selectedCompany) {
      return set.cadets.filter(c => c.company === selectedCompany && c.team === selectedTeam)
    }
    if (selectedCompany) {
      return set.cadets.filter(c => c.company === selectedCompany)
    }
    return set.cadets
  }, [set.cadets, selectedCompany, selectedTeam])

  const currentStats = getStats(statsCadets)

  const progressLabel = useMemo(() => {
    if (selectedTeam && selectedCompany) return `התקדמות צוות ${selectedTeam}`
    if (selectedCompany) return `התקדמות ${selectedCompany}`
    return 'התקדמות מקצה כוללת'
  }, [selectedCompany, selectedTeam])

  const companies = useMemo(() => {
    const unique = Array.from(new Set(set.cadets.map(c => c.company))).sort()
    return unique.map(name => ({
      name,
      cadets: set.cadets.filter(c => c.company === name)
    }))
  }, [set.cadets])

  const teams = useMemo(() => {
    if (!selectedCompany) return []
    const companyCadets = set.cadets.filter(c => c.company === selectedCompany)
    const unique = Array.from(new Set(companyCadets.map(c => c.team))).sort()
    return unique.map(name => ({
      name,
      cadets: companyCadets.filter(c => c.team === name)
    }))
  }, [set.cadets, selectedCompany])

  const currentCadets = useMemo(() => {
    if (!selectedCompany || !selectedTeam) return []
    return set.cadets.filter(c => c.company === selectedCompany && c.team === selectedTeam)
  }, [set.cadets, selectedCompany, selectedTeam])

  return (
    <div 
      className={`set-card ${isSummary ? 'summary-mode' : ''}`} 
      onClick={isSummary ? onClick : undefined}
      style={isSummary ? { cursor: 'pointer' } : undefined}
    >
      <div className="set-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!isSummary && onBack && (
            <button 
              onClick={(e) => { e.stopPropagation(); onBack(); }} 
              className="nav-back-btn"
              title="חזור לרשימת המקצים"
            >
              🡨 חזור
            </button>
          )}
          <h3>{set.name}</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>ערוך</button>
          <button onClick={onDelete} className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>מחק</button>
        </div>
      </div>

      <div className="progress-container" style={{ marginBottom: '1.5rem', padding: '0 1.5rem' }}>
        <div className="progress-label">
          <span>{progressLabel}</span>
          <span>{currentStats.qualified}/{currentStats.total}</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: currentStats.total > 0 ? `${(currentStats.qualified / currentStats.total) * 100}%` : '0%' }}></div>
        </div>
      </div>

      {!isSummary && <div className="set-content">
        {set.cadets.length === 0 && <div className="empty-small">אין צוערים במקצה זה</div>}

        {/* Level 1: Companies */}
        {view === 'companies' && set.cadets.length > 0 && (
          <div className="drill-grid">
            {companies.map(comp => {
              const compStats = getStats(comp.cadets)
              return (
                <div key={comp.name} className="drill-card" onClick={() => {
                  setSelectedCompany(comp.name)
                  setView('teams')
                }}>
                  <div className="drill-title">{comp.name}</div>
                  <div className="drill-meta">{comp.cadets.length} צוערים</div>
                  <div className="progress-container">
                    <div className="progress-bar-bg" style={{ height: '0.5rem' }}>
                      <div className="progress-bar-fill" style={{ width: compStats.total > 0 ? `${(compStats.qualified / compStats.total) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
                  <div className="drill-stats">{compStats.percent}% הוכשרו</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Level 2: Teams */}
        {view === 'teams' && (
          <div>
            <div className="drill-header">
              <span className="drill-breadcrumb">{selectedCompany}</span>
              <button className="nav-back-btn" style={{ fontSize: '0.9rem' }} onClick={() => {
                setSelectedCompany(null)
                setView('companies')
              }}>חזרה לפלוגות 🡪</button>
            </div>
            <div className="drill-grid">
              {teams.map(team => {
                const teamStats = getStats(team.cadets)
                return (
                  <div key={team.name} className="drill-card" onClick={() => {
                    setSelectedTeam(team.name)
                    setView('cadets')
                  }}>
                    <div className="drill-title">צוות {team.name}</div>
                    <div className="drill-meta">{team.cadets.length} צוערים</div>
                    <div className="progress-container">
                      <div className="progress-bar-bg" style={{ height: '0.5rem' }}>
                        <div className="progress-bar-fill" style={{ width: teamStats.total > 0 ? `${(teamStats.qualified / teamStats.total) * 100}%` : '0%' }}></div>
                      </div>
                    </div>
                    <div className="drill-stats">{teamStats.percent}% הוכשרו</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Level 3: Cadets */}
        {view === 'cadets' && (
          <div>
            <div className="drill-header">
              <span className="drill-breadcrumb">{selectedCompany} / צוות {selectedTeam}</span>
              <button className="nav-back-btn" style={{ fontSize: '0.9rem' }} onClick={() => {
                setSelectedTeam(null)
                setView('teams')
              }}>חזרה לצוותים 🡪</button>
            </div>
            <div className="cadets-grid">
              {currentCadets.map(c => (
                <CadetCard
                  key={c.id}
                  cadet={c}
                  setId={set.id}
                  setName={set.name}
                  requirements={set.requirements}
                  onUpdate={cadet => onUpdateCadet(cadet)}
                />
              ))}
            </div>
          </div>
        )}
      </div>}
    </div>
  )
}