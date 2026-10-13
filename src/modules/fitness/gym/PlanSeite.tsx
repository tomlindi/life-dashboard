// Einen Trainingsplan (Vorlage) bearbeiten: Übungen, Sätze, Wiederholungen, Gewicht, Pause.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, ChevronLeft, Minus, Plus, X } from 'lucide-react'
import { db, type GymPlan } from '../../../core/db'
import { neueId } from '../../../core/datum'
import Karte from '../../../core/ui/Karte'
import UebungWahl from './UebungWahl'
import { starteTraining } from './daten'

const FARBE = '#ff375f'
const PAUSEN = [60, 90, 120, 150, 180, 240]

const aendere = (id: string, fn: (p: GymPlan) => void) => db.gymPlaene.where('id').equals(id).modify(fn)

export default function PlanSeite() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const plan = useLiveQuery(async () => (await db.gymPlaene.get(id)) ?? null, [id])
  const uebungen = useLiveQuery(() => db.uebungen.toArray(), []) ?? []
  const [wahlOffen, setWahlOffen] = useState(false)

  if (plan === undefined) return null
  if (plan === null) {
    return (
      <div className="p-6 text-center text-grau">
        Plan nicht gefunden. <Link to="/fitness/gym" className="text-[#ff375f]">Zurück</Link>
      </div>
    )
  }

  const name = (uebungId: string) => uebungen.find((u) => u.id === uebungId)?.name ?? 'Übung'

  return (
    <div className="px-4 pb-10 pt-3">
      <Link to="/fitness/gym" className="tippbar mb-2 inline-flex min-h-10 items-center text-[17px]" style={{ color: FARBE }}>
        <ChevronLeft size={22} /> Gym
      </Link>
      <input
        defaultValue={plan.name}
        onBlur={(e) => aendere(id, (p) => void (p.name = e.target.value.trim() || p.name))}
        className="w-full bg-transparent text-[30px] font-bold outline-none"
        style={{ fontSize: 30 }}
      />
      <textarea
        defaultValue={plan.notiz ?? ''}
        onBlur={(e) => aendere(id, (p) => void (p.notiz = e.target.value.trim() || undefined))}
        placeholder="Beschreibung (z. B. Fokus Brust/Schulter, Progression +2,5 kg)"
        rows={2}
        className="mb-3 w-full resize-none bg-transparent text-[15px] text-grau outline-none placeholder:text-grau/60"
      />

      <button
        onClick={async () => navigate(`/fitness/gym/training/${await starteTraining(plan)}`)}
        disabled={plan.uebungen.length === 0}
        className="tippbar mb-3 min-h-14 w-full rounded-2xl text-[17px] font-semibold text-black disabled:opacity-40"
        style={{ background: FARBE }}
      >
        ▶︎ Training starten
      </button>

      <div className="flex flex-col gap-3">
        {plan.uebungen.map((u, i) => (
          <Karte key={u.id}>
            <div className="mb-2 flex items-center gap-1">
              <h2 className="flex-1 text-[17px] font-bold">{name(u.uebungId)}</h2>
              <button disabled={i === 0} onClick={() => aendere(id, (p) => void p.uebungen.splice(i - 1, 0, p.uebungen.splice(i, 1)[0]))} className="tippbar flex h-9 w-9 items-center justify-center text-grau disabled:opacity-20" aria-label="Nach oben">
                <ArrowUp size={18} />
              </button>
              <button disabled={i === plan.uebungen.length - 1} onClick={() => aendere(id, (p) => void p.uebungen.splice(i + 1, 0, p.uebungen.splice(i, 1)[0]))} className="tippbar flex h-9 w-9 items-center justify-center text-grau disabled:opacity-20" aria-label="Nach unten">
                <ArrowDown size={18} />
              </button>
              <button onClick={() => aendere(id, (p) => void p.uebungen.splice(i, 1))} className="tippbar flex h-9 w-9 items-center justify-center text-grau" aria-label="Entfernen">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {/* Sätze */}
              <div>
                <p className="text-[11px] text-grau">Sätze</p>
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => aendere(id, (p) => void (p.uebungen[i].saetze = Math.max(1, u.saetze - 1)))} className="tippbar flex h-9 w-7 items-center justify-center text-grau" aria-label="Weniger Sätze">
                    <Minus size={14} />
                  </button>
                  <span className="text-[17px] font-semibold">{u.saetze}</span>
                  <button onClick={() => aendere(id, (p) => void (p.uebungen[i].saetze = Math.min(10, u.saetze + 1)))} className="tippbar flex h-9 w-7 items-center justify-center text-grau" aria-label="Mehr Sätze">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {/* Wiederholungen (Text, z. B. "8-10") */}
              <label>
                <span className="block text-[11px] text-grau">Wdh</span>
                <input
                  defaultValue={u.wdh}
                  onBlur={(e) => aendere(id, (p) => void (p.uebungen[i].wdh = e.target.value.trim() || '8-12'))}
                  className="h-9 w-full rounded-lg bg-karte2 text-center font-semibold outline-none"
                />
              </label>
              {/* Startgewicht */}
              <label>
                <span className="block text-[11px] text-grau">kg (Start)</span>
                <input
                  defaultValue={u.kg === undefined ? '' : String(u.kg).replace('.', ',')}
                  inputMode="decimal"
                  placeholder="–"
                  onBlur={(e) => {
                    const kg = parseFloat(e.target.value.replace(',', '.'))
                    aendere(id, (p) => void (p.uebungen[i].kg = Number.isFinite(kg) && kg > 0 ? kg : undefined))
                  }}
                  className="h-9 w-full rounded-lg bg-karte2 text-center font-semibold outline-none placeholder:text-grau"
                />
              </label>
              {/* Pause */}
              <div>
                <p className="text-[11px] text-grau">Pause</p>
                <button
                  onClick={() => aendere(id, (p) => void (p.uebungen[i].pauseSek = PAUSEN[(PAUSEN.indexOf(u.pauseSek) + 1) % PAUSEN.length]))}
                  className="tippbar h-9 w-full rounded-lg bg-karte2 font-semibold"
                >
                  {Math.floor(u.pauseSek / 60)}:{String(u.pauseSek % 60).padStart(2, '0')}
                </button>
              </div>
            </div>
            <input
              defaultValue={u.notiz ?? ''}
              onBlur={(e) => aendere(id, (p) => void (p.uebungen[i].notiz = e.target.value.trim() || undefined))}
              placeholder="Notiz / Technik-Hinweis"
              className="mt-2 h-10 w-full rounded-xl bg-black/30 px-3 text-[14px] outline-none placeholder:text-grau"
            />
          </Karte>
        ))}

        <button onClick={() => setWahlOffen(true)} className="tippbar min-h-12 rounded-2xl bg-karte text-[16px] font-semibold" style={{ color: FARBE }}>
          + Übung hinzufügen
        </button>
        <button
          onClick={async () => {
            if (!confirm(`Plan „${plan.name}“ löschen? (Bisherige Trainings bleiben erhalten.)`)) return
            await db.gymPlaene.delete(id)
            navigate('/fitness/gym')
          }}
          className="tippbar min-h-12 rounded-2xl bg-karte text-[15px] text-[#ff453a]"
        >
          Plan löschen
        </button>
      </div>

      <UebungWahl
        offen={wahlOffen}
        onZu={() => setWahlOffen(false)}
        onWahl={(uebungId) => aendere(id, (p) => void p.uebungen.push({ id: neueId(), uebungId, saetze: 3, wdh: '8-12', pauseSek: 120 }))}
      />
    </div>
  )
}
