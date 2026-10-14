// Hobby-Timer: merkt sich nur den Startzeitpunkt (Einstellung "hobbyLaeuft"). Er läuft also weiter,
// auch wenn die App geschlossen wird. Beim Stoppen wird ein Eintrag mit Beginn und Ende gespeichert.
// Benutzt von der Hobbys-Seite und dem Banner auf "Heute".
import { db, holeEinstellung, setzeEinstellung } from '../../core/db'
import { neueId, tagVon } from '../../core/datum'
import { useEinstellung } from '../../core/einstellungen'

export const FARBE = 'var(--color-gelb)' // #ffd60a, im Light Mode dunkler (index.css)
export const LAUF = 'hobbyLaeuft'

/** Der laufende Hobby-Timer. */
export interface HobbyLauf {
  hobbyId: string
  start: string // ISO
}

export const useHobbyLauf = () => useEinstellung<HobbyLauf | null>(LAUF, null)

/** 1234 Sekunden -> "0:20:34" */
export function uhrText(sek: number) {
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${Math.floor(sek / 3600)}:${zwei(Math.floor(sek / 60) % 60)}:${zwei(sek % 60)}`
}

/**
 * Den laufenden Timer beenden und als Eintrag speichern (mindestens 1 Minute).
 * In einer Transaktion, damit ein doppeltes Antippen nicht zwei Einträge erzeugt.
 */
export function stoppeTimer() {
  return db.transaction('rw', db.einstellungen, db.hobbyZeiten, async () => {
    const lauf = await holeEinstellung<HobbyLauf | null>(LAUF, null)
    if (!lauf) return
    const ende = new Date().toISOString()
    const minuten = Math.max(1, Math.round((Date.parse(ende) - Date.parse(lauf.start)) / 60000))
    await db.hobbyZeiten.add({ id: neueId(), hobbyId: lauf.hobbyId, datum: tagVon(lauf.start), minuten, start: lauf.start, ende })
    await setzeEinstellung(LAUF, null)
  })
}

/** Timer für ein Hobby starten. Läuft schon einer (für ein anderes Hobby), wird er vorher gespeichert. */
export async function starteTimer(hobbyId: string) {
  await stoppeTimer()
  await setzeEinstellung(LAUF, { hobbyId, start: new Date().toISOString() } satisfies HobbyLauf)
}
