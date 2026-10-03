// ABI-PROGNOSE (Rechnung wie in Notan / Baden-Württemberg):
//
// Block I (max. 600): alle Halbjahresnoten der Kursstufe. "2x"-Fächer zählen doppelt.
//   Block I = Summe der Punkte / Anzahl × 40
//   Beispiel: 520 Punkte bei 50 (gewichteten) Halbjahren -> 520 / 50 × 40 = 416
//
// Block II (max. 300): 5 Prüfungsfächer, jedes Ergebnis × 4.
//   Schriftlich + mündliche Zusatzprüfung: (2 × schriftlich + mündlich) / 3
//
// Abi-Note = 17/3 − Gesamtpunkte / 180, auf eine Nachkommastelle abgeschnitten (676 P. -> 1,9)
//
// "So weitermachen wie bisher": Ein Halbjahr ohne Noten bekommt den gerundeten Schnitt der
// bisherigen Halbjahre dieses Fachs. Fehlende Prüfungsergebnisse = Schnitt aller Halbjahre des Fachs.
import type { Fach, Note } from '../../core/db'
import { berechneHalbjahr, rundePunkte } from './noten'

export interface AbiPruefung {
  nr: number // 1 bis 5
  fachId?: string
  schriftlich?: number // Prüfungsergebnis in Punkten (falls schon bekannt oder selbst geschätzt)
  muendlich?: number
}

/** Standard: P1–P4 schriftlich, P5 mündlich. */
export const STANDARD_PRUEFUNGEN: AbiPruefung[] = [1, 2, 3, 4, 5].map((nr) => ({ nr }))

export interface HalbjahrWert {
  wert: number
  art: 'fertig' | 'laufend' | 'prognose' // fertig = abgeschlossen, laufend = aktuelles HJ, prognose = hochgerechnet
}

export interface PruefungsErgebnis {
  nr: number
  fach?: Fach
  schriftlich?: number
  muendlich?: number
  ergebnis: number // in Punkten (0–15), vor dem ×4
  geschaetzt: boolean // true = Prognose aus dem Fachschnitt
}

const mittel = (z: number[]) => z.reduce((a, b) => a + b, 0) / z.length

export function abiPrognose(faecher: Fach[], noten: Note[], aktuellesHJ: number, pruefungen: AbiPruefung[]) {
  // Halbjahreswerte je Fach: abgeschlossen, laufend oder hochgerechnet
  const hj = [1, 2, 3, 4].map((h) => berechneHalbjahr(faecher, noten, h, aktuellesHJ))
  const werte = new Map<string, (HalbjahrWert | null)[]>()

  for (const fach of faecher) {
    const reihe: (HalbjahrWert | null)[] = []
    for (let h = 1; h <= 4; h++) {
      const e = hj[h - 1].ergebnisse.find((x) => x.fach.id === fach.id)!
      const bisher = reihe.filter((x): x is HalbjahrWert => x !== null).map((x) => x.wert)
      if (h < aktuellesHJ) {
        // Vergangenes Halbjahr: echte (Zeugnis-)Note, sonst nicht belegt
        reihe.push(e.gerundet === null ? null : { wert: e.gerundet, art: 'fertig' })
      } else if (h === aktuellesHJ && e.gerundet !== null) {
        reihe.push({ wert: e.gerundet, art: 'laufend' })
      } else if (reihe[h - 2] && bisher.length) {
        // Fach läuft weiter (im Halbjahr davor belegt) -> wie bisher weitermachen
        reihe.push({ wert: rundePunkte(mittel(bisher)), art: 'prognose' })
      } else {
        reihe.push(null) // Fach abgewählt oder noch nie belegt
      }
    }
    werte.set(fach.id, reihe)
  }

  // ---- Block I ----
  let summe = 0
  let anzahl = 0
  let unterkurse = 0 // Halbjahre unter 5 Punkten
  for (const fach of faecher) {
    const g = fach.doppelt ? 2 : 1
    for (const w of werte.get(fach.id)!) {
      if (!w) continue
      summe += w.wert * g
      anzahl += g
      if (w.wert < 5) unterkurse += g
    }
  }
  const block1 = anzahl ? Math.round((summe / anzahl) * 40) : 0

  // ---- Block II ----
  const fachSchnittAlle = (fachId?: string) => {
    const reihe = fachId ? werte.get(fachId)?.filter((x): x is HalbjahrWert => x !== null) : undefined
    return reihe?.length ? mittel(reihe.map((x) => x.wert)) : null
  }
  const gesamtSchnitt = anzahl ? summe / anzahl : 0
  const pruefungsErgebnisse: PruefungsErgebnis[] = pruefungen.map((p) => {
    const fach = faecher.find((f) => f.id === p.fachId)
    const prognose = fachSchnittAlle(p.fachId) ?? gesamtSchnitt
    let ergebnis: number
    if (p.nr <= 4) {
      // Schriftliche Prüfung, evtl. mit mündlicher Zusatzprüfung
      const s = p.schriftlich ?? prognose
      ergebnis = p.muendlich !== undefined ? (2 * s + p.muendlich) / 3 : s
    } else {
      ergebnis = p.muendlich ?? prognose // P5: mündlich
    }
    const geschaetzt = p.nr <= 4 ? p.schriftlich === undefined : p.muendlich === undefined
    return { nr: p.nr, fach, schriftlich: p.schriftlich, muendlich: p.muendlich, ergebnis, geschaetzt }
  })
  const block2 = Math.round(pruefungsErgebnisse.reduce((s, p) => s + p.ergebnis * 4, 0))

  const gesamt = block1 + block2
  // Abi-Note: 17/3 − P/180, abgeschnitten auf eine Stelle, zwischen 1,0 und 4,0
  const roh = 17 / 3 - gesamt / 180
  const note = Math.min(4, Math.max(1, Math.floor(roh * 10 + 1e-9) / 10))

  return { werte, block1, block2, gesamt, note, bestanden: gesamt >= 300, unterkurse, pruefungsErgebnisse }
}
