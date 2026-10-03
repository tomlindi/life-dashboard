// Zwei Säulendiagramme (mit Recharts): Workout-Minuten und Schritte der letzten 7 Tage.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, tagPlus, tagVon } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'
import { SchnellEingabe } from '../../core/ui/Formular'
import { useSchrittziel } from '../../core/einstellungen'

/** Gemeinsames Aussehen der Diagramme: dezente Achse, dunkler Tooltip. */
const achse = { tick: { fill: '#8e8e93', fontSize: 12 }, axisLine: false, tickLine: false } as const
const tooltipStil = { background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }

export function WorkoutDiagramm() {
  const tage = letzteTage(7)
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  // Pro Tag die Minuten aller Workouts zusammenzählen
  const daten = tage.map((tag) => ({
    tag,
    name: kurzerWochentag(tag),
    minuten: (workouts ?? []).filter((w) => tagVon(w.start) === tag).reduce((s, w) => s + w.dauerMin, 0),
  }))
  return (
    <Karte titel="Training (Minuten)" akzent="#ff375f">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daten} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" {...achse} />
            <Tooltip cursor={false} contentStyle={tooltipStil} formatter={(v) => [`${v} Min`, 'Training']} labelFormatter={() => ''} />
            <Bar dataKey="minuten" radius={[6, 6, 6, 6]} fill="#ff375f" minPointSize={3}>
              {daten.map((d) => (
                <Cell key={d.tag} fill={d.minuten > 0 ? '#ff375f' : '#38383a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Karte>
  )
}

/** Gewicht: letzter Wert, Verlauf der letzten 30 Einträge und schnelles Eintragen. */
const ZEITRAEUME = [
  { label: '1M', tage: 30 },
  { label: '3M', tage: 91 },
  { label: '6M', tage: 182 },
  { label: '1J', tage: 365 },
  { label: 'Alle', tage: Infinity },
] as const

/** Gewicht: Verlauf über einen wählbaren Zeitraum, Veränderung, Min/Max und schnelles Eintragen. */
export function GewichtKarte() {
  const werte = useLiveQuery(() => db.gewicht.orderBy('datum').toArray(), []) ?? []
  const [zeitraum, setZeitraum] = useState<(typeof ZEITRAEUME)[number]['label']>('3M')
  const tage = ZEITRAEUME.find((z) => z.label === zeitraum)!.tage
  const ab = tage === Infinity ? '' : tagPlus(heute(), -tage)
  // x = Tage seit dem ersten Wert -> echte Zeitachse (Abstände zwischen Messungen stimmen)
  const imZeitraum = werte.filter((g) => g.datum >= ab)
  const erster = imZeitraum[0]
  const tagNr = (d: string) => Math.round((Date.parse(d + 'T12:00:00') - Date.parse((erster?.datum ?? d) + 'T12:00:00')) / 86400000)
  const daten = imZeitraum.map((g) => ({ ...g, x: tagNr(g.datum) }))
  const aktuell = werte[werte.length - 1]
  const differenz = erster && aktuell && imZeitraum.length >= 2 ? aktuell.kg - erster.kg : null
  const kgs = imZeitraum.map((g) => g.kg)

  return (
    <Karte titel="Gewicht" akzent="#64d2ff" rechts={aktuell && <span className="text-[17px] font-bold">{zahl(aktuell.kg)} kg</span>}>
      {/* Zeitraum wählen */}
      <div className="mb-3 flex gap-1 rounded-xl bg-karte2 p-1">
        {ZEITRAEUME.map((z) => (
          <button
            key={z.label}
            onClick={() => setZeitraum(z.label)}
            className="tippbar min-h-8 flex-1 rounded-lg text-[13px] font-semibold"
            style={{ background: zeitraum === z.label ? '#636366' : 'transparent' }}
          >
            {z.label}
          </button>
        ))}
      </div>

      {daten.length >= 2 ? (
        <>
          <div className="mb-2 flex gap-4 text-[13px]">
            <span className="text-grau">
              Veränderung{' '}
              <b style={{ color: differenz === null || Math.abs(differenz) < 0.05 ? '#fff' : '#64d2ff' }}>
                {differenz === null ? '–' : `${differenz > 0 ? '+' : ''}${zahl(differenz)} kg`}
              </b>
            </span>
            <span className="text-grau">
              Min <b className="text-white">{zahl(Math.min(...kgs))}</b>
            </span>
            <span className="text-grau">
              Max <b className="text-white">{zahl(Math.max(...kgs))}</b>
            </span>
          </div>
          <div className="mb-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daten} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickCount={4}
                  tickFormatter={(x) => kurzDatum(tagPlus(erster.datum, Number(x))).replace(/^\w+\.,\s*/, '')}
                  {...achse}
                  tick={{ fill: '#8e8e93', fontSize: 11 }}
                />
                <YAxis domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]} {...achse} tick={{ fill: '#8e8e93', fontSize: 11 }} width={44} />
                <Tooltip
                  contentStyle={tooltipStil}
                  formatter={(v) => [`${zahl(Number(v))} kg`, 'Gewicht']}
                  labelFormatter={(_, p) => (p?.[0]?.payload?.datum ? kurzDatum(p[0].payload.datum) : '')}
                />
                <Line type="monotone" dataKey="kg" stroke="#64d2ff" strokeWidth={3} dot={daten.length <= 40 ? { r: 3, fill: '#64d2ff' } : false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="mb-3 text-[14px] text-grau">
          {werte.length === 0 ? 'Noch keine Gewichtsdaten.' : 'Zu wenige Werte in diesem Zeitraum.'} Trag dein Gewicht unten ein oder importiere es aus Apple Health.
        </p>
      )}
      <SchnellEingabe
        platzhalter="Heutiges Gewicht in kg, z. B. 68,4"
        farbe="#64d2ff"
        onNeu={(text) => {
          const kg = parseFloat(text.replace(',', '.'))
          if (Number.isFinite(kg) && kg > 20 && kg < 300) db.gewicht.put({ datum: heute(), kg })
        }}
      />
    </Karte>
  )
}

export function SchritteDiagramm() {
  const tage = letzteTage(7)
  const schritte = useLiveQuery(() => db.schritte.toArray(), [])
  const [schrittziel, setZiel] = useSchrittziel()
  const daten = tage.map((tag) => ({
    tag,
    name: kurzerWochentag(tag),
    schritte: schritte?.find((s) => s.datum === tag)?.anzahl ?? 0,
  }))
  const schnitt = Math.round(daten.reduce((s, d) => s + d.schritte, 0) / 7)
  // Ziel in 500er-Schritten ändern
  const zielKnopf = (delta: number, symbol: string) => (
    <button
      onClick={() => setZiel(Math.min(30000, Math.max(1000, schrittziel + delta)))}
      className="tippbar flex h-8 w-8 items-center justify-center rounded-full bg-karte2 text-[16px]"
      aria-label={delta > 0 ? 'Schrittziel erhöhen' : 'Schrittziel verringern'}
    >
      {symbol}
    </button>
  )
  return (
    <Karte
      titel="Schritte"
      akzent="#30d158"
      rechts={
        <span className="flex items-center gap-2 text-[12px] text-grau">
          {zielKnopf(-500, '−')}
          Ziel {schrittziel.toLocaleString('de-DE')}
          {zielKnopf(500, '+')}
        </span>
      }
    >
      <p className="-mt-1 mb-1 text-[13px] text-grau">Ø {schnitt.toLocaleString('de-DE')} pro Tag (7 Tage)</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daten} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" {...achse} />
            <Tooltip cursor={false} contentStyle={tooltipStil} formatter={(v) => [Number(v).toLocaleString('de-DE'), 'Schritte']} labelFormatter={() => ''} />
            <ReferenceLine y={schrittziel} stroke="#8e8e93" strokeDasharray="4 4" />
            <Bar dataKey="schritte" radius={[6, 6, 6, 6]} minPointSize={3}>
              {daten.map((d) => (
                // Heute und Tage über dem Ziel kräftig, die anderen etwas dunkler
                <Cell key={d.tag} fill={d.schritte >= schrittziel || d.tag === heute() ? '#30d158' : '#1f7a3a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Karte>
  )
}
