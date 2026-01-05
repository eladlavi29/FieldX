import { Cadet, HistoryRecord, SetItem, Slot, SlotTemplateDef, TemplateDef } from '../types'

const KEYS = {
  SLOTS: 'fieldx_slots',
  SETS: 'fieldx_sets',
  RESULTS: 'fieldx_results',
  TEMPLATES: 'fieldx_templates',
  SLOT_TEMPLATES: 'fieldx_slot_templates'
}

const DEFAULT_TEMPLATES: TemplateDef[] = [
  { id: 'zeroing', name: 'מטווח איפוס', minHits: 5, maxGroupSize: 5 },
  { id: 'achievement', name: 'מקבץ הישגי', minHits: 3, minScore: 35 },
  { id: 'squad_drill', name: 'פרט חולייה', checklistItems: ['יבש', 'רטוב'] },
  { id: 'range_management', name: 'ניהול מטווח' }
]

const DEFAULT_SLOT_TEMPLATES: SlotTemplateDef[] = [
  { 
    id: 'field_week', 
    name: 'שבוע שטח', 
    sets: [
      { name: 'פרט חולייה יום', templateId: 'squad_drill' },
      { name: 'פרט חולייה לילה', templateId: 'squad_drill' },
      { name: 'ניהול מטווח יום', templateId: 'range_management' },
      { name: 'ניהול מטווח לילה', templateId: 'range_management' }
    ]
  },
  { id: 'zeroing_day', name: 'יום איפוס', sets: [{ name: 'מטווח איפוס', templateId: 'zeroing' }] }
]

export const storage = {
  getSlots: (): Slot[] => JSON.parse(localStorage.getItem(KEYS.SLOTS) || '[]'),
  saveSlots: (slots: Slot[]) => localStorage.setItem(KEYS.SLOTS, JSON.stringify(slots)),
  
  getSets: (): SetItem[] => JSON.parse(localStorage.getItem(KEYS.SETS) || '[]'),
  saveSets: (sets: SetItem[]) => localStorage.setItem(KEYS.SETS, JSON.stringify(sets)),

  // --- Internal DB: Results Management ---
  
  // Get all results for a specific cadet ID
  getCadetHistory: (cadetId: string): HistoryRecord[] => {
    const allResults = JSON.parse(localStorage.getItem(KEYS.RESULTS) || '{}')
    return allResults[cadetId] || []
  },

  // Save a result record for a cadet
  saveCadetResult: (cadetId: string, record: HistoryRecord) => {
    const allResults = JSON.parse(localStorage.getItem(KEYS.RESULTS) || '{}')
    const cadetHistory = allResults[cadetId] || []
    
    // Update existing record for this set if exists, or push new
    const idx = cadetHistory.findIndex((h: HistoryRecord) => h.setId === record.setId)
    if (idx >= 0) {
      cadetHistory[idx] = record
    } else {
      cadetHistory.push(record)
    }
    
    allResults[cadetId] = cadetHistory
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(allResults))
  },

  // --- Templates ---
  getTemplates: (): TemplateDef[] => {
    const stored = localStorage.getItem(KEYS.TEMPLATES)
    return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES
  },

  saveTemplates: (templates: TemplateDef[]) => {
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates))
  },

  getSlotTemplates: (): SlotTemplateDef[] => {
    const stored = localStorage.getItem(KEYS.SLOT_TEMPLATES)
    return stored ? JSON.parse(stored) : DEFAULT_SLOT_TEMPLATES
  }
}