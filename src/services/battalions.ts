export interface TeamStructure {
  companyName: string
  teams: number[]
}

export interface Battalion {
  id: string
  name: string
  structure: TeamStructure[]
}

export const BATTALIONS: Record<string, Battalion> = {
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

export function getBattalion(id: string): Battalion | undefined {
  return BATTALIONS[id]
}