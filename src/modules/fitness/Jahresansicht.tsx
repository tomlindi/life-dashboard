// Trainings-Kalender: jeder Trainingstag in der Farbe seiner Sportart.
// Eingeklappt (Normalzustand): nur der aktuelle Monat, so groß wie die Wochenziel-Karte.
// Antippen klappt das ganze Jahr auf, wie im Apple-Kalender: 12 kleine Monate, Jahr wechseln, Tag antippen für Details.
// Zwei Sportarten an einem Tag = Kästchen schräg geteilt.
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import type { Workout } from '../../core/db'
import { heute, tagString, tagVon } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'
import { sportart } from './arten'

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WOCHENTAGE = ['M', 'D', 'M', 'D', 'F', 'S', 'S']
const LEER = '#2c2c2e'
const FARBE = '#ff375f'

/** Hintergrund eines Tages: eine Farbe, oder bei zwei+ Sportarten schräg geteilt (die zwei längsten). */
function hintergrund(arten: [string, number][]): string {
  if (arten.length === 0) return LEER
  const [a, b] = arten.map(([art]) => sportart(art).farbe)
  return b ? `linear-gradient(135deg, ${a} 50%, ${b} 50%)` : a
}

/** Workouts nach Tag gruppiert + Sportarten eines Tages (nach Minuten, längste zuerst). */
function nachTagen(workouts: Workout[], jahr: number) {
  const proTag = new Map<string, Workout[]>()
  for (const w of workouts) {
    const t = tagVon(w.start)
    if (t.startsWith(String(jahr))) proTag.set(t, [...(proTag.get(t) ?? []), w])
  }
  const artenAm = (t: string): [string, number][] => {
    const minuten = new Map<string, number>()
    for (const w of proTag.get(t) ?? []) minuten.set(w.art, (minuten.get(w.art) ?? 0) + (w.dauerMin || 1))
    return [...minuten].sort((a, b) => b[1] - a[1])
  }
  return { proTag, artenAm }
}

/** Ein Monat als Raster (Montag zuerst). Mit onTag sind die Tage einzeln antippbar. */
function Monat({ jahr, monat, artenAm, gewaehlt, onTag, rund = 3 }: {
  jahr: number
  monat: number
  artenAm: (t: string) => [string, number][]
  gewaehlt?: string | null
  onTag?: (t: string) => void
  rund?: number
}) {
  const h = heute()
  const versatz = (new Date(jahr, monat, 1, 12).getDay() + 6) % 7 // Montag = 0
  const anzahlTage = new Date(jahr, monat + 1, 0).getDate()
  return (
    <div className="grid grid-cols-7 gap-[2px]">
      {Array.from({ length: versatz }, (_, i) => (
        <span key={`l${i}`} />
      ))}
      {Array.from({ length: anzahlTage }, (_, i) => {
        const t = tagString(new Date(jahr, monat, i + 1, 12))
        const arten = artenAm(t)
        const stil = {
          background: hintergrund(arten),
          borderRadius: rund,
          opacity: t > h ? 0.35 : 1,
          outline: t === gewaehlt ? '2px solid #fff' : t === h ? `1.5px solid ${FARBE}` : undefined,
          outlineOffset: 1,
        }
        return onTag ? (
          <button
            key={t}
            onClick={() => onTag(t)}
            aria-label={`${kurzDatum(t)}: ${arten.length ? arten.map(([a]) => a).join(', ') : 'kein Training'}`}
            className="aspect-square"
            style={stil}
          />
        ) : (
          <span key={t} className="aspect-square" style={stil} />
        )
      })}
    </div>
  )
}

export default function Jahresansicht({ workouts }: { workouts: Workout[] }) {
  const [offen, setOffen] = useState(false)
  return offen ? <GanzesJahr workouts={workouts} onZu={() => setOffen(false)} /> : <DieserMonat workouts={workouts} onAuf={() => setOffen(true)} />
}

/** Eingeklappt: aktueller Monat links, Zahlen rechts. Die ganze Karte ist ein Knopf. */
function DieserMonat({ workouts, onAuf }: { workouts: Workout[]; onAuf: () => void }) {
  const h = heute()
  const jahr = Number(h.slice(0, 4))
  const monat = Number(h.slice(5, 7)) - 1
  const { proTag, artenAm } = nachTagen(workouts, jahr)
  const prefix = h.slice(0, 7)
  const imMonat = [...proTag].filter(([t]) => t.startsWith(prefix))
  const workoutsMonat = imMonat.reduce((s, [, ws]) => s + ws.length, 0)
  const workoutsJahr = [...proTag.values()].reduce((s, ws) => s + ws.length, 0)
  const monatsName = new Date(jahr, monat, 1).toLocaleDateString('de-DE', { month: 'long' })

  return (
    <button onClick={onAuf} className="tippbar block w-full text-left" aria-label="Ganzes Jahr anzeigen">
      <Karte
        titel="Trainingskalender"
        akzent={FARBE}
        rechts={
          <span className="flex items-center text-[13px] text-grau">
            Jahr <ChevronRight size={16} />
          </span>
        }
      >
        <div className="flex items-center gap-5">
          <div className="w-[136px] shrink-0">
            <div className="mb-[3px] grid grid-cols-7 gap-[2px] text-center text-[9px] font-semibold text-grau">
              {WOCHENTAGE.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <Monat jahr={jahr} monat={monat} artenAm={artenAm} rund={4} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] capitalize text-grau">{monatsName}</p>
            <p className="text-[26px] font-bold leading-tight">
              {workoutsMonat}
              <span className="text-[15px] font-medium text-grau"> {workoutsMonat === 1 ? 'Workout' : 'Workouts'}</span>
            </p>
            <p className="text-[13px] text-grau">an {imMonat.length} {imMonat.length === 1 ? 'Tag' : 'Tagen'}</p>
            <p className="mt-2 text-[13px]">
              <b>{workoutsJahr}</b> <span className="text-grau">in {jahr}</span>
            </p>
          </div>
        </div>
      </Karte>
    </button>
  )
}

