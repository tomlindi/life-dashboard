// TEXT AUS DER ZWISCHENABLAGE -> IMPORT-PAKET
//
// Die Kurzbefehle-App liefert JSON in ganz unterschiedlicher Form. Akzeptiert wird:
//   1. ein großes Objekt:          {"version":1,"termine":[…],"aufgaben":[…]}
//   2. ein Array:                  [{"titel":"Mathe","start":"…"}, {…}]
//   3. ein Objekt pro Zeile:       {"titel":"Mathe","start":"…"}
//                                  {"titel":"Gym","start":"…"}
//   4. Objekte hintereinander:     {…}{…}  oder  {…},{…}
// Leere Zeilen werden ignoriert. Jedes Objekt ist entweder ein "Paket" (mit Schlüsseln wie
// "termine", "aufgaben" …) oder ein EINZELNER Eintrag, der automatisch zugeordnet wird
// (Termin, Erinnerung, Workout, Schritte, Schlaf, Gewicht).
//
// Passt etwas nicht, gibt es einen ImportFehler mit Zeilennummer, der kaputten Zeile und
// den ersten 200 Zeichen des Textes. So sieht man sofort, was der Kurzbefehl falsch macht.
//
// Diese Datei hat absichtlich keine Verbindung zur Datenbank, damit man sie einfach testen kann.

export const KATEGORIEN = ['schritte', 'workouts', 'schlaf', 'gewicht', 'termine', 'aufgaben'] as const
type Kategorie = (typeof KATEGORIEN)[number]
type Objekt = Record<string, unknown>

/** Fehler mit allem, was man zum Reparieren des Kurzbefehls braucht. */
export class ImportFehler extends Error {
  vorschau: string // die ersten 200 Zeichen des Textes
  zeile?: number // Zeilennummer (ab 1), in der das Problem steckt
  zeilenText?: string // Inhalt dieser Zeile (gekürzt)

  constructor(meldung: string, text: string, zeile?: number) {
    super(meldung)
    this.name = 'ImportFehler'
    this.vorschau = text.slice(0, 200)
    this.zeile = zeile
    if (zeile) {
      const inhalt = text.split('\n')[zeile - 1] ?? ''
      this.zeilenText = inhalt.length > 160 ? inhalt.slice(0, 160) + ' …' : inhalt
    }
  }
}

/**
 * Bereinigt typische Probleme aus der Kurzbefehle-App:
 * - typografische Anführungszeichen („ “ ” ″), die iOS beim Tippen automatisch setzt
 * - Windows-Zeilenenden und ein unsichtbares BOM-Zeichen am Anfang
 */
export function bereinige(text: string): string {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[“”„‟″«»]/g, '"')
}

/** Zeilennummer (ab 1) für eine Position im Text. */
const zeileVon = (text: string, pos: number) => text.slice(0, pos).split('\n').length

interface Stueck {
  wert: unknown
  zeile: number
}

/**
 * Zerlegt den Text in einzelne JSON-Werte (Objekte oder Arrays).
 * Funktioniert für "alles in einem", "ein Objekt pro Zeile" und "Objekte hintereinander".
 */
export function zerlege(text: string): Stueck[] {
  const t = text.trim()
  if (!t) throw new ImportFehler('Die Zwischenablage ist leer. Hast du den Kurzbefehl ausgeführt?', text)

  // Fall 1/2: Der ganze Text ist gültiges JSON
  try {
    return [{ wert: JSON.parse(t), zeile: 1 }]
  } catch {
    // weiter mit dem Zerlegen
  }

  const stuecke: Stueck[] = []
  let i = 0
  while (i < text.length) {
    const z = text[i]
    // Zwischenräume, Kommas und leere Zeilen zwischen den Objekten überspringen
    if (/[\s,]/.test(z)) {
      i++
      continue
    }
    if (z !== '{' && z !== '[') {
      throw new ImportFehler(
        `In Zeile ${zeileVon(text, i)} steht etwas, das kein JSON-Objekt ist (erwartet wird „{“).`,
        text,
        zeileVon(text, i),
      )
    }
    // Passendes Ende suchen: Klammern zählen, Text in Anführungszeichen dabei überspringen
    const start = i
    let tiefe = 0
    let inText = false
    let ende = -1
    for (let j = i; j < text.length; j++) {
      const c = text[j]
      if (inText) {
        if (c === '\\') j++ // nächstes Zeichen ist "maskiert", z. B. \"
        else if (c === '"') inText = false
        continue
      }
      if (c === '"') inText = true
      else if (c === '{' || c === '[') tiefe++
      else if (c === '}' || c === ']') {
        tiefe--
        if (tiefe === 0) {
          ende = j
          break
        }
      }
    }
    const zeile = zeileVon(text, start)
    if (ende < 0) throw new ImportFehler(`Das Objekt ab Zeile ${zeile} wird nicht geschlossen (es fehlt eine „}“ oder ein Anführungszeichen).`, text, zeile)

    const teil = text.slice(start, ende + 1)
    try {
      stuecke.push({ wert: JSON.parse(teil), zeile })
    } catch (e) {
      // Die Browser-Meldung ist englisch; die Stelle ("column 16") reicht als Hinweis
      const stelle = (e as Error).message.match(/column (\d+)/)?.[1]
      const tipp = /'|,\s*}|:\s*\d+,\d/.test(teil) ? ' Tipp: JSON braucht gerade Anführungszeichen "…", und Zahlen mit Komma müssen in Anführungszeichen stehen.' : ''
      throw new ImportFehler(`Zeile ${zeile} ist kein gültiges JSON${stelle ? ` (Fehler etwa an Zeichen ${stelle})` : ''}.${tipp}`, text, zeile)
    }
    i = ende + 1
  }
  return stuecke
}

