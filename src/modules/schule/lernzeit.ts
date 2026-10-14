// Lernzeit pro Fach (aus dem Fokus-Timer) und die nächsten Klausuren (eigene + aus dem Kalender).
// Gemeinsam genutzt von Heute ("Nächste Klausur"), der Fachseite und der Fokus-Seite.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setzeEinstellung, type Fach, type FokusEinheit, type Klausur, type Termin } from '../../core/db'
import { heute, tagPlus, tagVon } from '../../core/datum'
import { istKlausurTermin, passtZuFach } from './klausuren'

/** So viele Tage vor einer Klausur zählt die Lernzeit "für diese Klausur". */
export const LERN_TAGE = 14

export interface KommendeKlausur {
  id: string
  titel: string
  datum: string
  fach?: Fach
}

/** Kommende Klausuren, nach Datum. Kalendertermine bekommen ihr Fach über den Titel ("Mathe-Klausur" -> Mathematik). */
export function kommendeKlausuren(faecher: Fach[], klausuren: Klausur[], termine: Termin[]): KommendeKlausur[] {
  const h = heute()
  return [
    ...klausuren.filter((k) => k.datum >= h).map((k) => ({ id: k.id, titel: k.titel, datum: k.datum, fach: faecher.find((f) => f.id === k.fachId) })),
    ...termine
      .filter((t) => tagVon(t.start) >= h && istKlausurTermin(t.titel))
      .map((t) => ({ id: t.id, titel: t.titel, datum: tagVon(t.start), fach: faecher.find((f) => passtZuFach(f, t.titel)) })),
  ].sort((a, b) => a.datum.localeCompare(b.datum))
}

/** Gelernte Minuten für ein Fach ab einem Tag (einschließlich). */
export const lernMinuten = (einheiten: FokusEinheit[], fachId: string, abTag: string) =>
  einheiten.filter((e) => e.fachId === fachId && e.datum >= abTag).reduce((s, e) => s + e.minuten, 0)

/** Ab wann zählt die Lernzeit für eine Klausur? LERN_TAGE vor dem Termin, aber nie in der Zukunft. */
export const lernStart = (klausurTag: string) => {
  const ab = tagPlus(klausurTag, -LERN_TAGE)
  return ab > heute() ? heute() : ab
}

/** Hook: die nächste Klausur und die Lernzeit dafür (letzte LERN_TAGE Tage). `undefined` = lädt noch. */
export function useNaechsteKlausur(): { klausur: KommendeKlausur; minuten: number } | null | undefined {
  return useLiveQuery(async () => {
    const [faecher, klausuren, termine] = await Promise.all([
      db.faecher.toArray(),
      db.klausuren.where('datum').aboveOrEqual(heute()).toArray(),
      db.termine.where('start').aboveOrEqual(new Date(heute() + 'T00:00:00').toISOString()).toArray(),
    ])
    const klausur = kommendeKlausuren(faecher, klausuren, termine)[0]
    if (!klausur) return null
    const minuten = klausur.fach ? lernMinuten(await db.fokus.where('datum').aboveOrEqual(tagPlus(heute(), -LERN_TAGE)).toArray(), klausur.fach.id, tagPlus(heute(), -LERN_TAGE)) : 0
    return { klausur, minuten }
  }, [])
}

/** "Lernen" antippen: Fach im Fokus-Timer wählen. Danach zur Fokus-Seite wechseln. */
export const waehleLernfach = (fachId: string) => setzeEinstellung('fokusFach', fachId)
