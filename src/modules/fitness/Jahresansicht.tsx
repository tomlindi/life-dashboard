// Trainings-Kalender: jeder Trainingstag in der Farbe seiner Sportart.
// Eingeklappt (Normalzustand): nur der aktuelle Monat, so groß wie die Wochenziel-Karte.
// Antippen klappt das ganze Jahr auf, wie im Apple-Kalender: 12 kleine Monate, Jahr wechseln, Tag antippen für Details.
// Zwei Sportarten an einem Tag = Kästchen schräg geteilt.
// Das Aufklappen, Blättern und Antippen steckt im gemeinsamen Baustein JahresKalender.
import { useMemo } from 'react'
import type { Workout } from '../../core/db'
import { heute, tagVon } from '../../core/datum'
import { zahl } from '../../core/format'
import JahresKalender from '../../core/ui/JahresKalender'
import { sportart } from './arten'

const FARBE = '#ff375f'

/** Hintergrund eines Tages: eine Farbe, oder bei zwei+ Sportarten schräg geteilt (die zwei längsten). */
function hintergrund(arten: [string, number][]): string | undefined {
  if (arten.length === 0) return undefined
  const [a, b] = arten.map(([art]) => sportart(art).farbe)
  return b ? `linear-gradient(135deg, ${a} 50%, ${b} 50%)` : a
}

export default function Jahresansicht({ workouts }: { workouts: Workout[] }) {
  // Workouts nach Tag gruppiert (Reihenfolge wie in der Liste)
  const proTag = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of workouts) {
      const t = tagVon(w.start)
      m.set(t, [...(m.get(t) ?? []), w])
    }
    return m
  }, [workouts])

  /** Sportarten eines Tages, nach Minuten sortiert (längste zuerst). */
  const artenAm = (t: string): [string, number][] => {
    const minuten = new Map<string, number>()
    for (const w of proTag.get(t) ?? []) minuten.set(w.art, (minuten.get(w.art) ?? 0) + (w.dauerMin || 1))
    return [...minuten].sort((a, b) => b[1] - a[1])
  }
  /** Alle Trainingstage eines Jahres (oder Monats, z. B. "2026-10") mit ihren Workouts. */
  const tageIn = (prefix: string) => [...proTag].filter(([t]) => t.startsWith(prefix))
  const anzahl = (tage: [string, Workout[]][]) => tage.reduce((s, [, ws]) => s + ws.length, 0)

  // Eingeklappt: Zahlen für diesen Monat und dieses Jahr
  const h = heute()
  const diesesJahr = Number(h.slice(0, 4))
  const imMonat = tageIn(h.slice(0, 7))
  const workoutsMonat = anzahl(imMonat)

  /** Ausgeklappt: Workouts und Trainingstage im Jahr, Ø pro Woche (bis heute bzw. ganzes Jahr). */
  function jahresZeile(jahr: number) {
    const tage = tageIn(String(jahr))
    const workoutsJahr = anzahl(tage)
    const bisTag = jahr === diesesJahr ? h : `${jahr}-12-31`
    const tageImJahr = Math.round((Date.parse(bisTag + 'T12:00:00') - Date.parse(`${jahr}-01-01T12:00:00`)) / 86400000) + 1
    const proWoche = jahr > diesesJahr ? 0 : workoutsJahr / Math.max(1, tageImJahr / 7)
    return (
      <>
        <b>{workoutsJahr}</b> <span className="text-grau">Workouts an</span> <b>{tage.length}</b> <span className="text-grau">Tagen</span>
        {proWoche > 0 && (
          <>
            {' · Ø '}
            <b>{zahl(proWoche)}</b>
            <span className="text-grau">/Woche</span>
          </>
        )}
      </>
    )
  }

  /** Legende: Farbe = Sportart, Zahl = Workouts im Jahr (häufigste zuerst). */
  function legende(jahr: number) {
    const jeArt = new Map<string, number>()
    for (const [, ws] of tageIn(String(jahr))) for (const w of ws) jeArt.set(w.art, (jeArt.get(w.art) ?? 0) + 1)
    return [...jeArt].sort((a, b) => b[1] - a[1]).map(([art, n]) => ({ name: art, farbe: sportart(art).farbe, anzahl: n }))
  }

  return (
    <JahresKalender
      titel="Trainingskalender"
      akzent={FARBE}
      hintergrundAm={(t) => hintergrund(artenAm(t))}
      ariaAm={(t) => artenAm(t).map(([a]) => a).join(', ') || 'kein Training'}
      monat={{
        zahl: workoutsMonat,
        einheit: workoutsMonat === 1 ? 'Workout' : 'Workouts',
        zeile: (
          <>
            an {imMonat.length} {imMonat.length === 1 ? 'Tag' : 'Tagen'}
          </>
        ),
        imJahr: anzahl(tageIn(String(diesesJahr))),
      }}
      jahresZeile={jahresZeile}
      zeilenAm={(t) =>
        (proTag.get(t) ?? []).map((w) => ({
          id: w.id,
          farbe: sportart(w.art).farbe,
          text: `${w.art}${w.typ ? ` · ${w.typ}` : ''}`,
          rechts: `${w.dauerMin} Min${w.distanzKm ? ` · ${zahl(w.distanzKm)} km` : ''}`,
        }))
      }
      leerText="Kein Training"
      legende={legende}
    />
  )
}
