// Bereich "Gewohnheiten": Habits abhaken, Streak (Tage in Folge) und die letzten 7 Tage,
// darunter die Entwicklung über Wochen und Monate (Verlauf.tsx).
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame } from 'lucide-react'
import { db } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, neueId } from '../../core/datum'
import { streak } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Sheet from '../../core/ui/Sheet'
import { Eingabe, Knopf, Label, Leer, LoeschKnopf, PlusKnopf } from '../../core/ui/Formular'
import EntwicklungKarte from './Verlauf'

const FARBE = '#30d158'
const EMOJIS = ['📚', '🧘', '🏃', '💧', '🗣️', '⏰', '🦷', '📵', '🥗', '✍️', '🎸', '😴']

export default function GewohnheitenSeite() {
  const habits = useLiveQuery(() => db.habits.orderBy('sortierung').toArray(), []) ?? []
  const eintraege = useLiveQuery(() => db.habitEintraege.toArray(), []) ?? []
  const [neuOffen, setNeuOffen] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])

  const tage7 = letzteTage(7)
  const tage30 = letzteTage(30)
  /** Alle Tage, an denen ein Habit abgehakt wurde, als Set (schnelles Nachschauen). */
  const tageVon = (habitId: string) => new Set(eintraege.filter((e) => e.habitId === habitId).map((e) => e.datum))

  async function umschalten(habitId: string, tag: string, erledigt: boolean) {
    if (erledigt) await db.habitEintraege.delete([habitId, tag])
    else await db.habitEintraege.put({ habitId, datum: tag })
  }

  async function anlegen() {
    if (!name.trim()) return
    await db.habits.add({ id: neueId(), name: name.trim(), emoji, sortierung: habits.length + 1 })
    setName('')
    setNeuOffen(false)
  }

  return (
    <Seite titel="Gewohnheiten" farbe={FARBE}>
      <Karte titel="Deine Habits" akzent={FARBE} rechts={<PlusKnopf farbe={FARBE} onClick={() => setNeuOffen(true)} label="Habit" />}>
        {habits.length === 0 ? (
          <Leer>Noch keine Gewohnheiten. Leg eine an, z. B. „10 Seiten lesen“.</Leer>
        ) : (
          <ul className="space-y-3">
            {habits.map((h) => {
              const tage = tageVon(h.id)
              const s = streak(tage)
              const quote = Math.round((tage30.filter((t) => tage.has(t)).length / 30) * 100)
              const heuteErledigt = tage.has(heute())
              return (
                <li key={h.id} className="rounded-2xl bg-karte2 p-3">
                  <div className="flex items-center gap-3">
                    {/* Großer Knopf zum Abhaken für heute */}
                    <button
                      onClick={() => umschalten(h.id, heute(), heuteErledigt)}
                      className="tippbar flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[26px]"
                      style={{ background: heuteErledigt ? FARBE : '#3a3a3c' }}
                      aria-label={`${h.name} heute ${heuteErledigt ? 'nicht erledigt' : 'erledigt'}`}
                    >
                      {heuteErledigt ? '✓' : h.emoji}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-semibold">{h.name}</p>
                      <p className="flex items-center gap-1 text-[13px] text-grau">
                        <Flame size={14} color={s > 0 ? '#ff9f0a' : '#8e8e93'} />
                        {s} {s === 1 ? 'Tag' : 'Tage'} in Folge · {quote} % in 30 Tagen
                      </p>
                    </div>
                    <LoeschKnopf
                      frage={`Habit „${h.name}“ mit allen Haken löschen?`}
                      onLoeschen={() =>
                        db.transaction('rw', db.habits, db.habitEintraege, async () => {
                          await db.habitEintraege.filter((e) => e.habitId === h.id).delete()
                          await db.habits.delete(h.id)
                        })
                      }
                    />
                  </div>
                  {/* Die letzten 7 Tage: antippen, um nachträglich abzuhaken */}
                  <div className="mt-3 flex justify-between">
                    {tage7.map((tag) => {
                      const an = tage.has(tag)
                      return (
                        <button key={tag} onClick={() => umschalten(h.id, tag, an)} className="tippbar flex flex-col items-center gap-1">
                          <span className="text-[11px] text-grau">{kurzerWochentag(tag)}</span>
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-black"
                            style={{ background: an ? FARBE : '#3a3a3c', outline: tag === heute() ? '2px solid #fff' : 'none' }}
                          >
                            {an ? '✓' : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      <EntwicklungKarte habits={habits} eintraege={eintraege} />

      <Sheet titel="Neue Gewohnheit" offen={neuOffen} onZu={() => setNeuOffen(false)}>
        <div className="mb-4">
          <Eingabe label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. 10 Seiten lesen" autoFocus />
        </div>
        <Label>Symbol</Label>
        <div className="mb-5 grid grid-cols-6 gap-2">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={`tippbar h-12 rounded-xl text-[24px] ${emoji === e ? 'bg-white/20 ring-2 ring-white/60' : 'bg-karte2'}`}>
              {e}
            </button>
          ))}
        </div>
        <Knopf farbe={FARBE} onClick={anlegen} deaktiviert={!name.trim()}>
          Anlegen
        </Knopf>
      </Sheet>
    </Seite>
  )
}