/** Ausgeklappt: 12 Monate, Jahr wechseln, Tag antippen, Legende. */
function GanzesJahr({ workouts, onZu }: { workouts: Workout[]; onZu: () => void }) {
  const h = heute()
  const diesesJahr = Number(h.slice(0, 4))
  const [jahr, setJahr] = useState(diesesJahr)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const { proTag, artenAm } = nachTagen(workouts, jahr)

  // Zusammenfassung: Trainingstage, Ø pro Woche (bis heute bzw. ganzes Jahr), Anzahl je Sportart
  const jahrWorkouts = [...proTag.values()].flat()
  const bisTag = jahr === diesesJahr ? h : `${jahr}-12-31`
  const tageImJahr = Math.round((Date.parse(bisTag + 'T12:00:00') - Date.parse(`${jahr}-01-01T12:00:00`)) / 86400000) + 1
  const proWoche = jahr > diesesJahr ? 0 : jahrWorkouts.length / Math.max(1, tageImJahr / 7)
  const anzahlJeArt = new Map<string, number>()
  for (const w of jahrWorkouts) anzahlJeArt.set(w.art, (anzahlJeArt.get(w.art) ?? 0) + 1)
  const legende = [...anzahlJeArt].sort((a, b) => b[1] - a[1])

  const wechsle = (n: number) => {
    setJahr(jahr + n)
    setGewaehlt(null)
  }
  const rund = 'tippbar flex h-8 w-8 items-center justify-center rounded-full bg-karte2'

  return (
    <Karte
      titel="Trainingskalender"
      akzent={FARBE}
      rechts={
        <div className="flex items-center gap-2">
          <button onClick={() => wechsle(-1)} className={rund} aria-label="Vorheriges Jahr">
            <ChevronLeft size={16} />
          </button>
          <span className="w-10 text-center text-[15px] font-semibold tabular-nums">{jahr}</span>
          <button onClick={() => wechsle(1)} className={rund} aria-label="Nächstes Jahr">
            <ChevronRight size={16} />
          </button>
          <button onClick={onZu} className={rund} aria-label="Einklappen">
            <ChevronUp size={16} />
          </button>
        </div>
      }
    >
      <p className="mb-3 text-[15px]">
        <b>{jahrWorkouts.length}</b> <span className="text-grau">Workouts an</span> <b>{proTag.size}</b> <span className="text-grau">Tagen</span>
        {proWoche > 0 && (
          <>
            {' · Ø '}
            <b>{zahl(proWoche)}</b>
            <span className="text-grau">/Woche</span>
          </>
        )}
      </p>

      {/* 12 Monate, 3 nebeneinander */}
      <div className="grid grid-cols-3 gap-3">
        {MONATE.map((name, m) => (
          <div key={name}>
            <p className="mb-1 text-[11px] font-semibold text-grau">{name}</p>
            <Monat jahr={jahr} monat={m} artenAm={artenAm} gewaehlt={gewaehlt} onTag={(t) => setGewaehlt(gewaehlt === t ? null : t)} />
          </div>
        ))}
      </div>

      {/* Angetippter Tag */}
      {gewaehlt && (
        <div className="mt-3 rounded-2xl bg-karte2 px-3 py-2.5">
          <p className="text-[13px] font-semibold">{new Date(gewaehlt + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {(proTag.get(gewaehlt) ?? []).length === 0 ? (
            <p className="text-[13px] text-grau">Kein Training</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {(proTag.get(gewaehlt) ?? []).map((w) => (
                <li key={w.id} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sportart(w.art).farbe }} />
                  <span className="flex-1">
                    {w.art}
                    {w.typ ? ` · ${w.typ}` : ''}
                  </span>
                  <span className="text-grau">
                    {w.dauerMin} Min{w.distanzKm ? ` · ${zahl(w.distanzKm)} km` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Legende: Farbe = Sportart, Zahl = Workouts im Jahr */}
      {legende.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {legende.map(([art, n]) => (
            <span key={art} className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: sportart(art).farbe }} />
              {art} <span className="text-grau">{n}×</span>
            </span>
          ))}
        </div>
      )}
    </Karte>
  )
}
