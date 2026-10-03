// Bereich "Fitness": Wochenziel-Ring, Diagramme, geplante Workouts und die Workout-Liste.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { db } from '../../core/db'
import { tagPlus, tagVon, heute, uhrzeit, wochenStart } from '../../core/datum'
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
  const workouts = useLiveQuery(() => db.workouts.orderBy('start').reverse().toArray(), [])
  const termine = useLiveQuery(
    // Termine von jetzt bis in 14 Tagen
    () => db.termine.where('start').between(new Date().toISOString(), new Date(`${tagPlus(heute(), 14)}T23:59:59`).toISOString()).toArray(),
    [],
  )

  const dieseWoche = (workouts ?? []).filter((w) => tagVon(w.start) >= wochenStart()).length
  const geplant = (termine ?? []).filter((t) => istWorkoutTermin(t.titel))

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

      <button
        onClick={() => setFormularOffen(true)}
        className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold"
        style={{ background: FARBE }}
      >
        <Plus size={22} /> Workout eintragen
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

      {/* Liste aller Workouts */}
      <Karte titel="Workouts">
        {!workouts || workouts.length === 0 ? (
          <p className="text-[14px] text-grau">Noch keine Workouts. Trag eins ein oder importiere deine Health-Daten.</p>
        ) : (
          <ul>
            {workouts.slice(0, 30).map((w, i) => {
              const Icon = iconFuer(w.art)
              return (
                <li key={w.id} className={`flex min-h-16 items-center gap-3 ${i > 0 ? 'border-t border-linie' : ''}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: FARBE + '33' }}>
                    <Icon size={20} color={FARBE} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium">
                      {w.art} <span className="text-[13px] font-normal text-grau">· {QUELLE[w.quelle] ?? w.quelle}</span>
                    </p>
                    <p className="text-[13px] text-grau">
                      {new Date(w.start).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {w.dauerMin} Min
                      {w.distanzKm ? ` · ${w.distanzKm.toLocaleString('de-DE')} km` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => confirm(`${w.art}-Workout löschen?`) && db.workouts.delete(w.id)}
                    className="tippbar flex h-11 w-11 items-center justify-center text-grau"
                    aria-label="Workout löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      <WorkoutFormular offen={formularOffen} onZu={() => setFormularOffen(false)} />
    </Seite>
  )
}
