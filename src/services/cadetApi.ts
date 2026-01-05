export async function fetchCadetName(company: string, team: string): Promise<string | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600))
  
  // Mock logic: In a real app, this would fetch from a server
  if (company && team) {
    return `צוער ${company}/${team}`
  }
  return null
}