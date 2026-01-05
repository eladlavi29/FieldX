export type QualificationStatus = 'pending' | 'qualified' | 'not-qualified'

export interface TeamStructure {
  companyName: string
  teams: number[]
}

export interface Battalion {
  id: string
  name: string
  structure: TeamStructure[]
}

export interface HistoryRecord {
  setId: string
  setName: string
  hits: number
  groupSize: number
  score?: number
  checklist?: Record<string, boolean>
  qualification: QualificationStatus
  failures?: number
  customData?: Record<string, number | boolean>
  timestamp: number
}

export interface Cadet {
  id: string
  name: string
  company: string
  team: string
  history: HistoryRecord[]
}

export type SetTemplate = string

export interface TemplateDef {
  id: string
  name: string
  minHits?: number
  maxGroupSize?: number
  minScore?: number
}

export interface CustomFieldDef {
  id: string
  name: string
  type: 'checkbox' | 'number'
  min?: number
  max?: number
}

export interface SlotTemplateDef {
  id: string
  name: string
  sets: { name: string; templateId: string }[]
}

export interface SetRequirements {
  template: SetTemplate
  minHits?: number
  maxGroupSize?: number
  minScore?: number
}

export interface SetItem {
  id: string
  slotId: string
  name: string
  cadets: Cadet[]
  requirements?: SetRequirements
}

export interface Slot {
  id: string
  name: string
  battalionId: string
  date: string
  startTime: string
  endDate?: string
  endTime?: string
  isFinished?: boolean
  description?: string
}