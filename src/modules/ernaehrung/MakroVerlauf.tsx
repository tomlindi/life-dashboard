// Karte "Makros im Verlauf": Wie gut triffst du deine Tagesziele über einen Monat oder ein Jahr?
// Oben: pro Nährwert ein Balken mit dem Durchschnitt pro Tag im Vergleich zum Ziel
//        und an wie vielen Tagen das Ziel getroffen wurde.
// Unten: Säulendiagramm für einen Nährwert – im Monat jeder Tag, im Jahr der Schnitt jedes Monats.
// Gezählt werden nur Tage, an denen mindestens eine Mahlzeit mit Nährwerten eingetragen ist.
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { Mahlzeit } from '../../core/db'
import { heute } from '../../core/datum'
import { zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'
import { Chips } from '../../core/ui/Formular'
import { FARBE, NAEHRWERTE, TREFFER_REGEL, hatNaehrwerte, summe, useErnaehrungsZiele, zielGetroffen, type Naehrwert, type Naehrwerte } from './naehrwerte'

const ANSICHTEN = ['Monat', 'Jahr'] as const
type Ansicht = (typeof ANSICHTEN)[number]

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
/** Balken gehen bis 150 % vom Ziel; die Ziellinie sitzt also bei 2/3 der Breite. */
const SKALA = 1.5

const achse = { tick: { fill: '#8e8e93', fontSize: 11 }, axisLine: false, tickLine: false } as const
const tooltipStil = { background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }

/** Nährwerte pro Tag ("2026-10-06" -> Summe), nur Tage mit Nährwerten. */
function tagesSummen(mahlzeiten: Mahlzeit[]): Map<string, Naehrwerte> {
  const proTag = new Map<string, Mahlzeit[]>()
  for (const m of mahlzeiten) {
    if (!hatNaehrwerte(m)) continue
    proTag.set(m.datum, [...(proTag.get(m.datum) ?? []), m])
  }
  return new Map([...proTag].map(([tag, liste]) => [tag, summe(liste)]))
}

const schnitt = (werte: number[]) => (werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0)

export default function MakroVerlauf({ mahlzeiten }: { mahlzeiten: Mahlzeit[] }) {
  const [ziele] = useErnaehrungsZiele()
  const [ansicht, setAnsicht] = useState<Ansicht>('Monat')
  const [gewaehlt, setGewaehlt] = useState<Naehrwert>('kcal')
  // Angezeigter Zeitraum als Anfang eines Datums: "2026-10" (Monat) oder "2026" (Jahr)
  const [jahr, setJahr] = useState(Number(heute().slice(0, 4)))
  const [monat, setMonat] = useState(Number(heute().slice(5, 7))) // 1–12

  const praefix = ansicht === 'Monat' ? `${jahr}-${String(monat).padStart(2, '0')}` : String(jahr)
  const summen = tagesSummen(mahlzeiten)
  const tage = [...summen.keys()].filter((t) => t.startsWith(praefix)).sort()

  // Weiter-Pfeil nur, solange der Zeitraum nicht in der Zukunft liegt
  const amEnde = ansicht === 'Monat' ? praefix >= heute().slice(0, 7) : praefix >= heute().slice(0, 4)
  function blaettern(richtung: -1 | 1) {
    if (ansicht === 'Jahr') return setJahr(jahr + richtung)
    const neu = monat + richtung
    if (neu < 1) {
      setMonat(12)
      setJahr(jahr - 1)
    } else if (neu > 12) {
      setMonat(1)
      setJahr(jahr + 1)
    } else setMonat(neu)
  }

  // Diagramm: im Monat jeder Tag, im Jahr der Durchschnitt jedes Monats
  const n = NAEHRWERTE.find((x) => x.key === gewaehlt)!
  const daten =
    ansicht === 'Monat'
      ? Array.from({ length: new Date(jahr, monat, 0).getDate() }, (_, i) => {
          const tag = `${praefix}-${String(i + 1).padStart(2, '0')}`
          return { name: String(i + 1), wert: summen.get(tag)?.[gewaehlt] ?? null }
        })
      : MONATE.map((name, i) => {
          const imMonat = tage.filter((t) => t.slice(5, 7) === String(i + 1).padStart(2, '0'))
          return { name: name.slice(0, 3), wert: imMonat.length ? Math.round(schnitt(imMonat.map((t) => summen.get(t)![gewaehlt]))) : null }
        })

  return (
    <Karte titel="Makros im Verlauf" akzent={FARBE}>
      <Chips optionen={ANSICHTEN} wert={ansicht} onWahl={setAnsicht} farbe={FARBE} />

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => blaettern(-1)} className="tippbar flex h-9 w-9 items-center justify-center rounded-full bg-karte2" aria-label="Zurück">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[16px] font-semibold">{ansicht === 'Monat' ? `${MONATE[monat - 1]} ${jahr}` : jahr}</p>
          <p className="text-[12px] text-grau">{tage.length === 1 ? '1 Tag' : `${tage.length} Tage`} mit Nährwerten</p>
        </div>
        <button
          type="button"
          onClick={() => blaettern(1)}
          disabled={amEnde}
          className="tippbar flex h-9 w-9 items-center justify-center rounded-full bg-karte2 disabled:opacity-30"
          aria-label="Weiter"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {tage.length === 0 ? (
        <p className="mt-4 text-[14px] text-grau">In diesem Zeitraum gibt es noch keine Mahlzeiten mit Nährwerten.</p>
      ) : (
        <>
          {/* Ein Balken pro Nährwert: Durchschnitt pro Tag gegenüber dem Tagesziel */}
          <div className="mt-4 flex flex-col gap-3.5">
            {NAEHRWERTE.map((x) => {
              const durchschnitt = schnitt(tage.map((t) => summen.get(t)![x.key]))
              const anteil = durchschnitt / (ziele[x.key] || 1)
              const treffer = tage.filter((t) => zielGetroffen(x.key, summen.get(t)![x.key], ziele[x.key])).length
              return (
                <div key={x.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-semibold" style={{ color: x.farbe }}>
                      {x.name}
                    </span>
                    <span className="text-grau">
                      Ø <span className="text-white">{zahl(durchschnitt, 0)}</span> / {zahl(ziele[x.key], 0)} {x.einheit} · {zahl(anteil * 100, 0)} %
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-karte2">
                    <div className="h-full rounded-full" style={{ width: `${(Math.min(anteil, SKALA) / SKALA) * 100}%`, background: x.farbe }} />
                    {/* Ziellinie bei 100 % */}
                    <div className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${(1 / SKALA) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[12px] text-grau">
                    Ziel getroffen an <span className="text-white">{treffer}</span> von {tage.length} Tagen
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-grau">Weiße Linie = Tagesziel · {TREFFER_REGEL}</p>

          {/* Diagramm für einen Nährwert */}
          <div className="mt-5 flex gap-1.5">
            {NAEHRWERTE.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setGewaehlt(x.key)}
                className="tippbar min-h-8 flex-1 rounded-full text-[13px] font-semibold"
                style={{ background: gewaehlt === x.key ? x.farbe : '#2c2c2e', color: gewaehlt === x.key ? '#000' : '#fff' }}
              >
                {x.key === 'kcal' ? 'kcal' : x.key === 'kohlenhydrate' ? 'KH' : x.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-grau">{ansicht === 'Monat' ? `${n.name} pro Tag` : `${n.name}: Ø pro Tag in jedem Monat`} · gestrichelt = Ziel</p>
          <div className="mt-1 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daten} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" {...achse} interval={ansicht === 'Monat' ? 4 : 0} />
                <Tooltip
                  cursor={false}
                  contentStyle={tooltipStil}
                  formatter={(v) => [`${zahl(Number(v), 0)} ${n.einheit}`, n.name]}
                  labelFormatter={(l) => (ansicht === 'Monat' ? `${l}. ${MONATE[monat - 1]}` : String(l))}
                />
                <ReferenceLine y={ziele[gewaehlt]} stroke="#8e8e93" strokeDasharray="4 4" ifOverflow="extendDomain" />
                <Bar dataKey="wert" radius={[4, 4, 4, 4]}>
                  {daten.map((d) => (
                    // Getroffen = volle Farbe, sonst blasser
                    <Cell key={d.name} fill={n.farbe} fillOpacity={d.wert != null && zielGetroffen(gewaehlt, d.wert, ziele[gewaehlt]) ? 1 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Karte>
  )
}
