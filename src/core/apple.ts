// ABGLEICH MIT APPLE KALENDER & ERINNERUNGEN
//
// Eine Web-App darf nicht direkt auf Apple-Daten zugreifen. Deshalb:
//   • Änderungen in Life (neuer Termin, Erinnerung abgehakt …) kommen in eine Warteschlange.
//   • "Mit Apple abgleichen" startet den Kurzbefehl "Life Sync" und übergibt ihm die Warteschlange als JSON.
//   • Der Kurzbefehl trägt alles in Apple ein und kopiert danach alle aktuellen Daten in die Zwischenablage.
//   • Zurück in Life: "Importieren" -> beide Seiten sind auf demselben Stand.
//
// Format, das der Kurzbefehl bekommt:
// { "aktionen": [
//     { "typ": "termin", "loeschen": { "titel": "…", "start": "ISO" }, "neu": { "titel", "start", "ende", "ort", "notiz", "ganztaegig" } },
//     { "typ": "erinnerung", "erledigt": { "titel": "…" } },
//     { "typ": "erinnerung", "loeschen": { "titel": "…" }, "neu": { "titel", "faellig", "notiz", "liste" } }
// ] }
// Ändern = altes löschen + neues anlegen (so bleibt der Kurzbefehl einfach).
import { db, holeEinstellung, setzeEinstellung, type Aufgabe, type Termin } from './db'

export const SYNC_KURZBEFEHL = 'Life Sync'

interface TerminDaten {
  titel: string
  start: string
  ende?: string
  ort?: string
  notiz?: string
  ganztaegig?: boolean
}
interface ErinnerungDaten {
  titel: string
  faellig?: string
  notiz?: string
  liste?: string
}
export type AppleAktion =
  | { typ: 'termin'; loeschen?: { titel: string; start: string }; neu?: TerminDaten }
  | { typ: 'erinnerung'; erledigt?: { titel: string }; wiederOffen?: { titel: string }; loeschen?: { titel: string }; neu?: ErinnerungDaten }

const SCHLUESSEL = 'appleWarteschlange'

async function inWarteschlange(aktion: AppleAktion) {
  const liste = await holeEinstellung<AppleAktion[]>(SCHLUESSEL, [])
  await setzeEinstellung(SCHLUESSEL, [...liste, aktion])
}

/** Gleiche ID-Regel wie beim Import -> ein in Life erstellter Termin wird beim Import wiedererkannt. */
export const terminId = (titel: string, startIso: string) => `kal:${titel}|${startIso.slice(0, 16)}`
export const aufgabeId = (titel: string) => `erinnerungen:${titel.trim().toLowerCase()}`

// ---------- Termine ----------

/** Termin anlegen oder ändern (in Life sofort, in Apple beim nächsten Abgleich). */
export async function speichereTermin(neu: Omit<Termin, 'id' | 'quelle'>, alt?: Termin) {
  const id = terminId(neu.titel, neu.start)
  await db.transaction('rw', db.termine, db.einstellungen, async () => {
    if (alt && alt.id !== id) await db.termine.delete(alt.id)
    await db.termine.put({ ...alt, ...neu, id, quelle: alt?.quelle === 'kalender' && alt.id === id ? 'kalender' : 'manuell', sync: 'ausstehend' })
    await inWarteschlange({
      typ: 'termin',
      loeschen: alt ? { titel: alt.titel, start: alt.start } : undefined,
      neu: { titel: neu.titel, start: neu.start, ende: neu.ende, ort: neu.ort, notiz: neu.notiz, ganztaegig: neu.ganztaegig },
    })
  })
}

export async function loescheTermin(t: Termin) {
  await db.transaction('rw', db.termine, db.einstellungen, async () => {
    await db.termine.delete(t.id)
    await inWarteschlange({ typ: 'termin', loeschen: { titel: t.titel, start: t.start } })
  })
}

// ---------- Erinnerungen ----------

export async function speichereErinnerung(neu: Omit<Aufgabe, 'id' | 'quelle' | 'erledigt'>, alt?: Aufgabe) {
  const id = aufgabeId(neu.titel)
  await db.transaction('rw', db.aufgaben, db.einstellungen, async () => {
    if (alt && alt.id !== id) await db.aufgaben.delete(alt.id)
    await db.aufgaben.put({ ...alt, ...neu, id, quelle: alt?.quelle ?? 'manuell', erledigt: alt?.erledigt ?? false, sync: 'ausstehend' })
    await inWarteschlange({
      typ: 'erinnerung',
      loeschen: alt ? { titel: alt.titel } : undefined,
      neu: { titel: neu.titel, faellig: neu.faellig, notiz: neu.notiz, liste: neu.liste },
    })
  })
}

/** Abhaken bzw. wieder öffnen. */
export async function schalteErinnerung(a: Aufgabe) {
  const erledigt = !a.erledigt
  await db.transaction('rw', db.aufgaben, db.einstellungen, async () => {
    await db.aufgaben.update(a.id, { erledigt, sync: 'ausstehend' })
    await inWarteschlange(erledigt ? { typ: 'erinnerung', erledigt: { titel: a.titel } } : { typ: 'erinnerung', wiederOffen: { titel: a.titel } })
  })
}

export async function loescheErinnerung(a: Aufgabe) {
  await db.transaction('rw', db.aufgaben, db.einstellungen, async () => {
    await db.aufgaben.delete(a.id)
    await inWarteschlange({ typ: 'erinnerung', loeschen: { titel: a.titel } })
  })
}

// ---------- Abgleich starten ----------

export const SYNC_GESTARTET = 'lifeSyncGestartet'

/**
 * Startet den Kurzbefehl "Life Sync" mit allen ausstehenden Änderungen.
 * Die Warteschlange wird geleert (der Kurzbefehl hat sie jetzt). Termine/Erinnerungen bleiben
 * als "ausstehend" markiert, bis der nächste Import sie von Apple zurückmeldet.
 */
export async function starteAbgleich() {
  const aktionen = await holeEinstellung<AppleAktion[]>(SCHLUESSEL, [])
  const text = JSON.stringify({ aktionen })
  await setzeEinstellung(SCHLUESSEL, [])
  await setzeEinstellung('letzterAbgleich', new Date().toISOString())
  try {
    sessionStorage.setItem(SYNC_GESTARTET, String(Date.now()))
  } catch {
    // privater Modus o. Ä. – dann eben ohne Hinweis beim Zurückkommen
  }
  window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SYNC_KURZBEFEHL)}&input=text&text=${encodeURIComponent(text)}`
}
