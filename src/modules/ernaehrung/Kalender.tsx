// Essens-Kalender: wie der Trainingskalender in Fitness (Monat, aufklappbar zum ganzen Jahr).
// Jedes Kästchen ist in so viele senkrechte Streifen geteilt, wie du an dem Tag Mahlzeiten eingetragen hast,
// jeder Streifen in der Farbe seiner Bewertung (grün = gesund, gelb = okay, rot = ungesund).
// Benutzung: <ErnaehrungKalender mahlzeiten={alleMahlzeiten} />
import { useMemo } from 'react'
import type { Bewertung, Mahlzeit } from '../../core/db'
import { heute } from '../../core/datum'
import { zahl } from '../../core/format'
import JahresKalender from '../../core/ui/JahresKalender'

const FARBE = '#a3e635'

/** Farbe je Bewertung (auch für die Ernährungs-Seite). */
export const BEWERTUNG_FARBE: Record<Bewertung, string> = {
  gesund: '#30d158',
  okay: '#ffd60a',
  ungesund: '#ff453a',
}
/** Reihenfolge der Streifen: gesund links, ungesund rechts. So liest sich ein Tag wie ein kleiner Balken. */
const REIHENFOLGE: Bewertung[] = ['gesund', 'okay', 'ungesund']
const NAME: Record<Bewertung, string> = { gesund: 'Gesund', okay: 'Okay', ungesund: 'Ungesund' }
/** Farbe der feinen Fuge zwischen zwei Streifen (= Kartenhintergrund). */
const FUGE = '#1c1c1e'

const rund = (n: number) => Math.round(n * 1000) / 1000

/**
 * N Mahlzeiten = N gleich breite senkrechte Streifen mit harten Kanten.
 * Zwischen den Streifen liegt eine 1px-Fuge, damit man auch zwei gleiche Bewertungen nebeneinander erkennt.
 * Bei sehr vielen Mahlzeiten wird die Fuge dünner, damit man trotzdem jede Mahlzeit sieht.
 */
function streifen(farben: string[]): string | undefined {
  const n = farben.length
  if (n <= 1) return farben[0]
  const halb = n > 5 ? 0.25 : 0.5 // halbe Fugenbreite in px (bei vielen Mahlzeiten dünner, aber nie 0)
  const teile: string[] = []
  farben.forEach((f, i) => {
    const von = rund((i * 100) / n)
    const bis = rund(((i + 1) * 100) / n)
    teile.push(`${f} calc(${von}% + ${i > 0 ? halb : 0}px) calc(${bis}% - ${i < n - 1 ? halb : 0}px)`)
    if (i < n - 1 && halb) teile.push(`${FUGE} calc(${bis}% - ${halb}px) calc(${bis}% + ${halb}px)`)
  })
  return `linear-gradient(90deg, ${teile.join(', ')})`
}

/** Mahlzeiten nach Bewertung sortiert (gesund zuerst), wie die Streifen im Kästchen. */
const sortiert = (ms: Mahlzeit[]) => [...ms].sort((a, b) => REIHENFOLGE.indexOf(a.bewertung) - REIHENFOLGE.indexOf(b.bewertung))

/** "72 % gesund" (oder null, wenn es keine Mahlzeiten gibt). */
function anteilGesund(ms: Mahlzeit[]): number | null {
  return ms.length ? Math.round((ms.filter((m) => m.bewertung === 'gesund').length / ms.length) * 100) : null
}

export default function ErnaehrungKalender({ mahlzeiten }: { mahlzeiten: Mahlzeit[] }) {
  // Mahlzeiten nach Tag gruppiert, jeder Tag schon nach Bewertung sortiert
  const proTag = useMemo(() => {
    const m = new Map<string, Mahlzeit[]>()
    for (const essen of mahlzeiten) m.set(essen.datum, [...(m.get(essen.datum) ?? []), essen])
    for (const [t, ms] of m) m.set(t, sortiert(ms))
    return m
  }, [mahlzeiten])

  /** Alle Mahlzeiten eines Jahres oder Monats (prefix "2026" bzw. "2026-10"). */
  const mahlzeitenIn = (prefix: string) => mahlzeiten.filter((m) => m.datum.startsWith(prefix))

  // Eingeklappt: Zahlen für diesen Monat und dieses Jahr
  const h = heute()
  const imMonat = mahlzeitenIn(h.slice(0, 7))
  const gesundMonat = anteilGesund(imMonat)

  /** Ausgeklappt: Mahlzeiten und Tage mit Einträgen im Jahr, Anteil gesund. */
  function jahresZeile(jahr: number) {
    const imJahr = mahlzeitenIn(String(jahr))
    const tage = new Set(imJahr.map((m) => m.datum)).size
    const gesund = anteilGesund(imJahr)
    return (
      <>
        <b>{imJahr.length}</b> <span className="text-grau">{imJahr.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'} an</span> <b>{tage}</b>{' '}
        <span className="text-grau">{tage === 1 ? 'Tag' : 'Tagen'}</span>
        {gesund !== null && (
          <>
            {' · '}
            <b>{gesund} %</b> <span className="text-grau">gesund</span>
          </>
        )}
      </>
    )
  }

  /** Legende: immer alle drei Bewertungen, mit Anzahl im Jahr. */
  function legende(jahr: number) {
    const imJahr = mahlzeitenIn(String(jahr))
    return REIHENFOLGE.map((b) => ({ name: NAME[b], farbe: BEWERTUNG_FARBE[b], anzahl: imJahr.filter((m) => m.bewertung === b).length }))
  }

  /** Vorlesetext: "3 Mahlzeiten: 2 gesund, 1 ungesund" */
  function ariaAm(t: string) {
    const ms = proTag.get(t) ?? []
    if (ms.length === 0) return 'nichts eingetragen'
    const teile = REIHENFOLGE.map((b) => [b, ms.filter((m) => m.bewertung === b).length] as const).filter(([, n]) => n > 0)
    return `${ms.length} ${ms.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'}: ${teile.map(([b, n]) => `${n} ${b}`).join(', ')}`
  }

  return (
    <JahresKalender
      titel="Essenskalender"
      akzent={FARBE}
      hintergrundAm={(t) => streifen((proTag.get(t) ?? []).map((m) => BEWERTUNG_FARBE[m.bewertung]))}
      ariaAm={ariaAm}
      monat={{
        zahl: imMonat.length,
        einheit: imMonat.length === 1 ? 'Mahlzeit' : 'Mahlzeiten',
        zeile: gesundMonat === null ? 'noch nichts eingetragen' : `${gesundMonat} % gesund`,
        imJahr: mahlzeitenIn(h.slice(0, 4)).length,
      }}
      jahresZeile={jahresZeile}
      zeilenAm={(t) =>
        // Kalorien nur, wenn die Mahlzeit welche hat (z. B. aus einem Foto ausgerechnet)
        (proTag.get(t) ?? []).map((m) => ({
          id: m.id,
          farbe: BEWERTUNG_FARBE[m.bewertung],
          text: m.name,
          rechts: NAME[m.bewertung] + (m.kcal != null ? ` · ${zahl(m.kcal, 0)} kcal` : ''),
        }))
      }
      leerText="Nichts eingetragen"
      legende={legende}
    />
  )
}
