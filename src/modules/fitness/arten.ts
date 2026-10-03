// Welche Sportarten es gibt: Symbol, Farbe, ob Distanz/Pace wichtig ist und welche Arten von Einheiten.
// Eine neue Sportart hinzufügen = hier einen Eintrag ergänzen. Sie bekommt dann automatisch
// eine Kachel in Fitness und eine eigene Seite.
import { Activity, Bike, Dumbbell, Flower2, Footprints, Volleyball, Waves, type LucideIcon } from 'lucide-react'

export interface Sportart {
  name: string
  icon: LucideIcon
  farbe: string
  distanz: boolean // true = km und Pace anzeigen (Laufen, Rad, …)
  typen: string[] // Arten von Einheiten, z. B. "Long Run" oder "Spiel"
}

export const SPORTARTEN: Sportart[] = [
  { name: 'Gym', icon: Dumbbell, farbe: '#ff375f', distanz: false, typen: [] },
  { name: 'Laufen', icon: Footprints, farbe: '#ff9f0a', distanz: true, typen: ['Locker', 'Tempo', 'Intervall', 'Long Run', 'Wettkampf'] },
  { name: 'Handball', icon: Volleyball, farbe: '#0a84ff', distanz: false, typen: ['Training', 'Spiel'] },
  { name: 'Rad', icon: Bike, farbe: '#64d2ff', distanz: true, typen: ['Locker', 'Tempo', 'Lange Tour'] },
  { name: 'Schwimmen', icon: Waves, farbe: '#5ac8fa', distanz: true, typen: ['Technik', 'Ausdauer'] },
  { name: 'Yoga', icon: Flower2, farbe: '#bf5af2', distanz: false, typen: [] },
  { name: 'Gehen', icon: Footprints, farbe: '#a3e635', distanz: true, typen: [] },
  { name: 'Sonstiges', icon: Activity, farbe: '#8e8e93', distanz: false, typen: [] },
]

/** Sportart nach Namen. Unbekannte Arten (z. B. aus Apple Health) bekommen ein Standard-Aussehen. */
export const sportart = (name: string): Sportart =>
  SPORTARTEN.find((s) => s.name === name) ?? { name, icon: Activity, farbe: '#8e8e93', distanz: false, typen: [] }

/** Symbol für eine Art (für Listen). */
export const iconFuer = (art: string): LucideIcon => sportart(art).icon

/** Für das Formular: Name -> Symbol (ohne Gym, das hat sein eigenes Training-Log). */
export const ARTEN: Record<string, LucideIcon> = Object.fromEntries(SPORTARTEN.map((s) => [s.name, s.icon]))

/** Erkennt aus dem Titel eines Kalendertermins, ob es ein geplantes Workout ist. */
export const istWorkoutTermin = (titel: string) =>
  /gym|training|sport|lauf|jogg|rad|schwimm|fitness|yoga|workout|fu(ß|ss)ball|handball|kraft/i.test(titel)

/** Pace in Minuten pro km: 42 Min für 6,8 km -> "6:11 /km" */
export function pace(dauerMin: number, km?: number): string | null {
  if (!km || km <= 0 || !dauerMin) return null
  const minProKm = dauerMin / km
  const min = Math.floor(minProKm)
  const sek = Math.round((minProKm - min) * 60)
  return `${sek === 60 ? min + 1 : min}:${String(sek === 60 ? 0 : sek).padStart(2, '0')} /km`
}

/** Geschwindigkeit in km/h (für Rad) */
export const kmh = (dauerMin: number, km?: number) => (km && dauerMin ? (km / dauerMin) * 60 : null)
