// Aktivität (Ring) und Habits zum Abhaken. (Termine/Erinnerungen: siehe modules/kalender/Widgets.tsx)
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { db } from '../../core/db'
import { useSchrittziel, useWochenziel } from '../../core/einstellungen'
import { ohneDoppelte } from '../fitness/workouts'
import { heute, tagVon, uhrzeit, wochenStart, tagPlus } from '../../core/datum'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'

export function Aktivitaet() {
  const tag = heute()
  const schritte = useLiveQuery(() => db.schritte.get(tag), [tag])
  const workouts = useLiveQuery(async () => ohneDoppelte(await db.workouts.toArray()), [])
  const heutige = (workouts ?? []).filter((w) => tagVon(w.start) === tag)
  const dieseWoche = (workouts ?? []).filter((w) => tagVon(w.start) >= wochenStart()).length
  const anzahl = schritte?.anzahl ?? 0
  const [wochenziel] = useWochenziel() // einstellbar im Bereich Fitness
  const [schrittziel] = useSchrittziel()

  return (
    <Karte titel="Aktivität" akzent="#ff375f">
      <div className="flex items-center gap-5">
        <Ring fortschritt={anzahl / schrittziel} farbe="#ff375f" groesse={104} dicke={13}>
          <div>
            <p className="text-[19px] font-bold leading-none">{anzahl.toLocaleString('de-DE')}</p>
            <p className="mt-0.5 text-[11px] text-grau">Schritte</p>
          </div>
        </Ring>
        <div className="min-w-0 flex-1 space-y-2">
          {heutige.length === 0 ? (
            <p className="text-[14px] text-grau">Heute noch kein Workout.</p>
          ) : (
            heutige.map((w) => (
              <p key={w.id} className="text-[15px]">
                <span className="font-semibold text-[#30d158]">{w.art}</span> · {w.dauerMin} Min
                {w.distanzKm ? ` · ${w.distanzKm.toLocaleString('de-DE')} km` : ''}
              </p>
            ))
          )}
          <p className="text-[13px] text-grau">
            Diese Woche: {dieseWoche} von {wochenziel} Workouts
          </p>
        </div>
      </div>
    </Karte>
  )
}

export function Habits() {
  const tag = heute()
  const habits = useLiveQuery(() => db.habits.orderBy('sortierung').toArray(), [])
  const heutigeHaken = useLiveQuery(() => db.habitEintraege.where('datum').equals(tag).toArray(), [tag])
  const erledigt = new Set((heutigeHaken ?? []).map((h) => h.habitId))

  async function umschalten(habitId: string) {
    if (erledigt.has(habitId)) await db.habitEintraege.delete([habitId, tag])
    else await db.habitEintraege.put({ habitId, datum: tag })
  }

  if (!habits || habits.length === 0) return null
  return (
    <Karte titel="Gewohnheiten" akzent="#30d158" rechts={<span className="text-[13px] text-grau">{erledigt.size}/{habits.length}</span>}>
      <div className="grid grid-cols-2 gap-2">
        {habits.map((h) => {
          const fertig = erledigt.has(h.id)
          return (
            <button
              key={h.id}
              onClick={() => umschalten(h.id)}
              className={`tippbar flex min-h-14 items-center gap-2 rounded-2xl px-3 text-left ${fertig ? 'bg-[#30d158]/25' : 'bg-karte2'}`}
            >
              <span className="text-[22px]">{h.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{h.name}</span>
              {fertig && <Check size={18} className="text-[#30d158]" strokeWidth={3} />}
            </button>
          )
        })}
      </div>
    </Karte>
  )
}
