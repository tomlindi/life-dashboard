// Schnell-Eintrag: Stimmung, Wasser und Notiz mit je 1–2 Taps.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus, Send } from 'lucide-react'
import { db } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import Karte from '../../core/ui/Karte'

const EMOJIS = ['😞', '😕', '😐', '🙂', '😄']
const WASSER_ZIEL = 8

export default function SchnellEintrag() {
  const tag = heute()
  // useLiveQuery: Die Anzeige aktualisiert sich automatisch, sobald sich die Datenbank ändert.
  const stimmung = useLiveQuery(() => db.stimmung.get(tag), [tag])
  const wasser = useLiveQuery(() => db.wasser.get(tag), [tag])
  const notizen = useLiveQuery(() => db.notizen.where('datum').equals(tag).toArray(), [tag])
  const [text, setText] = useState('')

  const gläser = wasser?.glaeser ?? 0

  async function setzeStimmung(wert: number) {
    // "put" überschreibt den Eintrag von heute (oder legt ihn neu an). Tagebuchtext bleibt erhalten.
    await db.stimmung.put({ datum: tag, wert, text: stimmung?.text })
  }

  async function aendereWasser(delta: number) {
    await db.wasser.put({ datum: tag, glaeser: Math.max(0, gläser + delta) })
  }

  async function speichereNotiz() {
    const t = text.trim()
    if (!t) return
    await db.notizen.add({ id: neueId(), datum: tag, text: t, erstellt: new Date().toISOString() })
    setText('')
  }

  return (
    <Karte titel="Schnell-Eintrag">
      {/* Stimmung */}
      <p className="mb-2 text-[13px] text-grau">Wie fühlst du dich?</p>
      <div className="mb-4 flex justify-between">
        {EMOJIS.map((e, i) => (
          <button
            key={e}
            onClick={() => setzeStimmung(i + 1)}
            className={`tippbar flex h-14 w-14 items-center justify-center rounded-2xl text-[28px] ${
              stimmung?.wert === i + 1 ? 'bg-white/20 ring-2 ring-white/60' : 'bg-karte2'
            }`}
            aria-label={`Stimmung ${i + 1} von 5`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Wasser */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-karte2 p-3">
        <div>
          <p className="text-[13px] text-grau">Wasser</p>
          <p className="text-[20px] font-semibold text-[#64d2ff]">
            {gläser} <span className="text-[14px] font-normal text-grau">/ {WASSER_ZIEL} Gläser</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => aendereWasser(-1)} className="tippbar flex h-12 w-12 items-center justify-center rounded-full bg-black/40" aria-label="Ein Glas weniger">
            <Minus size={20} />
          </button>
          <button onClick={() => aendereWasser(1)} className="tippbar flex h-12 w-12 items-center justify-center rounded-full bg-[#64d2ff] text-black" aria-label="Ein Glas mehr">
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Notiz */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          speichereNotiz()
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kurze Notiz …"
          className="h-12 min-w-0 flex-1 rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
        />
        <button type="submit" className="tippbar flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0a84ff]" aria-label="Notiz speichern">
          <Send size={20} />
        </button>
      </form>
      {notizen && notizen.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {notizen.map((n) => (
            <li key={n.id} className="text-[14px] text-white/80">
              • {n.text}
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
