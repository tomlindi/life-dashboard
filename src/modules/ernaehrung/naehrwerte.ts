// Gemeinsame Bausteine für den Bereich Ernährung: Farben der Bewertungen, die vier Nährwerte
// (Kalorien, Protein, Kohlenhydrate, Fett) und kleine Rechen-Helfer.
import type { Bewertung, Mahlzeit } from '../../core/db'
import { zahl } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import { BEWERTUNG_FARBE } from './Kalender'

export const FARBE = '#a3e635'

/** Emoji und Farbe je Bewertung (die Farben teilt sich die Seite mit dem Essenskalender). */
export const BEWERTUNG: Record<Bewertung, { emoji: string; farbe: string }> = {
  gesund: { emoji: '🥦', farbe: BEWERTUNG_FARBE.gesund },
  okay: { emoji: '🍝', farbe: BEWERTUNG_FARBE.okay },
  ungesund: { emoji: '🍟', farbe: BEWERTUNG_FARBE.ungesund },
}

export type Naehrwert = 'kcal' | 'protein' | 'kohlenhydrate' | 'fett'
export type Naehrwerte = Record<Naehrwert, number>

/** Die vier Nährwerte mit Namen, Einheit und Ringfarbe (in dieser Reihenfolge angezeigt). */
export const NAEHRWERTE: { key: Naehrwert; name: string; kurz: string; einheit: string; farbe: string }[] = [
  { key: 'kcal', name: 'Kalorien', kurz: 'kcal', einheit: 'kcal', farbe: '#ff375f' },
  { key: 'protein', name: 'Protein', kurz: 'P', einheit: 'g', farbe: '#64d2ff' },
  { key: 'kohlenhydrate', name: 'Kohlenhydrate', kurz: 'KH', einheit: 'g', farbe: '#ffd60a' },
  { key: 'fett', name: 'Fett', kurz: 'F', einheit: 'g', farbe: '#ff9f0a' },
]

/** Standard-Tagesziele (lassen sich unter "Ziele" ändern). */
export const STANDARD_ZIELE: Naehrwerte = { kcal: 2500, protein: 120, kohlenhydrate: 300, fett: 80 }

/** Hat die Mahlzeit überhaupt Nährwerte? (Schnelle Einträge haben keine.) */
export const hatNaehrwerte = (m: Mahlzeit) => NAEHRWERTE.some(({ key }) => m[key] != null)

/** Summe der Nährwerte mehrerer Mahlzeiten. Fehlende Werte zählen als 0. */
export function summe(mahlzeiten: Mahlzeit[]): Naehrwerte {
  const s: Naehrwerte = { kcal: 0, protein: 0, kohlenhydrate: 0, fett: 0 }
  for (const m of mahlzeiten) for (const { key } of NAEHRWERTE) s[key] += m[key] ?? 0
  return s
}

/** Kurzzeile für Listen: "650 kcal · P 32 · KH 75 · F 22" */
export function kurzText(m: Mahlzeit): string {
  return `${zahl(m.kcal ?? 0, 0)} kcal · P ${zahl(m.protein ?? 0, 0)} · KH ${zahl(m.kohlenhydrate ?? 0, 0)} · F ${zahl(m.fett ?? 0, 0)}`
}

/** Text aus einem Eingabefeld als Zahl (Komma erlaubt). Leer oder ungültig = undefined. */
export function alsZahl(text: string): number | undefined {
  const t = text.trim().replace(',', '.')
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Zahl für ein Eingabefeld (mit Komma, ohne Tausenderpunkt). */
export const alsText = (n?: number) => (n == null ? '' : String(n).replace('.', ','))

/**
 * Wurde das Tagesziel "getroffen"?
 * Protein: mindestens 90 % (mehr ist kein Problem).
 * Kalorien, Kohlenhydrate, Fett: zwischen 90 % und 110 % (zu viel zählt also nicht als getroffen).
 */
export function zielGetroffen(key: Naehrwert, wert: number, ziel: number): boolean {
  const anteil = wert / (ziel || 1)
  return key === 'protein' ? anteil >= 0.9 : anteil >= 0.9 && anteil <= 1.1
}

/** Erklärung zu zielGetroffen() für die Oberfläche. */
export const TREFFER_REGEL = 'Getroffen = 90–110 % vom Tagesziel (Protein: ab 90 %)'

/** Tagesziele; fehlende Werte (z. B. aus einer älteren Version) kommen vom Standard. */
export function useErnaehrungsZiele(): [Naehrwerte, (neu: Naehrwerte) => void] {
  const [gespeichert, setZiele] = useEinstellung<Partial<Naehrwerte>>('ernaehrungZiele', STANDARD_ZIELE)
  return [{ ...STANDARD_ZIELE, ...gespeichert }, setZiele]
}
