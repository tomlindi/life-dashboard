// Bereich "Fitness": Wochenziel, Jahresübersicht, Workout eintragen, Sportarten (je eigene Seite), Diagramme, alle Workouts.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Minus, Play, Plus } from 'lucide-react'
import { db } from '../../core/db'
import { tagPlus, tagVon, heute, uhrzeit, wochenStart } from '../../core/datum'
import { relativ, zahl } from '../../core/format'
import { useWochenziel } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import { SPORTARTEN, istWorkoutTermin, sportart } from './arten'
import { GewichtKarte, SchritteDiagramm, WorkoutDiagramm } from './Diagramme'
import Jahresansicht from './Jahresansicht'
import WorkoutFormular from './WorkoutFormular'
import WorkoutListe from './WorkoutListe'
import { ohneDoppelte } from './workouts'

const FARBE = '#ff375f'
/** Diese Sportarten haben immer eine Kachel, die anderen erst, wenn es Einträge gibt. */
const IMMER = ['Gym', 'Laufen', 'Handball']

export default function FitnessSeite() {
  const [formularOffen, setFormularOffen] = useState(false)
  const [ziel, setZiel] = useWochenziel()
  const rohWorkouts = useLiveQuery(() => db.workouts.orderBy('start').reverse().toArray(), [])
  const workouts = rohWorkouts ? ohneDoppelte(rohWorkouts) : []
  const laufend = useLiveQuery(() => db.gymEinheiten.filter((e) => !e.ende).first(), [])
  const termine = useLiveQuery(
    // Termine von jetzt bis in 14 Tagen
    () => db.termine.where('start').between(new Date().toISOString(), new Date(`${tagPlus(heute(), 14)}T23:59:59`).toISOString()).toArray(),
    [],
  )

  const ws = wochenStart()
  const dieseWoche = workouts.filter((w) => tagVon(w.start) >= ws)
  const minutenWoche = dieseWoche.reduce((s, w) => s + w.dauerMin, 0)
  const kmWoche = dieseWoche.reduce((s, w) => s + (w.distanzKm ?? 0), 0)
  const geplant = (termine ?? []).filter((t) => istWorkoutTermin(t.titel))

  // Kacheln: feste Sportarten + alle, die in deinen Daten vorkommen (auch unbekannte aus Health)
  const artenMitDaten = [...new Set(workouts.map((w) => w.art))]
  const kacheln = [...IMMER, ...SPORTARTEN.map((s) => s.name).filter((n) => !IMMER.includes(n) && artenMitDaten.includes(n)), ...artenMitDaten.filter((a) => !SPORTARTEN.some((s) => s.name === a))]

  return (
    <Seite titel="Fitness" farbe={FARBE}>
      {/* Wochenziel */}
      <Karte titel="Wochenziel" akzent={FARBE}>
        <div className="flex items-center gap-5">
          <Ring fortschritt={dieseWoche.length / ziel} farbe={FARBE} groesse={112} dicke={14}>
            <div>
              <p className="text-[26px] font-bold leading-none">
                {dieseWoche.length}
                <span className="text-[16px] font-medium text-grau">/{ziel}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-grau">diese Woche</p>
            </div>
          </Ring>
          <div className="flex-1">
            <p className="text-[15px]">
              <b>{minutenWoche}</b> <span className="text-grau">Min</span>
              {kmWoche > 0 && (
                <>
                  {' · '}
                  <b>{zahl(kmWoche)}</b> <span className="text-grau">km</span>
                </>
              )}
            </p>
            {/* Der Ring zeigt "geschafft ÷ Ziel": höheres Ziel = Ring weniger voll */}
            <p className="mb-2 text-[13px]" style={{ color: dieseWoche.length >= ziel ? FARBE : '#8e8e93' }}>
              {dieseWoche.length >= ziel ? 'Wochenziel erreicht 🎉' : `Noch ${ziel - dieseWoche.length} bis zum Ziel`}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setZiel(Math.max(1, ziel - 1))} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-karte2" aria-label="Ziel verringern">
                <Minus size={18} />
              </button>
              <span className="text-[13px] text-grau">Ziel {ziel}/Woche</span>
              <button onClick={() => setZiel(Math.min(14, ziel + 1))} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-karte2" aria-label="Ziel erhöhen">
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </Karte>

      <Jahresansicht workouts={workouts} />

      {/* Laufendes Gym-Training */}
      {laufend && (
        <Link to={`/fitness/gym/training/${laufend.id}`} className="tippbar flex min-h-14 items-center gap-3 rounded-2xl px-4 text-black" style={{ background: FARBE }}>
          <Play size={20} fill="black" />
          <span className="flex-1 text-[16px] font-semibold">{laufend.name} läuft, weiter</span>
          <ChevronRight size={20} />
        </Link>
      )}

      <button
        onClick={() => setFormularOffen(true)}
        className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-black"
        style={{ background: FARBE }}
      >
        <Plus size={22} /> Workout eintragen
      </button>

      {/* Sportarten: jede mit eigener Seite */}
      <div className="grid grid-cols-2 gap-3">
        {kacheln.map((name) => {
          const sp = sportart(name)
          const eigene = workouts.filter((w) => w.art === name)
          const woche = eigene.filter((w) => tagVon(w.start) >= ws)
          const km = woche.reduce((s, w) => s + (w.distanzKm ?? 0), 0)
          const letztes = eigene[0]
          return (
            <Link
              key={name}
              to={name === 'Gym' ? '/fitness/gym' : `/fitness/sport/${encodeURIComponent(name)}`}
              className="tippbar flex min-h-[112px] flex-col justify-between rounded-3xl bg-karte p-4"
            >
              <div className="flex items-center justify-between">
                <sp.icon size={26} color={sp.farbe} />
                <span className="text-[22px] font-bold" style={{ color: sp.farbe }}>
                  {woche.length}×
                </span>
              </div>
              <div>
                <p className="text-[17px] font-semibold">{name}</p>
                <p className="truncate text-[12px] text-grau">
                  {km > 0 ? `${zahl(km)} km diese Woche` : letztes ? `zuletzt ${relativ(tagVon(letztes.start))}` : 'noch nichts'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <WorkoutDiagramm />
      <GewichtKarte />
      <SchritteDiagramm />

      {/* Geplante Workouts aus dem Kalender */}
      {geplant.length > 0 && (
        <Karte titel="Geplant (nächste 14 Tage)" akzent="#ff9f0a">
          <ul className="space-y-3">
            {geplant.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-[16px] font-medium">{t.titel}</span>
                <span className="shrink-0 text-[13px] text-grau">
                  {new Date(t.start).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })}, {uhrzeit(t.start)}
                </span>
              </li>
            ))}
          </ul>
        </Karte>
      )}

      {/* Alle gemachten Workouts, nach Wochen gruppiert */}
      <Karte titel="Deine Workouts">
        <WorkoutListe workouts={workouts} />
      </Karte>

      <WorkoutFormular offen={formularOffen} onZu={() => setFormularOffen(false)} />
    </Seite>
  )
}
