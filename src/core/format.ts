// Zahlen und Daten hübsch auf Deutsch anzeigen.
import { heute, tagPlus } from './datum'

/** 12.5 -> "12,50 €" */
export const euro = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

/** 7.456 -> "7,5" (Anzahl Nachkommastellen wählbar) */
export const zahl = (n: number, stellen = 1) => n.toLocaleString('de-DE', { maximumFractionDigits: stellen, minimumFractionDigits: 0 })

/** "2026-10-05" -> "Mo., 5.10." */
export const kurzDatum = (tag: string) =>
  new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })

/** "heute", "morgen", "in 3 Tagen", "vor 2 Tagen" */
export function relativ(tag: string): string {
  const h = heute()
  if (tag === h) return 'heute'
  if (tag === tagPlus(h, 1)) return 'morgen'
  if (tag === tagPlus(h, -1)) return 'gestern'
  const diff = Math.round((new Date(tag + 'T12:00:00').getTime() - new Date(h + 'T12:00:00').getTime()) / 86400000)
  return diff > 0 ? `in ${diff} Tagen` : `vor ${-diff} Tagen`
}

/** Mittelwert einer Zahlenliste (oder null, wenn leer). */
export const mittel = (zahlen: number[]) => (zahlen.length ? zahlen.reduce((a, b) => a + b, 0) / zahlen.length : null)

/**
 * Streak: wie viele Tage in Folge etwas erledigt wurde.
 * Ist heute noch nicht erledigt, zählen wir ab gestern (der Tag ist ja noch nicht vorbei).
 */
export function streak(tage: Set<string>): number {
  let tag = tage.has(heute()) ? heute() : tagPlus(heute(), -1)
  let anzahl = 0
  while (tage.has(tag)) {
    anzahl++
    tag = tagPlus(tag, -1)
  }
  return anzahl
}
