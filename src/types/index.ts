export type QualificationStatus = 'not-qualified' | 'pending' | 'qualified'

export interface CadetPerformance {
  hits: number
  groupSize: number
  qualification: QualificationStatus
}

export interface CadetSetRecord extends CadetPerformance {
  setId: string
  setName: string
  timestamp: number
}

export interface Cadet {
  id: string
  name: string
  company: string
  team: string
  history: CadetSetRecord[] // All past sets in this slot
}

export interface SetItem {
  id: string
  name: string
  cadets: Cadet[]
}

export interface Slot {
  id: string
  name: string
  description?: string
}
