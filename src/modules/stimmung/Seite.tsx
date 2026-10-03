// Bereich "Stimmung & Tagebuch": Eintrag für einen Tag, Verlauf als Diagramm und Kalender zum Zurückblättern.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../core/db'
import { heute, langesDatum, letzteTage } from '../../core/datum'
import { mittel, zahl } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'

const FARBE = '#ac8e68'
export const EMOJIS = ['😞', '😕', '😐', '🙂', '😄']
export const STIMMUNGS_FARBEN = ['#ff453a', '#ff9f0a', '#ffd60a', '#a3e635', '#30d158'] // 1 bis 5
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Editor für einen Tag: Emoji wählen + kurzer Text. */
function TagEditor({ tag }: { tag: string }) {
  const eintrag = useLiveQuery(() => db.stimmung.get(tag), [tag])
  const [text, setText] = useState('')
  const [gespeichert, setGespeichert] = useState(false)

  // Wenn ein anderer Tag gewählt wird: dessen Text ins Feld laden
  useEffect(() => {
    setText(eintrag?.text ?? '')
  }, [tag, eintrag?.text])
  useEffect(() => setGespeichert(false), [tag])

  async function speichereText() {
    // Ohne Stimmung speichern wir 3 (neutral) als Startwert
    await db.stimmung.put({ datum: tag, wert: eintrag?.wert ?? 3, text: text.trim() || undefined })
    setGespeichert(true)
  }

  return (
    <Karte titel={tag === heute() ? 'Heute' : langesDatum(new Date(tag + 'T12:00:00'))} akzent={FARBE}>
      <div className="mb-4 flex justify-between">
        {EMOJIS.map((e, i) => (
          <button
            key={e}
            onClick={() => db.stimmung.put({ datum: tag, wert: i + 1, text: eintrag?.text })}
            className={`tippbar flex h-14 w-14 items-center justify-center rounded-2xl text-[28px] ${
              eintrag?.wert === i + 1 ? 'ring-2 ring-white/70' : ''
            }`}
            style={{ background: eintrag?.wert === i + 1 ? STIMMUNGS_FARBEN[i] + '55' : '#2c2c2e' }}
            aria-label={`Stimmung ${i + 1} von 5`}
          >
            {e}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setGespeichert(false)
        }}
        placeholder="Wie war dein Tag? Was war schön, was nicht?"
        rows={4}
        className="w-full resize-none rounded-2xl bg-karte2 p-4 leading-snug outline-none placeholder:text-grau"
      />
      <button
        onClick={speichereText}
        disabled={text === (eintrag?.text ?? '')}
        className="tippbar mt-2 min-h-12 w-full rounded-2xl text-[16px] font-semibold text-black disabled:opacity-40"
        style={{ background: FARBE }}
      >
        {gespeichert ? 'Gespeichert ✓' : 'Eintrag speichern'}
      </button>
    </Karte>
  )
}

export default function StimmungSeite() {
  const alle = useLiveQuery(() => db.stimmung.toArray(), []) ?? []
  const [gewaehlt, setGewaehlt] = useState(heute())
  // Angezeigter Monat im Kalender (Jahr + Monat 0–11)
  const [monat, setMonat] = useState(() => ({ jahr: new Date().getFullYear(), monat: new Date().getMonth() }))

  const nach = new Map(alle.map((s) => [s.datum, s]))

  // Diagramm: letzte 30 Tage (Tage ohne Eintrag bleiben leer, die Linie verbindet sie trotzdem)
  const daten = letzteTage(30).map((t) => ({ tag: t, name: String(Number(t.slice(8))), wert: nach.get(t)?.wert ?? null }))
  const schnitt = mittel(daten.map((d) => d.wert).filter((w): w is number => w !== null))

  // Kalender: alle Tage des Monats, vorne aufgefüllt bis Montag
  const ersterTag = new Date(monat.jahr, monat.monat, 1)
  const tageImMonat = new Date(monat.jahr, monat.monat + 1, 0).getDate()
  const leerVorne = (ersterTag.getDay() + 6) % 7 // Montag = 0
  const zellen: (string | null)[] = [
    ...Array<null>(leerVorne).fill(null),
    ...Array.from({ length: tageImMonat }, (_, i) => `${monat.jahr}-${String(monat.monat + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]
  const blaettern = (n: number) => setMonat(({ jahr, monat: m }) => ({ jahr: m + n < 0 ? jahr - 1 : m + n > 11 ? jahr + 1 : jahr, monat: (m + n + 12) % 12 }))

  return (
    <Seite titel="Stimmung" farbe={FARBE}>
      <TagEditor tag={gewaehlt} />

      <Karte titel="Letzte 30 Tage" akzent={FARBE} rechts={schnitt !== null && <span className="text-[13px] text-grau">Ø {zahl(schnitt)}</span>}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daten} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid stroke="#38383a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tickFormatter={(v) => EMOJIS[v - 1]} tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }}
                formatter={(v) => [EMOJIS[Number(v) - 1], 'Stimmung']}
                labelFormatter={() => ''}
              />
              <Line type="monotone" dataKey="wert" stroke={FARBE} strokeWidth={3} dot={{ r: 3, fill: FARBE }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Karte>

      <Karte>
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => blaettern(-1)} className="tippbar flex h-11 w-11 items-center justify-center rounded-full bg-karte2" aria-label="Vorheriger Monat">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-[17px] font-semibold">{ersterTag.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => blaettern(1)} className="tippbar flex h-11 w-11 items-center justify-center rounded-full bg-karte2" aria-label="Nächster Monat">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WOCHENTAGE.map((w) => (
            <span key={w} className="text-[11px] text-grau">
              {w}
            </span>
          ))}
          {zellen.map((tag, i) => {
            if (!tag) return <span key={`leer-${i}`} />
            const e = nach.get(tag)
            const zukunft = tag > heute()
            return (
              <button
                key={tag}
                disabled={zukunft}
                onClick={() => setGewaehlt(tag)}
                className="tippbar flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] disabled:opacity-30"
                style={{
                  background: e ? STIMMUNGS_FARBEN[e.wert - 1] + '40' : '#2c2c2e',
                  outline: tag === gewaehlt ? '2px solid #fff' : 'none',
                }}
              >
                <span className={tag === heute() ? 'font-bold' : ''}>{Number(tag.slice(8))}</span>
                {e && <span className="text-[14px] leading-none">{EMOJIS[e.wert - 1]}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-[12px] text-grau">Tippe auf einen Tag, um ihn anzusehen oder nachzutragen.</p>
      </Karte>
    </Seite>
  )
}
