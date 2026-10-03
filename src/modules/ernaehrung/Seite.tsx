// Bereich "Ernährung": Mahlzeiten mit einfacher Bewertung (ohne Kalorien) und Wasser-Zähler.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GlassWater, Minus, Plus } from 'lucide-react'
import { db, type Bewertung } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, neueId } from '../../core/datum'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import { Leer, LoeschKnopf } from '../../core/ui/Formular'

const FARBE = '#a3e635'
const WASSER_ZIEL = 8
const BEWERTUNG: Record<Bewertung, { emoji: string; farbe: string }> = {
  gesund: { emoji: '🥦', farbe: '#30d158' },
  okay: { emoji: '🍝', farbe: '#ffd60a' },
  ungesund: { emoji: '🍟', farbe: '#ff453a' },
}
const VORSCHLAEGE = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

export default function ErnaehrungSeite() {
  const tag = heute()
  const wasser = useLiveQuery(() => db.wasser.get(tag), [tag])
  const mahlzeiten = useLiveQuery(() => db.mahlzeiten.toArray(), []) ?? []
  const [name, setName] = useState('')

  const glaeser = wasser?.glaeser ?? 0
  const heutige = mahlzeiten.filter((m) => m.datum === tag)
  const tage7 = letzteTage(7)
  const woche = mahlzeiten.filter((m) => tage7.includes(m.datum))
  const anteilGesund = woche.length ? Math.round((woche.filter((m) => m.bewertung === 'gesund').length / woche.length) * 100) : null

  /** Ein Tap auf eine Bewertung speichert die Mahlzeit sofort. */
  async function speichere(bewertung: Bewertung) {
    await db.mahlzeiten.add({ id: neueId(), datum: tag, name: name.trim() || 'Mahlzeit', bewertung })
    setName('')
  }

  return (
    <Seite titel="Ernährung" farbe={FARBE}>
      {/* Wasser */}
      <Karte titel="Wasser" akzent="#64d2ff" rechts={<span className="text-[13px] text-grau">{glaeser} / {WASSER_ZIEL} Gläser</span>}>
        <div className="mb-3 flex justify-between">
          {Array.from({ length: WASSER_ZIEL }, (_, i) => (
            <GlassWater key={i} size={30} color={i < glaeser ? '#64d2ff' : '#3a3a3c'} fill={i < glaeser ? '#64d2ff55' : 'transparent'} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => db.wasser.put({ datum: tag, glaeser: Math.max(0, glaeser - 1) })} className="tippbar flex h-12 w-14 items-center justify-center rounded-2xl bg-karte2" aria-label="Ein Glas weniger">
            <Minus size={20} />
          </button>
          <button onClick={() => db.wasser.put({ datum: tag, glaeser: glaeser + 1 })} className="tippbar flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#64d2ff] text-[16px] font-semibold text-black">
            <Plus size={20} /> Glas Wasser
          </button>
        </div>
      </Karte>

      {/* Mahlzeit eintragen */}
      <Karte titel="Mahlzeit eintragen" akzent={FARBE}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Was hast du gegessen? (optional)"
          className="mb-2 h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
        />
        <div className="mb-3 flex flex-wrap gap-2">
          {VORSCHLAEGE.map((v) => (
            <button key={v} onClick={() => setName(v)} className="tippbar min-h-9 rounded-full bg-karte2 px-3 text-[14px]" style={{ color: name === v ? FARBE : '#fff' }}>
              {v}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[13px] text-grau">Wie war’s? (ein Tap speichert)</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BEWERTUNG) as Bewertung[]).map((b) => (
            <button
              key={b}
              onClick={() => speichere(b)}
              className="tippbar flex h-20 flex-col items-center justify-center gap-1 rounded-2xl"
              style={{ background: BEWERTUNG[b].farbe + '26' }}
            >
              <span className="text-[28px]">{BEWERTUNG[b].emoji}</span>
              <span className="text-[14px] font-semibold capitalize" style={{ color: BEWERTUNG[b].farbe }}>
                {b}
              </span>
            </button>
          ))}
        </div>
      </Karte>

      {/* Heute */}
      <Karte titel="Heute">
        {heutige.length === 0 ? (
          <Leer>Heute noch nichts eingetragen.</Leer>
        ) : (
          <ul>
            {heutige.map((m) => (
              <li key={m.id} className="flex min-h-12 items-center gap-3">
                <span className="text-[22px]">{BEWERTUNG[m.bewertung].emoji}</span>
                <span className="flex-1 text-[16px]">{m.name}</span>
                <span className="text-[13px]" style={{ color: BEWERTUNG[m.bewertung].farbe }}>
                  {m.bewertung}
                </span>
                <LoeschKnopf frage="Mahlzeit löschen?" onLoeschen={() => db.mahlzeiten.delete(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {/* Woche: pro Tag ein Punkt je Mahlzeit in der Farbe der Bewertung */}
      <Karte titel="Letzte 7 Tage" rechts={anteilGesund !== null && <span className="text-[13px] text-grau">{anteilGesund} % gesund</span>}>
        <div className="flex justify-between">
          {tage7.map((t) => (
            <div key={t} className="flex w-10 flex-col items-center gap-1">
              <div className="flex min-h-16 flex-col-reverse items-center gap-1">
                {mahlzeiten
                  .filter((m) => m.datum === t)
                  .map((m) => (
                    <span key={m.id} className="h-3 w-3 rounded-full" style={{ background: BEWERTUNG[m.bewertung].farbe }} />
                  ))}
              </div>
              <span className="text-[11px] text-grau">{kurzerWochentag(t)}</span>
            </div>
          ))}
        </div>
      </Karte>
    </Seite>
  )
}
