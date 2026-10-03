// Farben für Kalender und Erinnerungen-Listen.
// Die Kurzbefehle-App verrät die echte Kalenderfarbe nicht. Deshalb bekommt jeder Kalendername
// immer dieselbe Farbe aus dieser Palette (aus dem Namen "berechnet").
const PALETTE = ['#ff453a', '#ff9f0a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff375f', '#ffd60a', '#ac8e68', '#5e5ce6']

export function farbeFuer(name?: string): string {
  if (!name) return '#0a84ff'
  let h = 0
  for (const zeichen of name) h = (h * 31 + zeichen.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Apple-Rot für "heute" */
export const ROT = '#ff453a'
