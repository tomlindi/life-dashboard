// Seite für eine Sportart (z. B. /fitness/sport/Laufen): Wochenplan, Statistik, Bestwerte, letzte Einheiten.
// Distanz-Sportarten (Laufen, Rad, Schwimmen) zeigen km und Pace, Handball Spiele und Tore.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { db, type Workout } from '../../core/db'
import { heute, neueId, tagPlus, tagVon, uhrzeit, wochenStart } from '../../core/datum'
import { kurzDatum, mittel, zahl } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Karte from '../../core/ui/Karte'
import { Balken } from '../../core/ui/Formular'
import { kmh, pace, sportart } from './arten'
import WorkoutFormular from './WorkoutFormular'
import WorkoutListe from './WorkoutListe'

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Ein geplanter Termin im Wochenplan, z. B. "Mi · Intervall · 6 km · 5:00 /km". */
interface PlanEinheit {
  id: string
  tag: number // 0 = Montag … 6 = Sonntag
  typ?: string
  km?: number
  minuten?: number
  pace?: string // Ziel-Pace, z. B. "5:30"
  notiz?: string
}
interface SportPlan {
  wochenziel?: number // km (Distanz-Sportarten) oder Anzahl Einheiten
  einheiten: PlanEinheit[]
}

/** Wochentag (0 = Mo) eines ISO-Zeitstempels. */
const wochentag = (iso: string) => (new Date(iso).getDay() + 6) % 7
const leseZahl = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function SportSeite() {
  const { art = 'Laufen' } = useParams()
  const sp = sportart(art)
  const alle = useLiveQuery(() => db.workouts.where('art').equals(art).reverse().sortBy('start'), [art]) ?? []
  const termine = useLiveQuery(() => db.termine.where('start').aboveOrEqual(new Date().toISOString()).sortBy('start'), []) ?? []
  const [plan, setPlan] = useEinstellung<SportPlan>(`sportplan:${art}`, { einheiten: [] })
  const [formular, setFormular] = useState(false)
  const [bearbeiten, setBearbeiten] = useState(false)

  const ws = wochenStart()
  const dieseWoche = alle.filter((w) => tagVon(w.start) >= ws)
  const monat = alle.filter((w) => tagVon(w.start) >= tagPlus(heute(), -30))
  const summe = (liste: Workout[], feld: 'dauerMin' | 'distanzKm') => liste.reduce((s, w) => s + (w[feld] ?? 0), 0)
  const kmWoche = summe(dieseWoche, 'distanzKm')

  // Diagramm: km (oder Minuten) pro Woche, letzte 8 Wochen
  const wochen = Array.from({ length: 8 }, (_, i) => tagPlus(ws, -7 * (7 - i)))
  const diagramm = wochen.map((start) => {
    const liste = alle.filter((w) => tagVon(w.start) >= start && tagVon(w.start) < tagPlus(start, 7))
    return { start, name: kurzDatum(start).replace(/^\w+\.,\s*/, ''), wert: sp.distanz ? Math.round(summe(liste, 'distanzKm') * 10) / 10 : summe(liste, 'dauerMin') }
  })

  // Bestwerte
  const mitDistanz = alle.filter((w) => (w.distanzKm ?? 0) >= 1 && w.dauerMin > 0)
  const laengste = mitDistanz.reduce<Workout | null>((b, w) => (!b || w.distanzKm! > b.distanzKm! ? w : b), null)
  const schnellste = mitDistanz.reduce<Workout | null>((b, w) => (!b || w.dauerMin / w.distanzKm! < b.dauerMin / b.distanzKm! ? w : b), null)
  const letzte5 = mitDistanz.slice(0, 5)
  const schnittPace = letzte5.length ? pace(summe(letzte5, 'dauerMin'), summe(letzte5, 'distanzKm')) : null
  const spiele = alle.filter((w) => w.typ === 'Spiel')
  const tore = alle.reduce((s, w) => s + (w.tore ?? 0), 0)
  const kommende = termine.filter((t) => new RegExp(art, 'i').test(t.titel)).slice(0, 5)

  // Wochenplan: Ist an diesem Wochentag diese Woche schon etwas gemacht worden?
  const erledigtAm = (tag: number) => dieseWoche.find((w) => wochentag(w.start) === tag)
  const heuteTag = wochentag(new Date().toISOString())
  const planSumme = plan.einheiten.reduce((s, e) => s + (e.km ?? 0), 0)
  const ziel = plan.wochenziel ?? (sp.distanz ? planSumme : plan.einheiten.length)
  const fortschritt = sp.distanz ? kmWoche : dieseWoche.length

  const aendereEinheit = (id: string, neu: Partial<PlanEinheit>) => setPlan({ ...plan, einheiten: plan.einheiten.map((e) => (e.id === id ? { ...e, ...neu } : e)) })

  return (
    <div className="px-4 pb-10 pt-3">
      <Link to="/fitness" className="tippbar mb-2 inline-flex min-h-10 items-center text-[17px]" style={{ color: sp.farbe }}>
        <ChevronLeft size={22} /> Fitness
      </Link>
      <h1 className="mb-4 flex items-center gap-3 text-[34px] font-bold" style={{ color: sp.farbe }}>
        <sp.icon size={32} /> {art}
      </h1>

      <div className="flex flex-col gap-3">
        {/* Kennzahlen */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Diese Woche', wert: `${dieseWoche.length}×`, sub: sp.distanz ? `${zahl(kmWoche)} km` : `${summe(dieseWoche, 'dauerMin')} Min` },
            { label: '30 Tage', wert: `${monat.length}×`, sub: sp.distanz ? `${zahl(summe(monat, 'distanzKm'))} km` : `${summe(monat, 'dauerMin')} Min` },
            sp.distanz
              ? { label: art === 'Rad' ? 'Ø Tempo' : 'Ø Pace', wert: art === 'Rad' ? (letzte5.length ? `${zahl(kmh(summe(letzte5, 'dauerMin'), summe(letzte5, 'distanzKm'))!)}` : '–') : (schnittPace?.replace(' /km', '') ?? '–'), sub: art === 'Rad' ? 'km/h (letzte 5)' : '/km (letzte 5)' }
              : art === 'Handball'
                ? { label: 'Tore', wert: String(tore), sub: `${spiele.length} Spiele` }
                : { label: 'Gesamt', wert: `${alle.length}×`, sub: `${summe(alle, 'dauerMin')} Min` },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-karte p-3">
              <p className="text-[11px] text-grau">{k.label}</p>
              <p className="text-[22px] font-bold" style={{ color: sp.farbe }}>
                {k.wert}
              </p>
              <p className="text-[11px] text-grau">{k.sub}</p>
            </div>
          ))}
        </div>

        <button onClick={() => setFormular(true)} className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-black" style={{ background: sp.farbe }}>
          <Plus size={22} /> {art} eintragen
        </button>

        {/* Wochenplan */}
        <Karte
          titel="Trainingsplan (Woche)"
          akzent={sp.farbe}
          rechts={
            <button onClick={() => setBearbeiten(!bearbeiten)} className="tippbar text-[15px] font-semibold" style={{ color: sp.farbe }}>
              {bearbeiten ? 'Fertig' : 'Bearbeiten'}
            </button>
          }
        >
          {ziel > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="text-grau">Diese Woche</span>
                <span>
                  {sp.distanz ? `${zahl(kmWoche)} / ${zahl(ziel)} km` : `${fortschritt} / ${ziel} Einheiten`}
                </span>
              </div>
              <Balken wert={fortschritt / ziel} farbe={sp.farbe} />
            </div>
          )}

          {plan.einheiten.length === 0 && !bearbeiten && (
            <p className="text-[14px] text-grau">
              Noch kein Plan. Tippe auf „Bearbeiten“, um z. B.{' '}
              {sp.distanz ? '„Di · Locker · 5 km“ und „So · Long Run · 10 km“' : `„Di · ${sp.typen[0] ?? 'Einheit'} · 90 Min“`} festzulegen.
            </p>
          )}

          {/* Anzeige: jede geplante Einheit mit Status */}
          {!bearbeiten && (
            <ul className="space-y-1.5">
              {[...plan.einheiten]
                .sort((a, b) => a.tag - b.tag)
                .map((e) => {
                  const gemacht = erledigtAm(e.tag)
                  const vorbei = e.tag < heuteTag
                  return (
                    <li key={e.id} className="flex items-center gap-3 rounded-xl bg-karte2 p-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                        style={{ background: gemacht ? sp.farbe : e.tag === heuteTag ? '#fff' : '#3a3a3c', color: gemacht || e.tag === heuteTag ? '#000' : '#fff' }}
                      >
                        {gemacht ? <Check size={18} strokeWidth={3} /> : WOCHENTAGE[e.tag]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium">
                          {[e.typ, e.km ? `${zahl(e.km)} km` : '', e.minuten ? `${e.minuten} Min` : ''].filter(Boolean).join(' · ') || 'Einheit'}
                        </p>
                        <p className="truncate text-[12px] text-grau">
                          {[e.pace ? `Ziel-Pace ${e.pace} /km` : '', e.notiz].filter(Boolean).join(' · ')}
                          {gemacht && ` · gemacht: ${gemacht.distanzKm ? `${zahl(gemacht.distanzKm)} km` : `${gemacht.dauerMin} Min`}${sp.distanz && gemacht.distanzKm ? ` @ ${pace(gemacht.dauerMin, gemacht.distanzKm)}` : ''}`}
                          {!gemacht && vorbei && ' · verpasst'}
                          {!gemacht && e.tag === heuteTag && ' · heute'}
                        </p>
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}

          {/* Bearbeiten: alles direkt in der Liste ändern (wie in Notion) */}
          {bearbeiten && (
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-3">
                <span className="text-[14px]">Wochenziel ({sp.distanz ? 'km' : 'Einheiten'})</span>
                <input
                  inputMode="decimal"
                  defaultValue={plan.wochenziel ?? ''}
                  placeholder={sp.distanz ? zahl(planSumme) : String(plan.einheiten.length)}
                  onBlur={(e) => setPlan({ ...plan, wochenziel: leseZahl(e.target.value) })}
                  className="h-10 w-20 rounded-lg bg-karte2 text-center outline-none placeholder:text-grau"
                />
              </label>
              {plan.einheiten.map((e) => (
                <div key={e.id} className="rounded-xl bg-karte2 p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <select value={e.tag} onChange={(ev) => aendereEinheit(e.id, { tag: Number(ev.target.value) })} className="h-10 rounded-lg bg-black/40 px-2 outline-none">
                      {WOCHENTAGE.map((t, i) => (
                        <option key={t} value={i}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select value={e.typ ?? ''} onChange={(ev) => aendereEinheit(e.id, { typ: ev.target.value || undefined })} className="h-10 min-w-0 flex-1 rounded-lg bg-black/40 px-2 outline-none">
                      <option value="">– Art –</option>
                      {sp.typen.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <button onClick={() => setPlan({ ...plan, einheiten: plan.einheiten.filter((x) => x.id !== e.id) })} className="tippbar flex h-10 w-10 items-center justify-center text-grau" aria-label="Entfernen">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {sp.distanz && (
                      <input inputMode="decimal" defaultValue={e.km ? String(e.km).replace('.', ',') : ''} placeholder="km" onBlur={(ev) => aendereEinheit(e.id, { km: leseZahl(ev.target.value) })} className="h-10 w-16 rounded-lg bg-black/40 text-center outline-none placeholder:text-grau" />
                    )}
                    <input inputMode="numeric" defaultValue={e.minuten ?? ''} placeholder="Min" onBlur={(ev) => aendereEinheit(e.id, { minuten: leseZahl(ev.target.value) })} className="h-10 w-16 rounded-lg bg-black/40 text-center outline-none placeholder:text-grau" />
                    {sp.distanz && (
                      <input defaultValue={e.pace ?? ''} placeholder="Pace 5:30" onBlur={(ev) => aendereEinheit(e.id, { pace: ev.target.value.trim() || undefined })} className="h-10 w-24 rounded-lg bg-black/40 text-center outline-none placeholder:text-grau" />
                    )}
                    <input defaultValue={e.notiz ?? ''} placeholder="Notiz" onBlur={(ev) => aendereEinheit(e.id, { notiz: ev.target.value.trim() || undefined })} className="h-10 min-w-0 flex-1 rounded-lg bg-black/40 px-2 outline-none placeholder:text-grau" />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setPlan({ ...plan, einheiten: [...plan.einheiten, { id: neueId(), tag: Math.min(6, heuteTag + 1) }] })}
                className="tippbar min-h-11 w-full rounded-xl bg-karte2 text-[15px] font-semibold"
                style={{ color: sp.farbe }}
              >
                + Einheit hinzufügen
              </button>
            </div>
          )}
        </Karte>

        {/* Verlauf pro Woche */}
        <Karte titel={sp.distanz ? 'Kilometer pro Woche' : 'Minuten pro Woche'} akzent={sp.farbe}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diagramm} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <Tooltip
                  cursor={false}
                  contentStyle={{ background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }}
                  formatter={(v) => [sp.distanz ? `${zahl(Number(v))} km` : `${v} Min`, 'Woche']}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="wert" radius={[6, 6, 6, 6]} minPointSize={3}>
                  {diagramm.map((d) => (
                    <Cell key={d.start} fill={d.wert > 0 ? sp.farbe : '#38383a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Karte>

        {/* Bestwerte */}
        {sp.distanz && mitDistanz.length > 0 && (
          <Karte titel="Bestwerte" akzent="#ffd60a">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-karte2 p-3">
                <p className="text-[12px] text-grau">Längste Distanz</p>
                <p className="text-[20px] font-bold text-[#ffd60a]">{zahl(laengste!.distanzKm!, 2)} km</p>
                <p className="text-[11px] text-grau">{kurzDatum(tagVon(laengste!.start))}</p>
              </div>
              <div className="rounded-2xl bg-karte2 p-3">
                <p className="text-[12px] text-grau">{art === 'Rad' ? 'Schnellstes Tempo' : 'Schnellste Pace'}</p>
                <p className="text-[20px] font-bold text-[#ffd60a]">
                  {art === 'Rad' ? `${zahl(kmh(schnellste!.dauerMin, schnellste!.distanzKm)!)} km/h` : pace(schnellste!.dauerMin, schnellste!.distanzKm)}
                </p>
                <p className="text-[11px] text-grau">
                  {zahl(schnellste!.distanzKm!, 2)} km · {kurzDatum(tagVon(schnellste!.start))}
                </p>
              </div>
            </div>
          </Karte>
        )}

        {art === 'Handball' && (
          <Karte titel="Statistik" akzent={sp.farbe}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[22px] font-bold">{alle.length - spiele.length}</p>
                <p className="text-[12px] text-grau">Trainings</p>
              </div>
              <div>
                <p className="text-[22px] font-bold">{spiele.length}</p>
                <p className="text-[12px] text-grau">Spiele</p>
              </div>
              <div>
                <p className="text-[22px] font-bold">{spiele.length ? zahl(mittel(spiele.map((s) => s.tore ?? 0))!) : '–'}</p>
                <p className="text-[12px] text-grau">Ø Tore/Spiel</p>
              </div>
            </div>
          </Karte>
        )}

        {/* Kommende Termine aus dem Kalender (z. B. Handball-Spiele) */}
        {kommende.length > 0 && (
          <Karte titel="Demnächst (Kalender)" akzent="#ff9f0a">
            <ul className="space-y-2">
              {kommende.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 text-[15px]">
                  <span className="truncate">{t.titel}</span>
                  <span className="shrink-0 text-[13px] text-grau">
                    {kurzDatum(tagVon(t.start))}, {uhrzeit(t.start)}
                  </span>
                </li>
              ))}
            </ul>
          </Karte>
        )}

        <Karte titel={art === 'Laufen' ? 'Letzte Läufe' : 'Letzte Einheiten'}>
          <WorkoutListe workouts={alle} maxWochen={12} />
        </Karte>
      </div>

      <WorkoutFormular offen={formular} onZu={() => setFormular(false)} startArt={art} />
    </div>
  )
}
