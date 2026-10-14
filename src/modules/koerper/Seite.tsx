// Bereich "Körper": Gewicht, Körperfettanteil (KFA) und Größe mit Verlauf, dazu der BMI.
// Gewicht kommt aus Apple Health oder deiner eigenen Eingabe (dieselbe Tabelle wie bei Fitness),
// KFA und Größe kommen nur aus Apple Health (über Life Sync).
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../core/db'
import { tagPlus } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import { useHealthVerlauf } from '../../core/healthDaten'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import HealthSymbol from '../../core/ui/HealthSymbol'
import { ZeitraumWahl, zeitraumAb, type ZeitraumLabel } from '../../core/ui/Zeitraum'
import { GewichtKarte } from '../fitness/Diagramme'

const FARBE = '#40c8e0'
const achse = { tick: { fill: '#8e8e93', fontSize: 11 }, axisLine: false, tickLine: false } as const
const tooltipStil = { background: 'var(--color-karte2)', border: 'none', borderRadius: 12, color: 'var(--color-text)', fontSize: 13 }

/** BMI = Gewicht (kg) ÷ Größe (m)². Einordnung nach WHO für Erwachsene. */
function bmiEinordnung(bmi: number) {
  if (bmi < 18.5) return { text: 'Untergewicht', farbe: '#FF9F0A' }
  if (bmi < 25) return { text: 'Normalgewicht', farbe: '#30D158' }
  if (bmi < 30) return { text: 'Übergewicht', farbe: '#FFD60A' }
  return { text: 'Adipositas', farbe: '#FF453A' }
}

/** Ein großer Wert in der Übersicht. */
function Wert({ titel, wert, einheit, health }: { titel: string; wert?: number; einheit: string; health?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[13px] text-grau">
        {titel} {health && wert !== undefined && <HealthSymbol groesse={11} />}
      </p>
      <p className="text-[28px] font-bold leading-tight">
        {wert === undefined ? '–' : zahl(wert)}
        <span className="ml-1 text-[15px] font-medium text-grau">{einheit}</span>
      </p>
    </div>
  )
}

/** Liniendiagramm für einen Wert über die Zeit (z. B. KFA), mit Zeitraum-Wahl. */
function VerlaufKarte({ titel, einheit, werte, farbe }: { titel: string; einheit: string; werte: { datum: string; wert: number }[]; farbe: string }) {
  const [zeitraum, setZeitraum] = useState<ZeitraumLabel>('1J')
  const imZeitraum = werte.filter((w) => w.datum >= zeitraumAb(zeitraum))
  const erster = imZeitraum[0]
  // x = Tage seit dem ersten Wert -> echte Zeitachse (Abstände zwischen Messungen stimmen)
  const daten = imZeitraum.map((w) => ({ ...w, x: Math.round((Date.parse(w.datum + 'T12:00:00') - Date.parse(erster.datum + 'T12:00:00')) / 86400000) }))
  const letzter = werte[werte.length - 1]

  return (
    <Karte
      titel={titel}
      akzent={farbe}
      rechts={
        letzter && (
          <span className="flex items-center gap-1.5 text-[17px] font-bold">
            <HealthSymbol />
            {zahl(letzter.wert)} {einheit}
          </span>
        )
      }
    >
      <ZeitraumWahl wert={zeitraum} onWahl={setZeitraum} />
      {daten.length >= 2 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daten} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickCount={4}
                tickFormatter={(x) => kurzDatum(tagPlus(erster.datum, Number(x))).replace(/^\w+\.,\s*/, '')}
                {...achse}
              />
              <YAxis domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]} {...achse} width={44} />
              <Tooltip
                contentStyle={tooltipStil}
                formatter={(v) => [`${zahl(Number(v))} ${einheit}`, titel]}
                labelFormatter={(_, p) => (p?.[0]?.payload?.datum ? kurzDatum(p[0].payload.datum) : '')}
              />
              <Line type="monotone" dataKey="wert" stroke={farbe} strokeWidth={3} dot={daten.length <= 40 ? { r: 3, fill: farbe } : false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[14px] text-grau">
          {werte.length === 0 ? 'Noch keine Werte. Sie kommen aus Apple Health über Life Sync.' : 'Zu wenige Werte in diesem Zeitraum für ein Diagramm.'}
        </p>
      )}
    </Karte>
  )
}

export default function KoerperSeite() {
  const gewicht = useLiveQuery(() => db.gewicht.orderBy('datum').last(), [])
  const kfa = useHealthVerlauf('kfa')
  const groesse = useHealthVerlauf('groesse')
  const cm = groesse.at(-1)?.wert
  const bmi = gewicht && cm ? gewicht.kg / (cm / 100) ** 2 : undefined
  const einordnung = bmi ? bmiEinordnung(bmi) : undefined

  return (
    <Seite titel="Körper" farbe={FARBE}>
      <Karte>
        <div className="grid grid-cols-2 gap-4">
          <Wert titel="Gewicht" wert={gewicht?.kg} einheit="kg" health={gewicht?.quelle === 'health'} />
          <Wert titel="Körperfett" wert={kfa.at(-1)?.wert} einheit="%" health />
          <Wert titel="Größe" wert={cm} einheit="cm" health />
          <div className="min-w-0">
            <p className="text-[13px] text-grau">BMI</p>
            <p className="text-[28px] font-bold leading-tight">{bmi ? zahl(bmi) : '–'}</p>
            {einordnung && (
              <p className="text-[13px] font-medium" style={{ color: einordnung.farbe }}>
                {einordnung.text}
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-snug text-grau">
          {bmi
            ? 'BMI = Gewicht ÷ (Größe in m)². Er unterscheidet nicht zwischen Muskeln und Fett, bei viel Training sagt der Körperfettanteil mehr aus.'
            : 'Für den BMI braucht die App Gewicht und Größe (Größe kommt aus Apple Health).'}
        </p>
      </Karte>

      <GewichtKarte />
      <VerlaufKarte titel="Körperfettanteil" einheit="%" werte={kfa} farbe="#FF9F0A" />
      <VerlaufKarte titel="Größe" einheit="cm" werte={groesse} farbe={FARBE} />
    </Seite>
  )
}
