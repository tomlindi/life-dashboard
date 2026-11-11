// Rechnen rund um die Reha: Tage seit der OP, Streak, Vorlage für Meilensteine.
import { db } from '../../core/db'
import { heute, neueId, tagPlus } from '../../core/datum'

export const FARBE = '#66d4cf'
export const STANDARD_OP_DATUM = '2026-10-08'

/** Tage zwischen zwei Tagen ("JJJJ-MM-TT"). */
export const tageZwischen = (von: string, bis: string) =>
  Math.round((Date.parse(bis + 'T12:00:00') - Date.parse(von + 'T12:00:00')) / 86400000)

/** "Tag 34 · Woche 5" nach der OP (Tag der OP = Tag 0, Woche 1 beginnt am OP-Tag). */
export function seitOp(opDatum: string, tag = heute()) {
  const tage = tageZwischen(opDatum, tag)
  return { tage, woche: Math.floor(Math.max(0, tage) / 7) + 1 }
}

/** Tage in Folge, an denen alle aktiven Übungen erledigt waren. Heute zählt erst, wenn komplett. */
export function rehaStreak(tage: Map<string, string[]>, aktiveIds: string[]): number {
  if (aktiveIds.length === 0) return 0
  const komplett = (t: string) => aktiveIds.every((id) => tage.get(t)?.includes(id))
  let tag = komplett(heute()) ? heute() : tagPlus(heute(), -1)
  let n = 0
  while (komplett(tag)) {
    n++
    tag = tagPlus(tag, -1)
  }
  return n
}

export const SCHWELLUNG = ['keine', 'leicht', 'mittel', 'stark'] as const

/**
 * Typische Schritte nach einer Kreuzband-OP als Vorlage. Die Reihenfolge und den Zeitpunkt
 * bestimmen Arzt und Physio, deshalb stehen hier keine Wochen dabei.
 */
export const MEILENSTEIN_VORLAGE = [
  'Ohne Krücken gehen',
  'Volle Streckung',
  'Beugung 90°',
  'Beugung 120°',
  'Radfahren freigegeben',
  'Joggen freigegeben',
  'Sprünge und Richtungswechsel freigegeben',
  'Wieder ins Handball-Training',
  'Erstes Spiel',
]

export async function ladeMeilensteinVorlage() {
  const vorhanden = await db.rehaMeilensteine.toArray()
  const start = vorhanden.length
  const neu = MEILENSTEIN_VORLAGE.filter((t) => !vorhanden.some((m) => m.titel === t)).map((titel, i) => ({ id: neueId(), titel, sortierung: start + i }))
  await db.rehaMeilensteine.bulkAdd(neu)
}

/** Einen Tag holen oder leer anlegen und dann ändern. */
export async function aendereTag(datum: string, aenderung: (t: { erledigt: string[] }) => Record<string, unknown>) {
  const tag = (await db.rehaTage.get(datum)) ?? { datum, erledigt: [] }
  await db.rehaTage.put({ ...tag, ...aenderung(tag) })
}
