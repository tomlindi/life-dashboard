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
import { sammleDaten } from './backup'

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

/**
 * ID eines in Life angelegten Termins (Titel + Start). Life kennt den Apple-Kalender dafür noch nicht.
 * Kommt der Termin beim Import von Apple zurück, bekommt er eine ID mit Kalender ("apple:…", siehe
 * importierteTerminId), und der Import ersetzt den "kal:"-Eintrag mit gleichem Titel + Start.
 */
export const terminId = (titel: string, startIso: string) => `kal:${titel}|${startIso.slice(0, 16)}`
/** ID eines importierten Termins: Titel + Start + Kalender. Verschoben = neuer Termin. */
export const importierteTerminId = (titel: string, startIso: string, kalender?: string) => `apple:${kalender ?? ''}|${titel}|${startIso.slice(0, 16)}`
/** Erinnerung = Titel + Liste. Gleicher Titel in zwei Listen sind zwei Aufgaben, gleicher Titel in derselben Liste eine. */
export const aufgabeId = (titel: string, liste?: string) => `erinnerungen:${(liste ?? '').trim().toLowerCase()}|${titel.trim().toLowerCase()}`
/** Alte ID (bis Oktober 2026 nur aus dem Titel) – damit vorhandene Aufgaben beim Import übernommen werden. */
export const alteAufgabeId = (titel: string) => `erinnerungen:${titel.trim().toLowerCase()}`

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
  const id = aufgabeId(neu.titel, neu.liste)
  await db.transaction('rw', db.aufgaben, db.einstellungen, async () => {
    if (alt && alt.id !== id) await db.aufgaben.delete(alt.id)
    // In eine andere Liste verschoben: der Abschnitt gehörte zur alten Liste
    const abschnitt = alt && alt.liste !== neu.liste ? { abschnittId: neu.abschnittId } : {}
    await db.aufgaben.put({ ...alt, ...neu, ...abschnitt, id, quelle: alt?.quelle ?? 'manuell', erledigt: alt?.erledigt ?? false, sync: 'ausstehend' })
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

// ---------- Automatisches Backup beim Abgleich ----------
// Ist es eingeschaltet (Mehr → Backup), bekommt "Life Sync" zusätzlich das komplette Backup und speichert es
// in iCloud Drive als "Life Backup <Wochentag>.json" (eine Datei pro Wochentag, jede Woche überschrieben).
// Das Backup ist zu groß für die Adresse, deshalb geht es über die Zwischenablage (input=clipboard).
// Der Schalter liegt im localStorage, weil er beim Antippen sofort (ohne Datenbank-Wartezeit) bekannt sein muss.

const AUTO_BACKUP = 'autoBackup'
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function autoBackupAn(): boolean {
  try {
    return localStorage.getItem(AUTO_BACKUP) === 'an'
  } catch {
    return false
  }
}
export function setzeAutoBackup(an: boolean) {
  try {
    if (an) localStorage.setItem(AUTO_BACKUP, 'an')
    else localStorage.removeItem(AUTO_BACKUP)
  } catch {
    // privater Modus: dann eben ohne
  }
}
export const backupDateiName = (d = new Date()) => `Life Backup ${WOCHENTAGE[d.getDay()]}.json`

/** Warteschlange holen und leeren; mit Backup, wenn gewünscht. Ergebnis: der Text für den Kurzbefehl. */
async function abgleichText(mitBackup: boolean) {
  const aktionen = await holeEinstellung<AppleAktion[]>(SCHLUESSEL, [])
  await setzeEinstellung(SCHLUESSEL, [])
  const jetzt = new Date().toISOString()
  await setzeEinstellung('letzterAbgleich', jetzt)
  if (!mitBackup) return JSON.stringify({ aktionen })
  const backup = JSON.stringify(await sammleDaten())
  await setzeEinstellung('letztesBackup', jetzt)
  return JSON.stringify({ aktionen, backup, backupName: backupDateiName() })
}

function oeffneKurzbefehl(eingabe: { text: string } | 'zwischenablage') {
  try {
    sessionStorage.setItem(SYNC_GESTARTET, String(Date.now()))
  } catch {
    // privater Modus o. Ä. – dann eben ohne Hinweis beim Zurückkommen
  }
  const name = encodeURIComponent(SYNC_KURZBEFEHL)
  window.location.href =
    eingabe === 'zwischenablage' ? `shortcuts://run-shortcut?name=${name}&input=clipboard` : `shortcuts://run-shortcut?name=${name}&input=text&text=${encodeURIComponent(eingabe.text)}`
}

/**
 * Startet den Kurzbefehl "Life Sync" mit allen ausstehenden Änderungen (und ggf. dem Backup).
 * Die Warteschlange wird geleert (der Kurzbefehl hat sie jetzt). Termine/Erinnerungen bleiben
 * als "ausstehend" markiert, bis der nächste Import sie von Apple zurückmeldet.
 *
 * Wichtig: direkt beim Antippen aufrufen (nicht nach einem "await"). Safari erlaubt das Schreiben
 * in die Zwischenablage nur unmittelbar nach einem Tipp, deshalb wird der Inhalt als Promise übergeben.
 */
export function starteAbgleich() {
  if (!autoBackupAn() || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    void abgleichText(false).then((text) => oeffneKurzbefehl({ text }))
    return
  }
  const text = abgleichText(true)
  navigator.clipboard
    .write([new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) })])
    .then(() => oeffneKurzbefehl('zwischenablage'))
    .catch(async () => {
      // Zwischenablage nicht erlaubt: ohne Backup über die Adresse (die Änderungen gehen nicht verloren)
      const { aktionen } = JSON.parse(await text) as { aktionen: AppleAktion[] }
      oeffneKurzbefehl({ text: JSON.stringify({ aktionen }) })
    })
}
