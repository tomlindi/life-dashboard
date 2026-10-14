// Abschnitte in To-do-Listen (wie in Apple Erinnerungen): Überschriften, unter denen Aufgaben gruppiert sind.
// Eine Tabelle für beide Listenarten. "ort" sagt, wozu ein Abschnitt gehört:
//   "projekt:<Projekt-ID>"  -> Aufgaben eines Projekts (Ziele & Projekte)
//   "liste:<Listenname>"    -> eine Liste in Erinnerungen (Abschnitte gibt es nur in Life, nicht in Apple)
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Abschnitt } from './db'
import { neueId } from './datum'

export const projektOrt = (projektId: string) => `projekt:${projektId}`
export const listenOrt = (liste: string) => `liste:${liste}`

/** Hook: Abschnitte eines Orts in ihrer Reihenfolge. */
export function useAbschnitte(ort: string): Abschnitt[] {
  return useLiveQuery(async () => (await db.abschnitte.where('ort').equals(ort).toArray()).sort((a, b) => a.sortierung - b.sortierung), [ort]) ?? []
}

export async function neuerAbschnitt(ort: string, titel: string) {
  const vorhandene = await db.abschnitte.where('ort').equals(ort).toArray()
  const sortierung = Math.max(0, ...vorhandene.map((a) => a.sortierung)) + 1
  await db.abschnitte.add({ id: neueId(), ort, titel, sortierung })
}

export const benenneAbschnittUm = (id: string, titel: string) => db.abschnitte.update(id, { titel })

/** Abschnitt löschen. Seine Aufgaben bleiben erhalten und stehen danach ohne Abschnitt oben in der Liste. */
export async function loescheAbschnitt(a: Abschnitt) {
  await db.transaction('rw', db.abschnitte, db.projektAufgaben, db.aufgaben, async () => {
    if (a.ort.startsWith('projekt:')) await db.projektAufgaben.where('projektId').equals(a.ort.slice(8)).filter((x) => x.abschnittId === a.id).modify({ abschnittId: undefined })
    else await db.aufgaben.filter((x) => x.abschnittId === a.id).modify({ abschnittId: undefined })
    await db.abschnitte.delete(a.id)
  })
}

/** Abschnitt eine Stelle nach oben (-1) oder unten (+1) schieben. */
export async function verschiebeAbschnitt(alle: Abschnitt[], a: Abschnitt, richtung: -1 | 1) {
  const i = alle.findIndex((x) => x.id === a.id)
  const nachbar = alle[i + richtung]
  if (!nachbar) return
  await db.transaction('rw', db.abschnitte, async () => {
    await db.abschnitte.update(a.id, { sortierung: nachbar.sortierung })
    await db.abschnitte.update(nachbar.id, { sortierung: a.sortierung })
  })
}

/**
 * Teilt Einträge nach Abschnitt auf: zuerst die ohne Abschnitt (abschnitt = undefined), dann jeder Abschnitt.
 * Einträge mit einem Abschnitt, den es nicht mehr gibt, zählen als "ohne Abschnitt".
 */
export function gruppiere<T extends { abschnittId?: string }>(eintraege: T[], abschnitte: Abschnitt[]): { abschnitt?: Abschnitt; eintraege: T[] }[] {
  const ids = new Set(abschnitte.map((a) => a.id))
  return [
    { abschnitt: undefined, eintraege: eintraege.filter((e) => !e.abschnittId || !ids.has(e.abschnittId)) },
    ...abschnitte.map((a) => ({ abschnitt: a, eintraege: eintraege.filter((e) => e.abschnittId === a.id) })),
  ]
}
