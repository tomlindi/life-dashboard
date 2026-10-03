// Rechenlogik für Noten. Getrennt von der Anzeige, damit man sie leicht versteht und prüfen kann.
import type { Note } from '../../core/db'

/**
 * Gewichteter Durchschnitt in Punkten.
 * Beispiel: Klausur 12 P. (Gewicht 2) + mündlich 9 P. (Gewicht 1)
 *           = (12·2 + 9·1) / (2 + 1) = 11 Punkte
 */
export function schnittPunkte(noten: Note[]): number | null {
  const summeGewichte = noten.reduce((s, n) => s + n.gewicht, 0)
  if (summeGewichte === 0) return null
  return noten.reduce((s, n) => s + n.punkte * n.gewicht, 0) / summeGewichte
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
  if (punkte === 0) return '6'
  const note = Math.ceil((16 - punkte) / 3) // 15,14,13 -> 1 · 12,11,10 -> 2 · ...
  const rest = punkte % 3 // 0 = "+" (z. B. 15, 12), 2 = glatt (14, 11), 1 = "−" (13, 10)
  return `${note}${rest === 0 ? '+' : rest === 1 ? '−' : ''}`
}

/** "11,0 P. · 2,0" */
export const formatNote = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Farbe für eine Punktzahl: grün = gut, gelb = mittel, rot = kritisch. */
export const punkteFarbe = (p: number) => (p >= 10 ? '#30d158' : p >= 5 ? '#ffd60a' : '#ff453a')
