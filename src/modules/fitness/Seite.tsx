// Bereich "Fitness": Wochenziel-Ring, Diagramme, geplante Workouts und die Workout-Liste.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Minus, Play, Plus, Trash2 } from 'lucide-react'
import { db, type Workout } from '../../core/db'
import { tagPlus, tagVon, heute, uhrzeit, wochenStart, wocheVon } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import { ohneDoppelte, gymTrainingZu } from './workouts'
import { starteTraining, volumen } from './gym/daten'
import { useWochenziel } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import { iconFuer, istWorkoutTermin } from './arten'
import { GewichtKarte, SchritteDiagramm, WorkoutDiagramm } from './Diagramme'
import WorkoutFormular from './WorkoutFormular'

const FARBE = '#ff375f'

const QUELLE: Record<string, string> = { health: 'Health', manuell: 'manuell', strava: 'Strava' }

export default function FitnessSeite() {
  const [formularOffen, setFormularOffen] = useState(false)
  const [ziel, setZiel] = useWochenziel()
  const rohWorkouts = useLiveQuery(() => db.workouts.orderBy('start').reverse().toArray(), [])
  const workouts = rohWorkouts && ohneDoppelte(rohWorkouts)
  const einheiten = useLiveQuery(() => db.gymEinheiten.orderBy('start').reverse().toArray(), []) ?? []
  const plaene = useLiveQuery(() => db.gymPlaene.orderBy('sortierung').toArray(), []) ?? []
  const uebungen = useLiveQuery(() => db.uebungen.toArray(), []) ?? []
  const navigate = useNavigate()
  const termine = useLiveQuery(
    // Termine von jetzt bis in 14 Tagen
    () => db.termine.where('start').between(new Date().toISOString(), new Date(`${tagPlus(heute(), 14)}T23:59:59`).toISOString()).toArray(),
    [],
  )

  const dieseWoche = (workouts ?? []).filter((w) => tagVon(w.start) >= wochenStart()).length
  const geplant = (termine ?? []).filter((t) => istWorkoutTermin(t.titel))
  const laufend = einheiten.find((e) => !e.ende)
  const uebungName = (id: string) => uebungen.find((u) => u.id === id)?.name ?? 'Übung'
  const gymZu = (w: Workout) => gymTrainingZu(w, einheiten)

  // Workouts nach Wochen gruppieren (neueste zuerst), die letzten 8 Wochen
  const wochen = Object.entries(
    (workouts ?? []).reduce<Record<string, Workout[]>>((acc, w) => {
      const woche = wocheVon(tagVon(w.start))
      ;(acc[woche] ??= []).push(w)
      return acc
    }, {}),
  )
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8)
  const wochenTitel = (woche: string) =>
    woche === wochenStart() ? 'Diese Woche' : woche === tagPlus(wochenStart(), -7) ? 'Letzte Woche' : `Woche ab ${kurzDatum(woche)}`

  return (
    <Seite titel="Fitness" farbe={FARBE}>
      {/* Wochenziel */}
      <Karte titel="Wochenziel" akzent={FARBE}>
        <div className="flex items-center gap-5">
          <Ring fortschritt={dieseWoche / ziel} farbe={FARBE} groesse={112} dicke={14}>
            <div>
              <p className="text-[26px] font-bold leading-none">
                {dieseWoche}
                <span className="text-[16px] font-medium text-grau">/{ziel}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-grau">diese Woche</p>
            </div>
          </Ring>
          <div className="flex-1">
            <p className="mb-2 text-[13px] text-grau">Dein Ziel pro Woche</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setZiel(Math.max(1, ziel - 1))} className="tippbar flex h-12 w-12 items-center justify-center rounded-full bg-karte2" aria-label="Ziel verringern">
                <Minus size={20} />
              </button>
              <span className="w-6 text-center text-[22px] font-semibold">{ziel}</span>
              <button onClick={() => setZiel(Math.min(14, ziel + 1))} className="tippbar flex h-12 w-12 items-center justify-center rounded-full bg-karte2" aria-label="Ziel erhöhen">
                <Plus size={20} />
              </button>
            </div>
            {/* Der Ring zeigt "geschafft ÷ Ziel": höheres Ziel = Ring weniger voll */}
            <p className="mt-2 text-[13px]" style={{ color: dieseWoche >= ziel ? FARBE : '#8e8e93' }}>
              {dieseWoche >= ziel ? 'Wochenziel erreicht 🎉' : `Noch ${ziel - dieseWoche} bis zum Ziel`}
            </p>
          </div>
        </div>
      </Karte>

      {/* Gym: laufendes Training fortsetzen oder einen Plan starten */}
      <Karte titel="Gym" akzent={FARBE} rechts={<Link to="/fitness/gym" className="tippbar text-[15px] font-semibold" style={{ color: FARBE }}>Alles →</Link>}>
        {laufend ? (
          <Link to={`/fitness/gym/training/${laufend.id}`} className="tippbar flex min-h-14 items-center gap-3 rounded-2xl px-4 text-black" style={{ background: FARBE }}>
            <Play size={20} fill="black" />
            <span className="flex-1 text-[16px] font-semibold">{laufend.name} läuft, weiter</span>
            <ChevronRight size={20} />
          </Link>
        ) : (
          <div className="flex flex-wrap gap-2">
            {plaene.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={async () => navigate(`/fitness/gym/training/${await starteTraining(p)}`)}
                disabled={p.uebungen.length === 0}
                className="tippbar flex min-h-12 items-center gap-2 rounded-2xl bg-karte2 px-4 text-[15px] font-semibold disabled:opacity-40"
              >
                <Play size={16} color={FARBE} fill={FARBE} /> {p.name}
              </button>
            ))}
            <button
              onClick={async () => navigate(`/fitness/gym/training/${await starteTraining()}`)}
              className="tippbar flex min-h-12 items-center gap-2 rounded-2xl bg-karte2 px-4 text-[15px]"
            >
              <Plus size={16} /> Freies Training
            </button>
          </div>
        )}
      </Karte>

      <button
        onClick={() => setFormularOffen(true)}
        className="tippbar flex h-12 items-center justify-center gap-2 rounded-2xl bg-karte text-[16px] font-semibold"
        style={{ color: FARBE }}
      >
        <Plus size={20} /> Anderes Workout eintragen (Laufen, Rad …)
      </button>

      <WorkoutDiagramm />
      <SchritteDiagramm />
      <GewichtKarte />

      {/* Geplante Workouts aus dem Kalender */}
      <Karte titel="Geplant (nächste 14 Tage)" akzent="#ff9f0a">
        {geplant.length === 0 ? (
          <p className="text-[14px] text-grau">Keine Workouts im Kalender gefunden. Termine mit „Gym“, „Training“, „Laufen“ o. Ä. im Titel erscheinen hier.</p>
        ) : (
          <ul className="space-y-3">
            {geplant.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span className="text-[16px] font-medium">{t.titel}</span>
                <span className="text-[13px] text-grau">
                  {new Date(t.start).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })}, {uhrzeit(t.start)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {/* Alle gemachten Workouts, nach Wochen gruppiert */}
      <Karte titel="Deine Workouts">
        {!workouts || workouts.length === 0 ? (
          <p className="text-[14px] text-grau">Noch keine Workouts. Trag eins ein, starte ein Gym-Training oder importiere deine Health-Daten.</p>
        ) : (
          wochen.map(([woche, liste]) => (
            <div key={woche} className="mb-3 last:mb-0">
              <p className="mb-1 flex justify-between text-[12px] font-semibold uppercase tracking-wide text-grau">
                <span>{wochenTitel(woche)}</span>
                <span>
                  {liste.length} {liste.length === 1 ? 'Workout' : 'Workouts'} · {liste.reduce((s, w) => s + w.dauerMin, 0)} Min
                </span>
              </p>
              <ul>
                {liste.map((w, i) => {
                  const Icon = iconFuer(w.art)
                  const gym = gymZu(w)
                  const inhalt = (
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: FARBE + '33' }}>
                        <Icon size={20} color={FARBE} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-medium">
                          {gym ? gym.name : w.art} <span className="text-[13px] font-normal text-grau">· {gym && w.quelle === 'manuell' ? 'Gym-Log' : (QUELLE[w.quelle] ?? w.quelle)}</span>
                        </p>
                        <p className="text-[13px] text-grau">
                          {new Date(w.start).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {w.dauerMin} Min
                          {w.distanzKm ? ` · ${w.distanzKm.toLocaleString('de-DE')} km` : ''}
                          {gym ? ` · ${zahl(volumen(gym) / 1000)} t` : ''}
                        </p>
                        {/* Bei Gym-Trainings: welche Übungen */}
                        {gym && <p className="truncate text-[12px] text-grau">{gym.uebungen.map((u) => uebungName(u.uebungId)).join(', ')}</p>}
                      </div>
                    </>
                  )
                  return (
                    <li key={w.id} className={`flex min-h-16 items-center gap-3 ${i > 0 ? 'border-t border-linie' : ''}`}>
                      {gym ? (
                        <Link to={`/fitness/gym/training/${gym.id}`} className="tippbar flex min-w-0 flex-1 items-center gap-3 py-1">
                          {inhalt}
                          <ChevronRight size={16} className="text-grau" />
                        </Link>
                      ) : (
                        <>
                          {inhalt}
                          <button
                            onClick={() => confirm(`${w.art}-Workout löschen?`) && db.workouts.delete(w.id)}
                            className="tippbar flex h-11 w-11 items-center justify-center text-grau"
                            aria-label="Workout löschen"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </Karte>

      <WorkoutFormular offen={formularOffen} onZu={() => setFormularOffen(false)} />
    </Seite>
  )
}
