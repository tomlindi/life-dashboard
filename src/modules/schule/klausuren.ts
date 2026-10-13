// Kleine Helfer rund um Klausuren (gemeinsam genutzt von der Schule-Seite und den Fachseiten).
import type { Fach } from '../../core/db'

/** Erkennt Klausuren in importierten Kalenderterminen. */
export const istKlausurTermin = (titel: string) => /klausur|test|pr(ü|ue)fung|schulaufgabe|arbeit\b|abi/i.test(titel)

/**
 * Gehört ein Kalendertermin (nach seinem Titel) zu diesem Fach?
 * "Mathe-Klausur" -> Mathematik, "Bio Test" -> Biologie (Wörter ab 3 Buchstaben, die den Fachnamen beginnen).
 */
export function passtZuFach(fach: Fach, titel: string): boolean {
  const name = fach.name.toLowerCase()
  const klein = titel.toLowerCase()
  if (klein.includes(name)) return true
  return klein
    .split(/[^a-zäöüß]+/)
    .filter((w) => w.length >= 3)
    .some((w) => name.startsWith(w))
}
