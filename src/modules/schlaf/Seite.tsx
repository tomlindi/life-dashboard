// Bereich "Schlaf": letzte Nacht, Ziel, Diagramm, Verlauf, Wochendurchschnitte, Qualität 1–5.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus, Star } from 'lucide-react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { db, type Schlaf } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, tagPlus } from '../../core/datum'
import { kurzDatum, mittel, zahl } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Sheet from '../../core/ui/Sheet'
import { Eingabe, Knopf, Label, Leer } from '../../core/ui/Formular'
import SchlafVerlauf from './Verlauf'

const FARBE = '#5e5ce6'

/** 7,5 -> "7 h 30 min" */
export const stundenText = (h: number) => {
  const std = Math.floor(h)
  const min = Math.round((h - std) * 60)
  return min ? `${std} h ${min} min` : `${std} h`
}

/** Fünf Sterne zum Antippen. */
function Sterne({ wert, onWahl, groesse = 22 }: { wert?: number; onWahl: (w: number) => void; groesse?: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onWahl(n)} className="tippbar p-1" aria-label={`Qualität ${n} von 5`}>
          <Star size={groesse} color="#ffd60a" fill={wert && n <= wert ? '#ffd60a' : 'transparent'} />
        </button>
      ))}
    </div>
  )
}