/** Hilfe: Ist das Feld vorhanden und nicht leer? */
const hat = (o: Objekt, ...namen: string[]) => namen.some((n) => o[n] !== undefined && o[n] !== null && o[n] !== '')

/**
 * Ordnet EINEN Eintrag einer Kategorie zu.
 * Zuerst zählt ein ausdrückliches Feld "typ"/"kategorie", sonst wird an den Feldern erkannt, was es ist.
 */
export function kategorieVon(o: Objekt): Kategorie | null {
  const typ = String(o.typ ?? o.kategorie ?? o.type ?? '').toLowerCase()
  if (typ) {
    if (/termin|event|kalender/.test(typ)) return 'termine'
    if (/aufgabe|erinnerung|reminder|todo/.test(typ)) return 'aufgaben'
    if (/workout|training/.test(typ)) return 'workouts'
    if (/schritt|step/.test(typ)) return 'schritte'
    if (/schlaf|sleep/.test(typ)) return 'schlaf'
    if (/gewicht|weight/.test(typ)) return 'gewicht'
  }
  const titel = hat(o, 'titel', 'title', 'name')
  const start = hat(o, 'start', 'startdatum', 'beginn')
  if (hat(o, 'kg')) return 'gewicht'
  if (hat(o, 'anzahl', 'schritte')) return 'schritte'
  if (hat(o, 'stunden', 'stadium')) return 'schlaf'
  if (titel && start) return 'termine' // Termin: Titel + Startzeit
  if (titel) return 'aufgaben' // Erinnerung: Titel, aber keine Startzeit
  if (hat(o, 'art', 'workout') && start) return 'workouts' // Workout: Sportart + Startzeit
  return null
}

/**
 * Hauptfunktion: macht aus dem Text EIN Import-Paket {version, termine: […], aufgaben: […], …}.
 * Wirft ImportFehler mit Zeilennummer, wenn etwas nicht passt.
 */
export function leseImportText(roh: string): Objekt {
  try {
    return lesePaket(bereinige(roh))
  } catch (e) {
    // Die Vorschau zeigt den Text genau so, wie er in der Zwischenablage stand
    if (e instanceof ImportFehler) e.vorschau = roh.slice(0, 200)
    throw e
  }
}

function lesePaket(text: string): Objekt {
  const stuecke = zerlege(text)
  const paket: Objekt = {}
  const fuegeHinzu = (k: Kategorie, eintraege: unknown) => {
    const liste = Array.isArray(eintraege) ? eintraege : [eintraege]
    paket[k] = [...((paket[k] as unknown[]) ?? []), ...liste.filter((e) => e && typeof e === 'object')]
  }

  /** Ein einzelnes Objekt verarbeiten: Paket zusammenführen oder Eintrag zuordnen. */
  function verarbeite(o: unknown, zeile: number) {
    if (Array.isArray(o)) {
      for (const e of o) verarbeite(e, zeile)
      return
    }
    if (!o || typeof o !== 'object') {
      throw new ImportFehler(`Zeile ${zeile} enthält kein Objekt, sondern „${String(o).slice(0, 40)}“.`, text, zeile)
    }
    const obj = o as Objekt
    if ('tabellen' in obj && obj.app === 'life-dashboard') {
      throw new ImportFehler('Das ist ein Backup, kein Kurzbefehl-Export. Bitte unter „Backup & Daten“ wiederherstellen.', text, zeile)
    }
    // Paket? (enthält Listen wie "termine", "aufgaben" …)
    const enthaltene = KATEGORIEN.filter((k) => k in obj)
    if (enthaltene.length) {
      for (const k of enthaltene) fuegeHinzu(k, obj[k])
      // Zusatzangaben wie "version" oder "termineTage" übernehmen
      for (const [k, v] of Object.entries(obj)) if (!(KATEGORIEN as readonly string[]).includes(k)) paket[k] ??= v
      return
    }
    // Einzelner Eintrag
    const k = kategorieVon(obj)
    if (!k) {
      throw new ImportFehler(
        `Zeile ${zeile}: Dieser Eintrag lässt sich nicht zuordnen. Ein Termin braucht „titel“ und „start“, eine Erinnerung „titel“, ein Workout „art“ und „start“.`,
        text,
        zeile,
      )
    }
    fuegeHinzu(k, obj)
  }

  for (const s of stuecke) verarbeite(s.wert, s.zeile)

  if (!KATEGORIEN.some((k) => k in paket)) {
    throw new ImportFehler(`Keine bekannten Daten gefunden (erwartet: ${KATEGORIEN.join(', ')}).`, text)
  }
  return paket
}
