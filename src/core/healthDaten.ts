// Health-Werte aus der Datenbank lesen (für die Seiten).
// Rechnen (Nächte, Schlafindex, Einheiten) steckt in core/health.ts, hier geht es nur ums Abholen.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HealthWert } from './db'
import { heute, tagPlus } from './datum'
import { TAGESSUMMEN, naechte, type HealthArt, type Nacht } from './health'

/** So viele ml zählt ein Glas beim Wasser-Zähler. */
export const GLAS_ML = 250

/** Alle Health-Werte einer Art von Tag `von` bis Tag `bis` (beide inklusive, "JJJJ-MM-TT"). */
export const ladeHealth = (art: HealthArt, von: string, bis: string) => db.health.where('[art+tag]').between([art, von], [art, bis], true, true).toArray()

/**
 * Tageswerte einer Art: Tag -> Zahl.
 * Schritte, Wasser, Kalorien … werden pro Tag addiert; Gewicht, KFA, Größe: der letzte Wert des Tages.
 */
export function tageswerte(werte: HealthWert[], art: HealthArt): Map<string, number> {
  const ergebnis = new Map<string, number>()
  const sortiert = werte.filter((w) => w.art === art && w.wert !== undefined).sort((a, b) => a.start.localeCompare(b.start))
  for (const w of sortiert) {
    ergebnis.set(w.tag, TAGESSUMMEN.includes(art) ? (ergebnis.get(w.tag) ?? 0) + w.wert! : w.wert!)
  }
  return ergebnis
}

/** Hook: Tageswerte mehrerer Arten für die letzten `tage` Tage (inklusive heute). */
export function useHealthTage(arten: HealthArt[], tage: number): Partial<Record<HealthArt, Map<string, number>>> {
  const von = tagPlus(heute(), -(tage - 1))
  return (
    useLiveQuery(async () => {
      const ergebnis: Partial<Record<HealthArt, Map<string, number>>> = {}
      for (const art of arten) ergebnis[art] = tageswerte(await ladeHealth(art, von, heute()), art)
      return ergebnis
    }, [arten.join(','), von]) ?? {}
  )
}

/** Hook: alle Werte einer Art (für Verläufe wie Gewicht oder KFA), älteste zuerst, ein Wert pro Tag. */
export function useHealthVerlauf(art: HealthArt): { datum: string; wert: number }[] {
  return (
    useLiveQuery(async () => {
      const proTag = tageswerte(await db.health.where('art').equals(art).toArray(), art)
      return [...proTag].map(([datum, wert]) => ({ datum, wert })).sort((a, b) => a.datum.localeCompare(b.datum))
    }, [art]) ?? []
  )
}

/** Hook: Nächte aus den Health-Schlafphasen der letzten `tage` Tage, neueste zuerst. */
export function useHealthNaechte(tage = 60): Nacht[] {
  const von = tagPlus(heute(), -tage)
  return useLiveQuery(async () => naechte(await ladeHealth('schlaf', von, heute())), [von]) ?? []
}
