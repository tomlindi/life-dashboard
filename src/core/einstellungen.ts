// Ein "Hook" (React-Baustein) zum Lesen und Ändern einer Einstellung.
// Benutzung:  const [ziel, setZiel] = useEinstellung('wochenzielWorkouts', 4)
// Der Wert wird in der Datenbank gespeichert und aktualisiert sich überall automatisch.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setzeEinstellung } from './db'

export function useEinstellung<T>(key: string, standard: T): [T, (neu: T) => void] {
  const eintrag = useLiveQuery(() => db.einstellungen.get(key), [key])
  const wert = eintrag ? (eintrag.value as T) : standard
  return [wert, (neu: T) => void setzeEinstellung(key, neu)]
}

/** IDs der Bereiche, die du in der App ausgeblendet hast (Mehr → Bereiche anzeigen). */
export const useAusgeblendet = () => useEinstellung<string[]>('ausgeblendeteBereiche', [])

/** Wochenziel Fitness (Anzahl Workouts pro Woche), gemeinsam genutzt von Heute und Fitness. */
export const useWochenziel = () => useEinstellung<number>('wochenzielWorkouts', 4)
