// Welche Karten auf "Heute" stehen und in welcher Reihenfolge (Einstellungen → Heute anpassen).
// Gespeichert als Einstellung "heuteKarten": Liste von { id, an } in der gewählten Reihenfolge.
// Neue Karten (z. B. nach einem Update) kommen automatisch eingeschaltet ans Ende.
import { useEinstellung } from '../../core/einstellungen'

export const HEUTE_KARTEN = [
  { id: 'timer', name: 'Laufende Timer', info: 'Fokus und Hobby, nur wenn einer läuft' },
  { id: 'widgets', name: 'Kalender & Erinnerungen' },
  { id: 'health', name: 'Schritte, Schlaf, Wasser' },
  { id: 'klausur', name: 'Nächste Klausur', info: 'mit Lernzeit aus dem Fokus-Timer' },
  { id: 'aufgaben', name: 'Aufgaben heute' },
  { id: 'hinweise', name: 'Hinweise', info: 'Geburtstage und Backup-Erinnerung' },
  { id: 'aktivitaet', name: 'Aktivität' },
  { id: 'habits', name: 'Gewohnheiten' },
  { id: 'schnell', name: 'Schnell-Eintrag' },
  { id: 'rueckblick', name: 'Wochenrückblick' },
  { id: 'bereiche', name: 'Bereiche' },
] as const

export type KartenId = (typeof HEUTE_KARTEN)[number]['id']
export interface KartenWahl {
  id: KartenId
  an: boolean
}

const STANDARD: KartenWahl[] = HEUTE_KARTEN.map((k) => ({ id: k.id, an: true }))

/** Gespeicherte Wahl bereinigen: unbekannte IDs weg, fehlende Karten eingeschaltet hinten dran. */
export function vervollstaendige(gespeichert: KartenWahl[]): KartenWahl[] {
  const bekannt = gespeichert.filter((k) => HEUTE_KARTEN.some((h) => h.id === k.id))
  return [...bekannt, ...STANDARD.filter((s) => !bekannt.some((k) => k.id === s.id))]
}

export function useHeuteKarten(): [KartenWahl[], (neu: KartenWahl[]) => void, () => void] {
  const [gespeichert, setze] = useEinstellung<KartenWahl[]>('heuteKarten', STANDARD)
  return [vervollstaendige(gespeichert), setze, () => setze(STANDARD)]
}
