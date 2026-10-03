// BACKUP: alle Daten als eine JSON-Datei sichern und wiederherstellen.
// Wichtig, weil die Daten nur auf deinem Gerät liegen. Wenn du Safari-Daten löschst
// oder das iPhone wechselst, ist ohne Backup alles weg.
import { db, holeEinstellung, setzeEinstellung } from './db'
import { heute } from './datum'

export const BACKUP_INTERVALL_TAGE = 7

/** Alle Tabellen in ein Objekt packen. */
async function sammleDaten() {
  const tabellen: Record<string, unknown[]> = {}
  for (const tabelle of db.tables) tabellen[tabelle.name] = await tabelle.toArray()
  return { app: 'life-dashboard', version: db.verno, exportiert: new Date().toISOString(), tabellen }
}

/**
 * Erstellt die Backup-Datei.
 * Auf dem iPhone öffnet sich das Teilen-Menü -> "In Dateien sichern" (z. B. in iCloud Drive).
 * Am Computer wird die Datei normal heruntergeladen.
 */
export async function exportiereBackup(): Promise<'geteilt' | 'heruntergeladen' | 'abgebrochen'> {
  const daten = await sammleDaten()
  const ergebnis = await teileDatei(`life-dashboard-backup-${heute()}.json`, JSON.stringify(daten, null, 1), 'application/json')
  if (ergebnis !== 'abgebrochen') await setzeEinstellung('letztesBackup', new Date().toISOString())
  return ergebnis
}

/**
 * Gibt eine Datei weiter: auf dem iPhone über das Teilen-Menü ("In Dateien sichern", AirDrop …),
 * am Computer als normaler Download.
 */
export async function teileDatei(name: string, inhalt: string, typ: string): Promise<'geteilt' | 'heruntergeladen' | 'abgebrochen'> {
  const datei = new File([inhalt], name, { type: typ })
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: name })
      return 'geteilt'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'abgebrochen'
      // Teilen fehlgeschlagen -> unten normal herunterladen
    }
  }
  const url = URL.createObjectURL(datei)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'heruntergeladen'
}

/** Liest eine Backup-Datei und ERSETZT damit alle aktuellen Daten. */
export async function stelleBackupWiederHer(text: string): Promise<number> {
  let daten: { app?: string; tabellen?: Record<string, unknown[]> }
  try {
    daten = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (daten.app !== 'life-dashboard' || !daten.tabellen) throw new Error('Das ist keine Backup-Datei vom Life Dashboard.')

  let anzahl = 0
  await db.transaction('rw', db.tables, async () => {
    for (const tabelle of db.tables) {
      await tabelle.clear()
      const zeilen = daten.tabellen![tabelle.name]
      if (Array.isArray(zeilen)) {
        await tabelle.bulkPut(zeilen)
        anzahl += zeilen.length
      }
    }
  })
  await setzeEinstellung('letztesBackup', new Date().toISOString())
  return anzahl
}

/**
 * Fügt Einträge aus einer Datei HINZU, ohne etwas zu löschen (z. B. ein Startpaket mit Fächern,
 * Freunden, Habits). Einträge mit gleicher ID werden aktualisiert, alles andere bleibt.
 */
export async function fuegeDatenHinzu(text: string): Promise<number> {
  let daten: { app?: string; tabellen?: Record<string, unknown[]> }
  try {
    daten = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (daten.app !== 'life-dashboard' || !daten.tabellen) throw new Error('Das ist keine Datei vom Life Dashboard.')

  let anzahl = 0
  await db.transaction('rw', db.tables, async () => {
    for (const tabelle of db.tables) {
      const zeilen = daten.tabellen![tabelle.name]
      if (Array.isArray(zeilen) && zeilen.length) {
        await tabelle.bulkPut(zeilen)
        anzahl += zeilen.length
      }
    }
  })
  return anzahl
}

/** Wie viele Tage ist das letzte Backup her? (null = noch nie) */
export async function tageSeitBackup(): Promise<number | null> {
  const letztes = await holeEinstellung<string | null>('letztesBackup', null)
  if (!letztes) return null
  return Math.floor((Date.now() - new Date(letztes).getTime()) / 86_400_000)
}

/** Alles löschen (für einen Neustart). */
export async function loescheAlles() {
  await db.transaction('rw', db.tables, async () => {
    for (const tabelle of db.tables) await tabelle.clear()
  })
}
