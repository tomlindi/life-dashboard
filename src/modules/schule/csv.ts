// Noten aus einer CSV-Datei importieren (z. B. ein Export aus Notan oder eine Excel-Tabelle).
//
// Erwartet wird eine Kopfzeile. Die Spaltennamen werden großzügig erkannt:
//   Fach      (oder: Kurs, Subject)
//   Punkte    (oder: Note, Points, Grade, Wert)   -> Noten 1–6 werden automatisch in Punkte umgerechnet
//   Art       (oder: Typ, Kategorie, Type)          -> optional
//   Gewicht   (oder: Gewichtung, Faktor, Weight)   -> optional
//   Datum     (oder: Date)                          -> optional, TT.MM.JJJJ oder JJJJ-MM-TT
// Trennzeichen ; , oder Tab werden automatisch erkannt.
//
// Beispiel:
//   Fach;Punkte;Art;Gewicht;Datum
//   Mathe;12;Klausur;2;15.09.2026
//   Englisch;10;Mündlich;1;20.09.2026
import { db, type NotenArt } from '../../core/db'
import { heute } from '../../core/datum'
import { FACH_FARBEN } from './farben'

export interface CsvErgebnis {
  neu: number
  doppelt: number
  uebersprungen: number
  neueFaecher: string[]
}

/** Zerlegt eine CSV-Zeile, beachtet Anführungszeichen ("Mathe; Leistungskurs"). */
function zerlege(zeile: string, trenner: string): string[] {
  const felder: string[] = []
  let aktuell = ''
  let inAnfuehrung = false
  for (const zeichen of zeile) {
    if (zeichen === '"') inAnfuehrung = !inAnfuehrung
    else if (zeichen === trenner && !inAnfuehrung) {
      felder.push(aktuell.trim())
      aktuell = ''
    } else aktuell += zeichen
  }
  felder.push(aktuell.trim())
  return felder
}

/** Vereinfacht Spaltennamen: klein, ohne Umlaute und Sonderzeichen. */
const normal = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]/g, '')

const SPALTEN: Record<string, string[]> = {
  fach: ['fach', 'kurs', 'subject', 'fachname'],
  punkte: ['punkte', 'note', 'points', 'grade', 'wert', 'notenpunkte'],
  art: ['art', 'typ', 'type', 'kategorie', 'notenart'],
  gewicht: ['gewicht', 'gewichtung', 'faktor', 'weight'],
  datum: ['datum', 'date', 'tag'],
  halbjahr: ['halbjahr', 'hj', 'semester'],
}

/** "15.09.2026", "15.09.26" oder "2026-09-15" -> "2026-09-15" */
function leseDatum(s: string | undefined): string {
  if (!s) return heute()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (de) {
    const jahr = de[3].length === 2 ? `20${de[3]}` : de[3]
    return `${jahr}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`
  }
  return heute()
}

function leseArt(s: string | undefined): NotenArt {
  const t = normal(s ?? '')
  if (/klausur|schulaufgabe|arbeit|exam|^sc$|schriftl/.test(t)) return 'Klausur'
  if (/pruefung/.test(t)) return 'Prüfung'
  if (/muend|oral|mitarbeit|^mue?$/.test(t)) return 'Mündlich'
  if (/prakt|^pr$|gfs|praesent/.test(t)) return 'Praktisch'
  if (/test|ex|quiz/.test(t)) return 'Test'
  return 'Sonstiges'
}

const zahlAus = (s: string | undefined) => (s ? parseFloat(s.replace(',', '.')) : NaN)

export async function importiereNotenCsv(text: string): Promise<CsvErgebnis> {
  const zeilen = text.replace(/^﻿/, '').split(/\r?\n/).filter((z) => z.trim())
  if (zeilen.length < 2) throw new Error('Die Datei enthält keine Daten (mindestens Kopfzeile + 1 Zeile nötig).')

  // Trennzeichen erraten: das Zeichen, das in der Kopfzeile am häufigsten vorkommt
  const kopf = zeilen[0]
  const trenner = [';', '\t', ','].sort((a, b) => kopf.split(b).length - kopf.split(a).length)[0]
  const spaltenNamen = zerlege(kopf, trenner).map(normal)

  // Welche Spalte ist welches Feld?
  const index: Record<string, number> = {}
  for (const [feld, namen] of Object.entries(SPALTEN)) {
    index[feld] = spaltenNamen.findIndex((n) => namen.includes(n))
  }
  if (index.fach < 0 || index.punkte < 0) {
    throw new Error('Spalten „Fach“ und „Punkte“ (oder „Note“) nicht gefunden. Erste Zeile: ' + kopf)
  }

  const daten = zeilen.slice(1).map((z) => zerlege(z, trenner))

  // Steht in der Spalte "Note" und alle Werte liegen zwischen 1 und 6? Dann sind es Schulnoten, keine Punkte.
  const werte = daten.map((d) => zahlAus(d[index.punkte])).filter((n) => !Number.isNaN(n))
  const sindSchulnoten = spaltenNamen[index.punkte] !== 'punkte' && werte.length > 0 && werte.every((n) => n >= 1 && n <= 6)

  // Vorhandene Fächer nach Namen (Groß-/Kleinschreibung egal)
  const faecher = await db.faecher.toArray()
  const fachIdVon = new Map(faecher.map((f) => [f.name.toLowerCase(), f.id]))
  const ergebnis: CsvErgebnis = { neu: 0, doppelt: 0, uebersprungen: 0, neueFaecher: [] }

  for (const d of daten) {
    const fachName = d[index.fach]
    let punkte = zahlAus(d[index.punkte])
    if (!fachName || Number.isNaN(punkte)) {
      ergebnis.uebersprungen++
      continue
    }
    if (sindSchulnoten) punkte = Math.round(17 - 3 * punkte) // Note 2,0 -> 11 Punkte
    punkte = Math.min(15, Math.max(0, Math.round(punkte * 2) / 2)) // halbe Punkte (8,5) erlaubt
    const hj = zahlAus(index.halbjahr >= 0 ? d[index.halbjahr] : undefined)
    const halbjahr = hj >= 1 && hj <= 4 ? Math.round(hj) : undefined

    // Fach anlegen, falls es noch nicht existiert
    let fachId = fachIdVon.get(fachName.toLowerCase())
    if (!fachId) {
      fachId = crypto.randomUUID()
      await db.faecher.add({ id: fachId, name: fachName, farbe: FACH_FARBEN[fachIdVon.size % FACH_FARBEN.length] })
      fachIdVon.set(fachName.toLowerCase(), fachId)
      ergebnis.neueFaecher.push(fachName)
    }

    const art = index.art >= 0 ? leseArt(d[index.art]) : 'Sonstiges'
    const datum = leseDatum(index.datum >= 0 ? d[index.datum] : undefined)
    const gewicht = zahlAus(index.gewicht >= 0 ? d[index.gewicht] : undefined)

    // Stabile ID aus den Inhalten: dieselbe Zeile erneut importiert -> gleiche ID -> kein Duplikat
    const id = `csv:${fachName.toLowerCase()}|${datum}|${punkte}|${art}|${halbjahr ?? ''}`
    if (await db.noten.get(id)) {
      ergebnis.doppelt++
      continue
    }
    await db.noten.add({
      id,
      fachId,
      punkte,
      art,
      gewicht: Number.isNaN(gewicht) || gewicht <= 0 ? (art === 'Klausur' ? 2 : 1) : gewicht,
      datum,
      halbjahr,
    })
    ergebnis.neu++
  }
  return ergebnis
}
