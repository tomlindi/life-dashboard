// Liste von Workouts, nach Wochen gruppiert. Antippen = bearbeiten (Gym: Training mit Sätzen öffnen).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db, type Workout } from '../../core/db'
import { tagPlus, tagVon, wochenStart, wocheVon } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import { pace, sportart } from './arten'
import { gymTrainingZu } from './workouts'
import { volumen } from './gym/daten'
import WorkoutFormular from './WorkoutFormular'

const QUELLE: Record<string, string> = { health: 'Health', manuell: '', strava: 'Strava' }

export const wochenTitel = (woche: string) =>
  woche === wochenStart() ? 'Diese Woche' : woche === tagPlus(wochenStart(), -7) ? 'Letzte Woche' : `Woche ab ${kurzDatum(woche)}`

export default function WorkoutListe({ workouts, maxWochen = 8 }: { workouts: Workout[]; maxWochen?: number }) {
  const einheiten = useLiveQuery(() => db.gymEinheiten.toArray(), []) ?? []
  const uebungen = useLiveQuery(() => db.uebungen.toArray(), []) ?? []
  const [bearbeiten, setBearbeiten] = useState<Workout | undefined>()

  const uebungName = (id: string) => uebungen.find((u) => u.id === id)?.name ?? 'Übung'
  const wochen = Object.entries(
    workouts.reduce<Record<string, Workout[]>>((acc, w) => {
      ;(acc[wocheVon(tagVon(w.start))] ??= []).push(w)
      return acc
    }, {}),
  )
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxWochen)

  if (workouts.length === 0) return <p className="text-[14px] text-grau">Noch keine Workouts.</p>

  return (
    <>
      {wochen.map(([woche, liste]) => {
        const km = liste.reduce((s, w) => s + (w.distanzKm ?? 0), 0)
        return (
          <div key={woche} className="mb-3 last:mb-0">
            <p className="mb-1 flex justify-between text-[12px] font-semibold uppercase tracking-wide text-grau">
              <span>{wochenTitel(woche)}</span>
              <span>
                {liste.length}× · {liste.reduce((s, w) => s + w.dauerMin, 0)} Min{km > 0 ? ` · ${zahl(km)} km` : ''}
              </span>
            </p>
            <ul>
              {liste
                .sort((a, b) => b.start.localeCompare(a.start))
                .map((w, i) => {
                  const sp = sportart(w.art)
                  const gym = gymTrainingZu(w, einheiten)
                  const p = sp.distanz ? pace(w.dauerMin, w.distanzKm) : null
                  const details = [
                    new Date(w.start).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }),
                    `${w.dauerMin} Min`,
                    w.distanzKm ? `${zahl(w.distanzKm, 2)} km` : '',
                    p ?? '',
                    w.tore !== undefined ? `${w.tore} ${w.tore === 1 ? 'Tor' : 'Tore'}` : '',
                    gym ? `${zahl(volumen(gym) / 1000)} t` : '',
                    QUELLE[w.quelle] ?? '',
                  ].filter(Boolean)
                  const inhalt = (
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: sp.farbe + '33' }}>
                        <sp.icon size={20} color={sp.farbe} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium">
                          {gym ? gym.name : w.art}
                          {w.typ && <span className="text-[14px] font-normal" style={{ color: sp.farbe }}> · {w.typ}</span>}
                        </p>
                        <p className="truncate text-[13px] text-grau">{details.join(' · ')}</p>
                        {gym && <p className="truncate text-[12px] text-grau">{gym.uebungen.map((u) => uebungName(u.uebungId)).join(', ')}</p>}
                        {!gym && w.notiz && <p className="truncate text-[12px] text-grau">{w.notiz}</p>}
                      </div>
                      <ChevronRight size={16} className="text-grau" />
                    </>
                  )
                  const klasse = `tippbar flex min-h-16 w-full items-center gap-3 py-1 text-left ${i > 0 ? 'border-t border-linie' : ''}`
                  return (
                    <li key={w.id}>
                      {gym ? (
                        <Link to={`/fitness/gym/training/${gym.id}`} className={klasse}>
                          {inhalt}
                        </Link>
                      ) : (
                        <button onClick={() => setBearbeiten(w)} className={klasse}>
                          {inhalt}
                        </button>
                      )}
                    </li>
                  )
                })}
            </ul>
          </div>
        )
      })}
      <WorkoutFormular offen={!!bearbeiten} onZu={() => setBearbeiten(undefined)} vorhanden={bearbeiten} />
    </>
  )
}
