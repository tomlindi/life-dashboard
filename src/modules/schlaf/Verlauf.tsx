// Schlaf-Verlauf: wie sich dein Schlaf über Wochen und Monate entwickelt.
// Aufgebaut wie die Gewicht-Karte bei Fitness: Zeitraum wählen, Kennzahlen, Liniendiagramm.
import { useState } from 'react'
import { Star } from 'lucide-react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Schlaf } from '../../core/db'
import { tagPlus } from '../../core/datum'
import { kurzDatum, mittel, zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'
import { ZeitraumWahl, zeitraumAb, type ZeitraumLabel } from '../../core/ui/Zeitraum'
import { stundenText } from './Seite'

const FARBE = '#5e5ce6'
const achse = { tick: { fill: '#8e8e93', fontSize: 11 }, axisLine: false, tickLine: false } as const
const tooltipStil = { background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }

/** Anzahl Tage von einem Tag bis zu einem anderen ("JJJJ-MM-TT"). */
const tageZwischen = (von: string, bis: string) => Math.round((Date.parse(bis + 'T12:00:00') - Date.parse(von + 'T12:00:00')) / 86400000)

/** Auf ganze Minuten runden, damit nie "7 h 60 min" angezeigt wird. */
const aufMinuten = (h: number) => Math.round(h * 60) / 60

/** 0,33 -> "+20 min", -1,5 -> "−1 h 30 min" */
function differenzText(h: number) {
  const min = Math.round(Math.abs(h) * 60)
  if (min === 0) return '±0 min'
  return `${h > 0 ? '+' : '−'}${min < 60 ? `${min} min` : stundenText(min / 60)}`
}

export default function SchlafVerlauf({ schlaf, ziel }: { schlaf: Schlaf[]; ziel: number }) {
  const [zeitraum, setZeitraum] = useState<ZeitraumLabel>('3M')
  const ab = zeitraumAb(zeitraum)

  // Einzelne Nächte schwanken stark. Deshalb zusätzlich eine ruhige Trendlinie:
  // Ø aller Nächte der letzten 7 Tage. Sie wird über alle Daten berechnet, damit sie
  // auch am Anfang des Zeitraums schon die Nächte davor mitzählt.
  const alle = [...schlaf].sort((a, b) => a.datum.localeCompare(b.datum))
  const mitTrend = alle.map((s, i) => {
    const fensterAb = tagPlus(s.datum, -6)
    const fenster: number[] = []
    for (let j = i; j >= 0 && alle[j].datum >= fensterAb; j--) fenster.push(alle[j].stunden)
    return { ...s, trend: aufMinuten(mittel(fenster)!) }
  })

  // x = Tage seit der ersten Nacht im Zeitraum -> echte Zeitachse (Lücken bleiben sichtbar)
  const imZeitraum = mitTrend.filter((s) => s.datum >= ab)
  const erster = imZeitraum[0]
  const daten = imZeitraum.map((s) => ({ ...s, x: tageZwischen(erster.datum, s.datum) }))

  // Kennzahlen für den Zeitraum
  const stunden = imZeitraum.map((s) => s.stunden)
  const schnitt = mittel(stunden)
  // Veränderung: Ø der ersten 7 Nächte gegen Ø der letzten 7 (bei wenigen Nächten je ein Drittel)
  const k = Math.max(1, Math.min(7, Math.floor(stunden.length / 3)))
  const vorher = mittel(stunden.slice(0, k))
  const nachher = mittel(stunden.slice(-k))
  const differenz = stunden.length >= 2 && vorher !== null && nachher !== null ? nachher - vorher : null
  // Mehr Schlaf = grün. Weniger nur orange, wenn du damit unter deinem Ziel liegst.
  const diffFarbe =
    differenz === null || Math.abs(differenz) < 5 / 60 ? '#fff' : differenz > 0 ? '#30d158' : nachher! < ziel ? '#ff9f0a' : '#fff'
  const erreicht = stunden.filter((h) => h >= ziel).length
  const qualitaet = mittel(imZeitraum.map((s) => s.qualitaet).filter((q): q is number => q !== undefined))

  // y-Achse in 2-Stunden-Schritten (4 h, 6 h, 8 h …), das Ziel ist immer mit im Bild.
  // Der Trend zählt mit, weil er auch Nächte vor dem Zeitraum enthält und sonst unten/oben rausragen könnte.
  const yAlle = [...stunden, ...daten.map((d) => d.trend), ziel]
  const unten = Math.max(0, Math.floor((Math.min(...yAlle) - 0.25) / 2) * 2)
  const oben = Math.ceil((Math.max(...yAlle) + 0.25) / 2) * 2
  const yWerte = Array.from({ length: (oben - unten) / 2 + 1 }, (_, i) => unten + 2 * i)
  // Bei vielen Nächten würden die Punkte zu einem Brei verschwimmen -> nur die dünne Linie
  const mitPunkten = daten.length <= 100
  // Ab gut einem halben Jahr Monat + Jahr an die x-Achse ("Okt. 25"), sonst stünde bei 1J z. B. zweimal "4.10." da.
  // Die längeren Beschriftungen dann gleichmäßig verteilen, damit sie nicht aneinanderstoßen.
  const spanne = daten[daten.length - 1]?.x ?? 0
  const xTicks = spanne > 200 ? [0, 1, 2, 3].map((i) => Math.round((spanne * i) / 3)) : undefined
  const xText = (x: number) => {
    const tag = tagPlus(erster.datum, x)
    return spanne > 200
      ? new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      : kurzDatum(tag).replace(/^\w+\.,\s*/, '')
  }

  return (
    <Karte
      titel="Verlauf"
      akzent={FARBE}
      rechts={
        imZeitraum.length > 0 && (
          <span className="text-[12px] text-grau">
            {imZeitraum.length} {imZeitraum.length === 1 ? 'Nacht' : 'Nächte'}
          </span>
        )
      }
    >
      <ZeitraumWahl wert={zeitraum} onWahl={setZeitraum} />

      {daten.length >= 2 && schnitt !== null ? (
        <>
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <span className="text-grau">
              Ø <b className="text-white">{stundenText(aufMinuten(schnitt))}</b>
            </span>
            <span className="text-grau">
              Veränderung <b style={{ color: diffFarbe }}>{differenz === null ? '–' : differenzText(differenz)}</b>
            </span>
            <span className="text-grau">
              Ziel erreicht <b className="text-white">{Math.round((100 * erreicht) / stunden.length)} %</b>
            </span>
            {qualitaet !== null && (
              <span className="flex items-center gap-1 text-grau">
                Qualität <b className="text-white">{zahl(qualitaet)}</b>
                <Star size={12} color="#ffd60a" fill="#ffd60a" />
              </span>
            )}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daten} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickCount={4}
                  ticks={xTicks}
                  allowDecimals={false}
                  tickFormatter={(x) => xText(Number(x))}
                  {...achse}
                />
                <YAxis domain={[unten, oben]} ticks={yWerte} tickFormatter={(v) => `${v} h`} {...achse} width={44} />
                <Tooltip
                  contentStyle={tooltipStil}
                  formatter={(v, name) => [stundenText(aufMinuten(Number(v))), name]}
                  labelFormatter={(_, p) => (p?.[0]?.payload?.datum ? kurzDatum(p[0].payload.datum) : '')}
                />
                <ReferenceLine y={ziel} stroke="#8e8e93" strokeDasharray="4 4" />
                {/* Einzelne Nächte: dünn und blass */}
                <Line
                  type="linear"
                  dataKey="stunden"
                  name="Nacht"
                  stroke={FARBE}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  dot={mitPunkten ? { r: 2, fill: FARBE, fillOpacity: 0.7, strokeWidth: 0 } : false}
                  activeDot={{ r: 3 }}
                />
                {/* Trend (Ø 7 Tage): die kräftige Linie */}
                <Line type="monotone" dataKey="trend" name="Ø 7 Tage" stroke={FARBE} strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-[12px] text-grau">
            <span className="flex items-center gap-1.5">
              <span className={mitPunkten ? 'h-1.5 w-1.5 rounded-full' : 'h-px w-4'} style={{ background: FARBE, opacity: 0.7 }} /> Nacht
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ background: FARBE }} /> Ø 7 Tage
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-grau" /> Ziel {zahl(ziel)} h
            </span>
          </div>
        </>
      ) : (
        <p className="text-[14px] text-grau">
          {schlaf.length === 0 ? 'Noch keine Schlafdaten.' : 'Zu wenige Nächte in diesem Zeitraum.'} Trag deinen Schlaf ein oder importiere ihn aus Apple Health.
        </p>
      )}
    </Karte>
  )
}
