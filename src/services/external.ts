import { Battalion } from '../types'

// --- Mock Data ---
const BATTALIONS_DATA: Record<string, Battalion> = {
  alon: {
    id: 'alon',
    name: 'גדוד אלון',
    structure: [
      { companyName: 'פלוגה א', teams: [1, 2, 3] },
      { companyName: 'פלוגה ב', teams: [4, 5, 6] },
      { companyName: 'פלוגה ג', teams: [7, 8, 9] },
      { companyName: 'פלוגה ד', teams: [10, 11, 12, 13] },
      { companyName: 'פלוגה ה', teams: [14, 15, 16] }
    ]
  }
}

// Generate ~15 cadets per team for realistic load
const generateMockCadets = () => {
  const cadets = []
  const structure = BATTALIONS_DATA['alon'].structure
  for (const comp of structure) {
    for (const team of comp.teams) {
      for (let i = 1; i <= 15; i++) {
        cadets.push({ id: `c_${comp.companyName}_${team}_${i}`, name: `צוער ${i} (${comp.companyName})`, company: comp.companyName, team: String(team) })
      }
    }
  }
  return cadets
}

const MOCK_CADETS = generateMockCadets()

// --- External Interface ---
export const externalService = {
  getBattalion: async (id: string): Promise<Battalion | undefined> => {
    await new Promise(r => setTimeout(r, 200))
    return BATTALIONS_DATA[id]
  },

  getAllBattalions: async (): Promise<Battalion[]> => {
    await new Promise(r => setTimeout(r, 200))
    return Object.values(BATTALIONS_DATA)
  },

  getCadetsByTeam: async (company: string, team: string) => {
    await new Promise(r => setTimeout(r, 400))
    return MOCK_CADETS.filter(c => c.company === company && c.team === String(team))
  },

  getCadetById: async (id: string) => {
    return MOCK_CADETS.find(c => c.id === id)
  }
}