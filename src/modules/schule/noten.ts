// Rechenlogik für Noten. Getrennt von der Anzeige, damit man sie leicht versteht und prüfen kann.
// Die Rechnung entspricht der von Notan (mit deinen Noten nachgeprüft).
import type { Fach, Note, NotenArt } from '../../core/db'

/** Alle Notenarten. SC = Klausur, MÜ = Mündlich, PR = Praktisch (wie in Notan). */
export const NOTEN_ARTEN: NotenArt[] = ['Klausur', 'Mündlich', 'Praktisch', 'Prüfung', 'Test', 'Sonstiges']

/**
 * Gewichteter Durchschnitt in Punkten.
 * Beispiel: 12 P. (Gewicht 2) + 9 P. (Gewicht 1) = (12·2 + 9·1) / (2 + 1) = 11 Punkte
 */
export function schnittPunkte(noten: Note[]): number | null {
  const summeGewichte = noten.reduce((s, n) => s + n.gewicht, 0)
  if (summeGewichte === 0) return null
  return noten.reduce((s, n) => s + n.punkte * n.gewicht, 0) / summeGewichte
}

/**
 * Schnitt eines Fachs.
 * Mit Anteilen (wie Notan): erst der Schnitt je Notenart, dann nach Anteilen gemischt.
 * Gibt es in einer Art noch keine Note, werden die übrigen Anteile hochgerechnet.
 *   Beispiel Physik (50 % SC, 25 % MÜ, 25 % PR), nur SC 8 und MÜ 13 vorhanden:
 *   (8·50 + 13·25) / (50 + 25) = 9,67
 * Ohne Anteile: jede Note zählt nach ihrer Gewichtung.
 */
export function fachSchnitt(noten: Note[], fach: Fach): number | null {
  if (!fach.anteile) return schnittPunkte(noten)
  let summe = 0
  let anteilSumme = 0
  for (const art of NOTEN_ARTEN) {
    const anteil = fach.anteile[art] ?? 0
    const s = schnittPunkte(noten.filter((n) => n.art === art))
    if (anteil > 0 && s !== null) {
      summe += anteil * s
      anteilSumme += anteil
    }
  }
  return anteilSumme ? summe / anteilSumme : null
}

/** Halbjahresnote: kaufmännisch gerundet (11,5 -> 12, 11,49 -> 11). */
export const rundePunkte = (p: number) => Math.floor(p + 0.5 + 1e-9)

/** Gehört eine Note zum Halbjahr? Noten ohne Halbjahr zählen zum aktuellen Halbjahr. */
export const imHalbjahr = (n: Note, hj: number, aktuelles: number) => (n.halbjahr ?? aktuelles) === hj

export interface FachErgebnis {
  fach: Fach
  noten: Note[]
  schnitt: number | null // genau, z. B. 11,92
  gerundet: number | null // Halbjahresnote: Zeugnisnote, falls eingetragen, sonst gerundeter Schnitt
  istZeugnis: boolean // true = offizielle Zeugnisnote eingetragen
}

/**
 * Alles für ein Halbjahr auf einmal: Schnitt pro Fach und Gesamtschnitt.
 * Gesamtschnitt = Mittel der gerundeten Halbjahresnoten, doppelte Fächer zählen zweimal
 * (so wie die Halbjahresnoten auch ins Abi eingehen).
 */
export function berechneHalbjahr(faecher: Fach[], alleNoten: Note[], hj: number, aktuelles: number) {
  const ergebnisse: FachErgebnis[] = faecher.map((fach) => {
    const noten = alleNoten.filter((n) => n.fachId === fach.id && imHalbjahr(n, hj, aktuelles))
    const schnitt = fachSchnitt(noten, fach)
    const zeugnis = fach.zeugnis?.[String(hj)]
    // Die Zeugnisnote (vom Lehrer festgelegt) hat Vorrang vor dem gerundeten Schnitt
    const gerundet = zeugnis ?? (schnitt === null ? null : rundePunkte(schnitt))
    return { fach, noten, schnitt, gerundet, istZeugnis: zeugnis !== undefined }
  })
  let summe = 0
  let gewichte = 0
  for (const e of ergebnisse) {
    if (e.gerundet === null) continue
    const g = e.fach.doppelt ? 2 : 1
    summe += e.gerundet * g
    gewichte += g
  }
  return { ergebnisse, gesamt: gewichte ? summe / gewichte : null }
}

/**
 * Umrechnung Punkte -> Note (übliche Oberstufen-Tabelle).
 *   15–13 P. = 1   ·   12–10 = 2   ·   9–7 = 3   ·   6–4 = 4   ·   3–1 = 5   ·   0 = 6
 * Für Dezimalnoten gilt die bekannte Formel  Note = (17 − Punkte) / 3,
 * nach oben bei 1,0 gedeckelt. Zwischen 1 und 0 Punkten geht es weiter bis 6,0.
 *   Beispiele: 14 P. -> 1,0  ·  11 P. -> 2,0  ·  8 P. -> 3,0  ·  5 P. -> 4,0  ·  2 P. -> 5,0  ·  0 P. -> 6,0
 */
export function punkteZuNote(punkte: number): number {
  if (punkte <= 0) return 6
  if (punkte < 1) return 6 - punkte * (6 - 16 / 3) // linear von 6,0 (0 P.) bis 5,33 (1 P.)
  return Math.max(1, (17 - punkte) / 3)
}

/** Note mit Tendenz für einzelne Punktzahlen: 13 -> "1−", 12 -> "2+", 11 -> "2" */
export function notenText(punkte: number): string {
  const p = Math.round(punkte)
  if (p <= 0) return '6'
  const note = Math.ceil((16 - p) / 3) // 15,14,13 -> 1 · 12,11,10 -> 2 · ...
  const rest = p % 3 // 0 = "+" (z. B. 15, 12), 2 = glatt (14, 11), 1 = "−" (13, 10)
  return `${note}${rest === 0 ? '+' : rest === 1 ? '−' : ''}`
}

/** 11.92 -> "11,9" (eine Nachkommastelle) */
export const formatNote = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 11.917 -> "11,92" (zwei Nachkommastellen, wie Notan) */
export const formatGenau = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Farbe für eine Punktzahl: grün = gut, gelb = mittel, rot = kritisch. */
export const punkteFarbe = (p: number) => (p >= 10 ? '#30d158' : p >= 5 ? '#ffd60a' : '#ff453a')
