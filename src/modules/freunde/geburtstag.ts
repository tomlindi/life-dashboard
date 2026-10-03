// Rechnet aus, wann jemand das nächste Mal Geburtstag hat.
// Wird im Bereich Freunde und auf der Startseite (Hinweis vorher) benutzt.
import { heute } from '../../core/datum'
import type { Freund } from '../../core/db'

export interface NaechsterGeburtstag {
  freund: Freund
  datum: string // nächster Geburtstag "JJJJ-MM-TT"
  inTagen: number // 0 = heute
  alter: number // so alt wird die Person
}

export function naechsterGeburtstag(freund: Freund): NaechsterGeburtstag | null {
  if (!freund.geburtstag) return null
  const [jahr, monat, tag] = freund.geburtstag.split('-').map(Number)
  const h = heute()
  const diesesJahr = Number(h.slice(0, 4))
  const mmtt = `${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`
  // Dieses Jahr schon vorbei? Dann nächstes Jahr.
  const naechstesJahr = `${diesesJahr}-${mmtt}` >= h ? diesesJahr : diesesJahr + 1
  const datum = `${naechstesJahr}-${mmtt}`
  const inTagen = Math.round((new Date(datum + 'T12:00:00').getTime() - new Date(h + 'T12:00:00').getTime()) / 86400000)
  return { freund, datum, inTagen, alter: naechstesJahr - jahr }
}

/** Alle Geburtstage in den nächsten n Tagen, nächster zuerst. */
export function baldigeGeburtstage(freunde: Freund[], tage: number): NaechsterGeburtstag[] {
  return freunde
    .map(naechsterGeburtstag)
    .filter((g): g is NaechsterGeburtstag => g !== null && g.inTagen <= tage)
    .sort((a, b) => a.inTagen - b.inTagen)
}
