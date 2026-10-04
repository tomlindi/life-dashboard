// Jahresansicht wie im Apple-Kalender: 12 kleine Monate, jeder Trainingstag in der Farbe seiner Sportart.
// Zwei Sportarten an einem Tag = Kästchen schräg geteilt. Antippen zeigt, was an dem Tag war.
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Workout } from '../../core/db'
import { heute, tagString, tagVon } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'
import { sportart } from './arten'

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const LEER = '#2c2c2e'

/** Hintergrund eines Tages: eine Farbe, oder bei zwei+ Sportarten schräg geteilt (die zwei längsten). */
function hintergrund(arten: [string, number][]): string {
  if (arten.length === 0) return LEER
  const [a, b] = arten.map(([art]) => sportart(art).farbe)
  return b ? `linear-gradient(135deg, ${a} 50%, ${b} 50%)` : a
}

export default function Jahresansicht({ workouts }: { workouts: Workout[] }) {
  const h = heute()
  const [jahr, setJahr] = useState(Number(h.slice(0, 4)))
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)

  // Pro Tag: Workouts und Minuten je Sportart (längste zuerst)
  const proTag = new Map<string, Workout[]>()
  for (const w of workouts) {
    const t = tagVon(w.start)
    if (!t.startsWith(String(jahr))) continue
    proTag.set(t, [...(proTag.get(t) ?? []), w])
  }
  const artenAm = (t: string): [string, number][] => {
    const minuten = new Map<string, number>()
    for (const w of proTag.get(t) ?? []) minuten.set(w.art, (minuten.get(w.art) ?? 0) + (w.dauerMin || 1))
    return [...minuten].sort((a, b) => b[1] - a[1])
  }

  // Zusammenfassung: Trainingstage, Ø pro Woche (bis heute bzw. ganzes Jahr), Anzahl je Sportart
  const jahrWorkouts = [...proTag.values()].flat()
  const trainingstage = proTag.size
  const bisTag = jahr === Number(h.slice(0, 4)) ? h : `${jahr}-12-31`
  const tageImJahr = Math.round((Date.parse(bisTag + 'T12:00:00') - Date.parse(`${jahr}-01-01T12:00:00`)) / 86400000) + 1
  const proWoche = jahr > Number(h.slice(0, 4)) ? 0 : jahrWorkouts.length / Math.max(1, tageImJahr / 7)
  const anzahlJeArt = new Map<string, number>()
  for (const w of jahrWorkouts) anzahlJeArt.set(w.art, (anzahlJeArt.get(w.art) ?? 0) + 1)
  const legende = [...anzahlJeArt].sort((a, b) => b[1] - a[1])

  const wechsle = (n: number) => {
    setJahr(jahr + n)
    setGewaehlt(null)
  }
  const pfeil = 'tippbar flex h-8 w-8 items-center justify-center rounded-full bg-karte2'

  return (
    <Karte
      titel="Jahresübersicht"
      akzent="#ff375f"
      rechts={
        <div className="flex items-center gap-2">
          <button onClick={() => wechsle(-1)} className={pfeil} aria-label="Vorheriges Jahr">
            <ChevronLeft size={16} />
          </button>
          <span className="w-10 text-center text-[15px] font-semibold tabular-nums">{jahr}</span>
          <button onClick={() => wechsle(1)} className={pfeil} aria-label="Nächstes Jahr">
            <ChevronRight size={16} />
          </button>
        </div>
      }
    >
      <p className="mb-3 text-[15px]">
        <b>{jahrWorkouts.length}</b> <span className="text-grau">Workouts an</span> <b>{trainingstage}</b> <span className="text-grau">Tagen</span>
        {proWoche > 0 && (
          <>
            {' · Ø '}
            <b>{zahl(proWoche)}</b>
            <span className="text-grau">/Woche</span>
          </>
        )}
      </p>

      {/* 12 Monate, 3 nebeneinander */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-3">
        {MONATE.map((name, m) => {
          const erster = new Date(jahr, m, 1, 12)
          const versatz = (erster.getDay() + 6) % 7 // Montag = 0
          const anzahlTage = new Date(jahr, m + 1, 0).getDate()
          return (
            <div key={name}>
              <p className="mb-1 text-[11px] font-semibold text-grau">{name}</p>
              <div className="grid grid-cols-7 gap-[2px]">
                {Array.from({ length: versatz }, (_, i) => (
                  <span key={`l${i}`} />
                ))}
                {Array.from({ length: anzahlTage }, (_, i) => {
                  const t = tagString(new Date(jahr, m, i + 1, 12))
                  const arten = artenAm(t)
                  const zukunft = t > h
                  return (
                    <button
                      key={t}
                      onClick={() => setGewaehlt(gewaehlt === t ? null : t)}
                      aria-label={`${kurzDatum(t)}: ${arten.length ? arten.map(([a]) => a).join(', ') : 'kein Training'}`}
                      className="aspect-square rounded-[3px]"
                      style={{
                        background: hintergrund(arten),
                        opacity: zukunft ? 0.35 : 1,
                        outline: t === gewaehlt ? '2px solid #fff' : t === h ? '1.5px solid #ff375f' : undefined,
                        outlineOffset: 1,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
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
