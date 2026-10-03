// Zwei Säulendiagramme (mit Recharts): Workout-Minuten und Schritte der letzten 7 Tage.
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, tagVon } from '../../core/datum'
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
export function GewichtKarte() {
  const werte = useLiveQuery(() => db.gewicht.orderBy('datum').toArray(), []) ?? []
  const letzte = werte.slice(-30).map((g) => ({ ...g, name: kurzDatum(g.datum) }))
  const aktuell = werte[werte.length - 1]
  return (
    <Karte
      titel="Gewicht"
      akzent="#64d2ff"
      rechts={aktuell && <span className="text-[15px] font-semibold">{zahl(aktuell.kg)} kg</span>}
    >
      {letzte.length >= 2 && (
        <div className="mb-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={letzte} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip contentStyle={tooltipStil} formatter={(v) => [`${zahl(Number(v))} kg`, 'Gewicht']} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''} />
              <Line type="monotone" dataKey="kg" stroke="#64d2ff" strokeWidth={3} dot={{ r: 3, fill: '#64d2ff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
  const [SCHRITTE_ZIEL, setZiel] = useSchrittziel()
  const daten = tage.map((tag) => ({
    tag,
    name: kurzerWochentag(tag),
    schritte: schritte?.find((s) => s.datum === tag)?.anzahl ?? 0,
  }))
  const schnitt = Math.round(daten.reduce((s, d) => s + d.schritte, 0) / 7)
  // Ziel in 500er-Schritten ändern
  const zielKnopf = (delta: number, symbol: string) => (
    <button
      onClick={() => setZiel(Math.min(30000, Math.max(1000, SCHRITTE_ZIEL + delta)))}
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
          Ziel {SCHRITTE_ZIEL.toLocaleString('de-DE')}
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
            <ReferenceLine y={SCHRITTE_ZIEL} stroke="#8e8e93" strokeDasharray="4 4" />
            <Bar dataKey="schritte" radius={[6, 6, 6, 6]} minPointSize={3}>
              {daten.map((d) => (
                // Heute und Tage über dem Ziel kräftig, die anderen etwas dunkler
                <Cell key={d.tag} fill={d.schritte >= SCHRITTE_ZIEL || d.tag === heute() ? '#30d158' : '#1f7a3a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Karte>
  )
}
