// Farben für Kalender und Erinnerungen-Listen.
//
// KALENDER: Die Kurzbefehle-App verrät die echte Kalenderfarbe nicht. Deshalb bekommt jeder neue
// Kalendername automatisch die nächste freie Apple-Farbe. Du kannst sie unter
// Mehr → Einstellungen → Kalenderfarben ändern. Gespeichert wird das in der Datenbank (IndexedDB)
// als Einstellung "kalenderFarben", z. B. { "Schule": "#0A84FF", "Sport": "#30D158" }.
import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, holeEinstellung, setzeEinstellung } from '../../core/db'

/** Apples Systemfarben im Dark Mode (in dieser Reihenfolge werden sie vergeben). */
export const APPLE_FARBEN = [
  { name: 'Rot', hex: '#FF453A' },
  { name: 'Orange', hex: '#FF9F0A' },
  { name: 'Gelb', hex: '#FFD60A' },
  { name: 'Grün', hex: '#30D158' },
  { name: 'Mint', hex: '#63E6E2' },
  { name: 'Türkis', hex: '#40C8E0' },
  { name: 'Cyan', hex: '#64D2FF' },
  { name: 'Blau', hex: '#0A84FF' },
  { name: 'Indigo', hex: '#5E5CE6' },
  { name: 'Lila', hex: '#BF5AF2' },
  { name: 'Pink', hex: '#FF375F' },
  { name: 'Braun', hex: '#AC8E68' },
] as const

const SCHLUESSEL = 'kalenderFarben'
/** So heißen Termine ohne Kalender (in Life angelegt, noch nicht von Apple zurückgemeldet). */
export const OHNE_KALENDER = 'Ohne Kalender'
const GRAU = '#8E8E93'

export type KalenderFarben = Record<string, string>

export const kalenderName = (kalender?: string) => kalender?.trim() || OHNE_KALENDER

/** Die nächste freie Farbe. Sind alle 12 vergeben, die am seltensten benutzte. */
function naechsteFarbe(vergeben: KalenderFarben): string {
  const anzahl = new Map<string, number>(APPLE_FARBEN.map((f) => [f.hex, 0]))
  for (const hex of Object.values(vergeben)) anzahl.set(hex, (anzahl.get(hex) ?? 0) + 1)
  return [...anzahl.entries()].sort((a, b) => a[1] - b[1])[0][0] // bei Gleichstand: frühere in der Liste
}

/** Gibt jedem Kalendernamen, der noch keine Farbe hat, die nächste freie. Gibt die neue Zuordnung zurück. */
export function vergibKalenderFarben(namen: Iterable<string>): Promise<KalenderFarben> {
  const liste = [...namen]
  // Transaktion: Rufen zwei Seiten das gleichzeitig auf, bekommt trotzdem jeder Kalender nur eine Farbe
  return db.transaction('rw', db.einstellungen, async () => {
    const farben = { ...(await holeEinstellung<KalenderFarben>(SCHLUESSEL, {})) }
    let geaendert = false
    for (const roh of liste) {
      const name = kalenderName(roh)
      if (farben[name]) continue
      farben[name] = naechsteFarbe(farben)
      geaendert = true
    }
    if (geaendert) await setzeEinstellung(SCHLUESSEL, farben)
    return farben
  })
}

export const setzeKalenderFarbe = async (name: string, hex: string) =>
  setzeEinstellung(SCHLUESSEL, { ...(await holeEinstellung<KalenderFarben>(SCHLUESSEL, {})), [name]: hex })

/**
 * Hook für Seiten: liefert die Farb-Zuordnung und eine Funktion farbe(kalender).
 * Kalender aus älteren Importen, die noch keine Farbe haben, bekommen hier automatisch eine.
 */
export function useKalenderFarben() {
  const farben = useLiveQuery(() => holeEinstellung<KalenderFarben>(SCHLUESSEL, {}), []) ?? {}
  // Alle Kalendernamen, die in den Terminen vorkommen
  const namen = useLiveQuery(async () => [...new Set((await db.termine.toArray()).map((t) => kalenderName(t.kalender)))].sort((a, b) => a.localeCompare(b, 'de')), []) ?? []
  const fehlend = namen.filter((n) => !farben[n])
  useEffect(() => {
    if (fehlend.length) void vergibKalenderFarben(fehlend)
  }, [fehlend.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps -- nur bei neuen Namen
  return { farben, namen, farbe: (kalender?: string) => farben[kalenderName(kalender)] ?? GRAU }
}

// ---------- Erinnerungen-Listen: Farbe aus dem Namen "berechnet" (immer dieselbe) ----------

export function farbeFuer(name?: string): string {
  if (!name) return '#0a84ff'
  let h = 0
  for (const zeichen of name) h = (h * 31 + zeichen.charCodeAt(0)) >>> 0
  return APPLE_FARBEN[h % APPLE_FARBEN.length].hex
}

/** Apple-Rot für "heute" */
export const ROT = '#ff453a'