function SchlafFormular({ offen, onZu, vorhanden }: { offen: boolean; onZu: () => void; vorhanden: Schlaf[] }) {
  const [datum, setDatum] = useState(heute())
  const [stunden, setStunden] = useState(8)
  const [qualitaet, setQualitaet] = useState<number | undefined>(3)

  // Gibt es für den Tag schon einen Eintrag (z. B. aus Health)? Dann seine Werte vorbelegen.
  useEffect(() => {
    const e = vorhanden.find((s) => s.datum === datum)
    if (offen && e) {
      setStunden(e.stunden)
      setQualitaet(e.qualitaet)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei Datumswechsel/Öffnen
  }, [datum, offen])

  async function speichern() {
    const alt = vorhanden.find((s) => s.datum === datum)
    await db.schlaf.put({ datum, stunden, qualitaet, quelle: alt?.quelle ?? 'manuell' })
    onZu()
  }

  return (
    <Sheet titel="Schlaf eintragen" offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe label="Aufgewacht am" type="date" value={datum} max={heute()} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <Label>Dauer</Label>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-karte2 p-2">
        <button onClick={() => setStunden((s) => Math.max(0, s - 0.25))} className="tippbar flex h-12 w-12 items-center justify-center rounded-full bg-black/40" aria-label="15 Minuten weniger">
          <Minus size={20} />
        </button>
        <span className="text-[24px] font-bold" style={{ color: FARBE }}>
          {stundenText(stunden)}
        </span>
        <button onClick={() => setStunden((s) => Math.min(16, s + 0.25))} className="tippbar flex h-12 w-12 items-center justify-center rounded-full bg-black/40" aria-label="15 Minuten mehr">
          <Plus size={20} />
        </button>
      </div>
      <Label>Wie gut hast du geschlafen?</Label>
      <div className="mb-5">
        <Sterne wert={qualitaet} onWahl={setQualitaet} groesse={32} />
      </div>
      <Knopf farbe={FARBE} onClick={speichern}>
        Speichern
      </Knopf>
    </Sheet>
  )
}

export default function SchlafSeite() {
  const schlaf = useLiveQuery(() => db.schlaf.orderBy('datum').reverse().toArray(), []) ?? []
  const [ziel, setZiel] = useEinstellung<number>('schlafZiel', 8)
  const [formularOffen, setFormularOffen] = useState(false)

  const letzteNacht = schlaf.find((s) => s.datum === heute()) ?? schlaf.find((s) => s.datum === tagPlus(heute(), -1))
  const nach = new Map(schlaf.map((s) => [s.datum, s]))

  // Diagramm: letzte 14 Nächte
  const daten = letzteTage(14).map((tag) => ({ tag, name: kurzerWochentag(tag).slice(0, 2), stunden: nach.get(tag)?.stunden ?? 0 }))

  // Durchschnitt je Woche: Blöcke à 7 Tage, die jüngste Woche zuerst
  const wochen = [0, 1, 2, 3].map((w) => {
    const ende = tagPlus(heute(), -7 * w)
    const tage = Array.from({ length: 7 }, (_, i) => tagPlus(ende, -i))
    const werte = tage.map((t) => nach.get(t)?.stunden).filter((x): x is number => x !== undefined)
    return { label: w === 0 ? 'Letzte 7 Tage' : `Vor ${w} ${w === 1 ? 'Woche' : 'Wochen'}`, schnitt: mittel(werte), anzahl: werte.length }
  })

  return (
    <Seite titel="Schlaf" farbe={FARBE}>
      <Karte titel="Letzte Nacht" akzent={FARBE}>
        {letzteNacht ? (
          <div className="flex items-center gap-5">
            <Ring fortschritt={letzteNacht.stunden / ziel} farbe={FARBE} groesse={112} dicke={14}>
              <div>
                <p className="text-[24px] font-bold leading-none">{zahl(letzteNacht.stunden)}</p>
                <p className="mt-0.5 text-[11px] text-grau">Stunden</p>
              </div>
            </Ring>
            <div>
              <p className="text-[15px]">{stundenText(letzteNacht.stunden)}</p>
              <p className="mb-1 text-[13px] text-grau">Ziel: {stundenText(ziel)}</p>
              <Sterne wert={letzteNacht.qualitaet} onWahl={(q) => db.schlaf.update(letzteNacht.datum, { qualitaet: q })} />
            </div>
          </div>
        ) : (
          <Leer>Noch kein Eintrag für letzte Nacht.</Leer>
        )}
      </Karte>

      <button onClick={() => setFormularOffen(true)} className="tippbar flex h-14 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold" style={{ background: FARBE }}>
        <Plus size={22} /> Schlaf eintragen
      </button>

      <Karte titel="Letzte 14 Nächte" akzent={FARBE} rechts={<span className="text-[12px] text-grau">Ziel {zahl(ziel)} h</span>}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daten} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <Tooltip
                cursor={false}
                contentStyle={{ background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }}
                formatter={(v) => [stundenText(Number(v)), 'Schlaf']}
                labelFormatter={() => ''}
              />
              <ReferenceLine y={ziel} stroke="#8e8e93" strokeDasharray="4 4" />
              <Bar dataKey="stunden" radius={[5, 5, 5, 5]} minPointSize={3}>
                {daten.map((d) => (
                  <Cell key={d.tag} fill={d.stunden === 0 ? '#38383a' : d.stunden >= ziel ? FARBE : '#3a3990'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Karte>

      <SchlafVerlauf schlaf={schlaf} ziel={ziel} />

      <Karte titel="Durchschnitt pro Woche">
        <ul className="space-y-2">
          {wochen.map((w) => (
            <li key={w.label} className="flex items-center justify-between">
              <span className="text-[15px]">{w.label}</span>
              <span className="text-[15px] font-semibold" style={{ color: w.schnitt !== null && w.schnitt >= ziel ? FARBE : '#fff' }}>
                {w.schnitt === null ? '–' : stundenText(Math.round(w.schnitt * 4) / 4)}
                <span className="ml-1 text-[12px] font-normal text-grau">({w.anzahl} Nächte)</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-linie pt-3">
          <span className="text-[15px]">Schlafziel</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setZiel(Math.max(5, ziel - 0.5))} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-karte2" aria-label="Ziel verringern">
              <Minus size={18} />
            </button>
            <span className="w-12 text-center text-[17px] font-semibold">{zahl(ziel)} h</span>
            <button onClick={() => setZiel(Math.min(12, ziel + 0.5))} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-karte2" aria-label="Ziel erhöhen">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </Karte>

      <Karte titel="Nächte bewerten">
        {schlaf.length === 0 ? (
          <Leer>Noch keine Schlafdaten. Trag sie ein oder importiere sie aus Apple Health.</Leer>
        ) : (
          <ul>
            {schlaf.slice(0, 14).map((s, i) => (
              <li key={s.datum} className={`flex min-h-12 items-center gap-2 ${i > 0 ? 'border-t border-linie' : ''}`}>
                <div className="flex-1">
                  <p className="text-[15px]">{kurzDatum(s.datum)}</p>
                  <p className="text-[12px] text-grau">
                    {stundenText(s.stunden)} · {s.quelle === 'health' ? 'Health' : 'manuell'}
                  </p>
                </div>
                <Sterne wert={s.qualitaet} onWahl={(q) => db.schlaf.update(s.datum, { qualitaet: q })} groesse={18} />
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <SchlafFormular offen={formularOffen} onZu={() => setFormularOffen(false)} vorhanden={schlaf} />
    </Seite>
  )
}
