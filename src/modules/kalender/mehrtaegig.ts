// Mehrtägige Termine: An welchen Tagen liegt ein Termin, und was steht an jedem Tag als Uhrzeit?
//
// Beispiele:
//   Urlaub ganztägig 12.–14.10.     -> erscheint am 12., 13. und 14. als "ganztägig"
//   Fahrt Fr 20:00 bis So 10:00     -> Fr "ab 20:00", Sa "ganztägig", So "bis 10:00"
// Endet ein Termin genau um 00:00, zählt dieser Tag nicht mehr mit (so speichert Apple ganztägige Termine).
//
// Diese Datei hat keine Verbindung zur Datenbank, damit man sie einfach testen kann (scripts/test-import).
import type { Termin } from '../../core/db'
import { tagPlus, tagVon, uhrzeit } from '../../core/datum'

/** Höchstens so viele Tage wird ein Termin angezeigt (Schutz gegen kaputte Enddaten). */
const MAX_TAGE = 366

/** Letzter Tag eines Termins ("JJJJ-MM-TT"). Ohne Ende oder mit Ende vor dem Start: der Starttag. */
export function letzterTag(t: Pick<Termin, 'start' | 'ende'>): string {
  const erster = tagVon(t.start)
  if (!t.ende || t.ende <= t.start) return erster
  const ende = new Date(t.ende)
  // Ende genau um Mitternacht: der Termin endet eigentlich am Vortag
  const tag = ende.getHours() === 0 && ende.getMinutes() === 0 ? tagPlus(tagVon(t.ende), -1) : tagVon(t.ende)
  return tag < erster ? erster : tag
}

/** Alle Tage, an denen der Termin liegt (erster bis letzter, höchstens 366). */
export function tageDesTermins(t: Pick<Termin, 'start' | 'ende'>): string[] {
  const tage = [tagVon(t.start)]
  const bis = letzterTag(t)
  while (tage[tage.length - 1] < bis && tage.length < MAX_TAGE) tage.push(tagPlus(tage[tage.length - 1], 1))
  return tage
}

/** Liegt der Termin (auch) an diesem Tag? */
export const liegtAm = (t: Pick<Termin, 'start' | 'ende'>, tag: string) => tagVon(t.start) <= tag && tag <= letzterTag(t)

/** Ist der Termin an diesem Tag "ganztägig"? (echte Ganztagstermine und mittlere Tage mehrtägiger Termine) */
export function ganztaegigAm(t: Pick<Termin, 'start' | 'ende' | 'ganztaegig'>, tag: string): boolean {
  if (t.ganztaegig) return true
  return tag > tagVon(t.start) && tag < letzterTag(t)
}

/**
 * Uhrzeit für die Anzeige an einem Tag:
 * { von: "08:00", bis: "09:30" } normal, { von: "ab 20:00" } am ersten Tag, { von: "bis 10:00" } am letzten Tag.
 */
export function zeitAm(t: Pick<Termin, 'start' | 'ende'>, tag: string): { von: string; bis?: string } {
  const erster = tagVon(t.start)
  const letzter = letzterTag(t)
  if (erster === letzter) return { von: uhrzeit(t.start), bis: t.ende ? uhrzeit(t.ende) : undefined }
  if (tag === erster) return { von: `ab ${uhrzeit(t.start)}` }
  return { von: `bis ${uhrzeit(t.ende!)}` }
}

/** "Tag 2 von 3" für mehrtägige Termine (sonst nichts). */
export function tagNummer(t: Pick<Termin, 'start' | 'ende'>, tag: string): string | null {
  const tage = tageDesTermins(t)
  return tage.length > 1 ? `Tag ${tage.indexOf(tag) + 1} von ${tage.length}` : null
}
