// Bereich "Hobbys": investierte Zeit (schnell per +15/+30/+60 Min) und Ziele pro Hobby.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown } from 'lucide-react'
import { db } from '../../core/db'
import { heute, neueId, wochenStart } from '../../core/datum'
import { kurzDatum, zahl } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Sheet from '../../core/ui/Sheet'
import { Balken, Eingabe, Knopf, Label, Leer, LoeschKnopf, PlusKnopf } from '../../core/ui/Formular'

const FARBE = '#ffd60a'
const EMOJIS = ['🎸', '🎮', '🎨', '📷', '⚽', '🏀', '🎹', '📖', '💻', '🧩', '🛹', '🎤']
const ZIEL_OPTIONEN = [0, 60, 120, 180, 300, 420]

/** 90 -> "1 h 30 min" */
const minutenText = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`)

function HobbyFormular({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [zielMin, setZielMin] = useState(120)
  const [ziel, setZiel] = useState('')

  async function speichern() {
    if (!name.trim()) return
    await db.hobbys.add({ id: neueId(), name: name.trim(), emoji, zielMinWoche: zielMin || undefined, ziel: ziel.trim() || undefined })
    setName('')
    setZiel('')
    onZu()
  }

  return (
    <Sheet titel="Neues Hobby" offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Gitarre" autoFocus />
      </div>
      <Label>Symbol</Label>
      <div className="mb-4 grid grid-cols-6 gap-2">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => setEmoji(e)} className={`tippbar h-12 rounded-xl text-[24px] ${emoji === e ? 'bg-white/20 ring-2 ring-white/60' : 'bg-karte2'}`}>
            {e}
          </button>
        ))}
      </div>
      <Label>Zeit-Ziel pro Woche</Label>
      <div className="mb-4 grid grid-cols-6 gap-1.5">
        {ZIEL_OPTIONEN.map((m) => (
          <button
            key={m}
            onClick={() => setZielMin(m)}
            className="tippbar h-11 rounded-xl text-[13px] font-semibold"
            style={{ background: zielMin === m ? FARBE : '#2c2c2e', color: zielMin === m ? '#000' : '#fff' }}
          >
            {m === 0 ? 'keins' : `${m / 60} h`}
          </button>
        ))}
      </div>
      <div className="mb-5">
        <Eingabe label="Ziel (optional)" value={ziel} onChange={(e) => setZiel(e.target.value)} placeholder="z. B. Wonderwall spielen können" />
      </div>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!name.trim()}>
        Anlegen
      </Knopf>
    </Sheet>
  )
}

export default function HobbysSeite() {
  const hobbys = useLiveQuery(() => db.hobbys.toArray(), []) ?? []
  const zeiten = useLiveQuery(() => db.hobbyZeiten.orderBy('datum').reverse().toArray(), []) ?? []
  const [neuOffen, setNeuOffen] = useState(false)
  const [offen, setOffen] = useState<string | null>(null)

  const start = wochenStart()
  const gesamtWoche = zeiten.filter((z) => z.datum >= start).reduce((s, z) => s + z.minuten, 0)

  return (
    <Seite titel="Hobbys" farbe={FARBE}>
      <Karte>
        <p className="text-[13px] text-grau">Diese Woche in Hobbys investiert</p>
        <p className="text-[36px] font-bold" style={{ color: FARBE }}>
          {minutenText(gesamtWoche)}
        </p>
      </Karte>

      <Karte titel="Deine Hobbys" rechts={<PlusKnopf farbe={FARBE} onClick={() => setNeuOffen(true)} label="Hobby" />}>
        {hobbys.length === 0 ? (
          <Leer>Noch keine Hobbys eingetragen.</Leer>
        ) : (
          <ul className="space-y-3">
            {hobbys.map((h) => {
              const eigene = zeiten.filter((z) => z.hobbyId === h.id)
              const woche = eigene.filter((z) => z.datum >= start).reduce((s, z) => s + z.minuten, 0)
              const gesamt = eigene.reduce((s, z) => s + z.minuten, 0)
              const istOffen = offen === h.id
              return (
                <li key={h.id} className="rounded-2xl bg-karte2 p-3">
                  <button onClick={() => setOffen(istOffen ? null : h.id)} className="tippbar mb-2 flex w-full items-center gap-3 text-left">
                    <span className="text-[28px]">{h.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-semibold">{h.name}</p>
                      <p className="text-[13px] text-grau">
                        {minutenText(woche)}
                        {h.zielMinWoche ? ` von ${minutenText(h.zielMinWoche)}` : ''} diese Woche · gesamt {zahl(gesamt / 60)} h
                      </p>
                    </div>
                    <ChevronDown size={18} className={`text-grau transition-transform ${istOffen ? 'rotate-180' : ''}`} />
                  </button>
                  {h.zielMinWoche ? <Balken wert={woche / h.zielMinWoche} farbe={FARBE} /> : null}
                  {h.ziel && <p className="mt-2 text-[14px]">🎯 {h.ziel}</p>}

                  {/* Schnell Zeit eintragen */}
                  <div className="mt-3 flex gap-2">
                    {[15, 30, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => db.hobbyZeiten.add({ id: neueId(), hobbyId: h.id, datum: heute(), minuten: m })}
                        className="tippbar h-11 flex-1 rounded-xl bg-black/40 text-[15px] font-semibold"
                        style={{ color: FARBE }}
                      >
                        +{m} min
                      </button>
                    ))}
                  </div>

                  {istOffen && (
                    <div className="mt-3 space-y-1">
                      <label className="mb-2 block">
                        <span className="text-[13px] text-grau">Ziel</span>
                        <input
                          defaultValue={h.ziel ?? ''}
                          onBlur={(e) => db.hobbys.update(h.id, { ziel: e.target.value.trim() || undefined })}
                          placeholder="Was willst du erreichen?"
                          className="mt-1 h-11 w-full rounded-xl bg-black/40 px-3 outline-none placeholder:text-grau"
                        />
                      </label>
                      <p className="text-[13px] text-grau">Letzte Einträge</p>
                      {eigene.slice(0, 8).map((z) => (
                        <div key={z.id} className="flex items-center text-[14px]">
                          <span className="flex-1">
                            {kurzDatum(z.datum)} · {minutenText(z.minuten)}
                          </span>
                          <LoeschKnopf frage="Eintrag löschen?" onLoeschen={() => db.hobbyZeiten.delete(z.id)} />
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          confirm(`Hobby „${h.name}“ löschen?`) &&
                          db.transaction('rw', db.hobbys, db.hobbyZeiten, async () => {
                            await db.hobbyZeiten.where('hobbyId').equals(h.id).delete()
                            await db.hobbys.delete(h.id)
                          })
                        }
                        className="tippbar min-h-10 text-[14px] text-[#ff453a]"
                      >
                        Hobby löschen
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      <HobbyFormular offen={neuOffen} onZu={() => setNeuOffen(false)} />
    </Seite>
  )
}
