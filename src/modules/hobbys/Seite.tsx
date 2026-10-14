// Bereich "Hobbys": investierte Zeit (per Timer, schnell per +15/+30/+60 Min oder nachgetragen) und Ziele pro Hobby.
// Der Timer selbst steht in timer.ts.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Clock, Play, Square } from 'lucide-react'
import { db, setzeEinstellung, type Hobby, type HobbyZeit } from '../../core/db'
import { heute, neueId, uhrzeit, wochenStart } from '../../core/datum'
import { kurzDatum, minutenText, zahl } from '../../core/format'
import { FARBE, LAUF, starteTimer, stoppeTimer, uhrText, useHobbyLauf, type HobbyLauf } from './timer'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Sheet from '../../core/ui/Sheet'
import { Balken, Eingabe, Knopf, Label, Leer, LoeschKnopf, PlusKnopf } from '../../core/ui/Formular'

const EMOJIS = ['🎸', '🎮', '🎨', '📷', '⚽', '🏀', '🎹', '📖', '💻', '🧩', '🛹', '🎤']
const ZIEL_OPTIONEN = [0, 60, 120, 180, 300, 420]

/** Eine Zeile im Protokoll: "Mo 13.10. · 14:05–15:20 · 1 h 15 min" */
function eintragText(z: HobbyZeit) {
  const zeit = z.start && z.ende ? ` · ${uhrzeit(z.start)}–${uhrzeit(z.ende)}` : ''
  return `${kurzDatum(z.datum)}${zeit} · ${minutenText(z.minuten)}`
}

/** Neueste zuerst: nach Tag, innerhalb des Tages nach Beginn. */
const neuesteZuerst = (a: HobbyZeit, b: HobbyZeit) => b.datum.localeCompare(a.datum) || (b.start ?? '').localeCompare(a.start ?? '')

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
          <button key={e} onClick={() => setEmoji(e)} className={`tippbar h-12 rounded-xl text-[24px] ${emoji === e ? 'bg-text/20 ring-2 ring-text/60' : 'bg-karte2'}`}>
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
            style={{ background: zielMin === m ? FARBE : 'var(--color-karte2)', color: zielMin === m ? '#000' : 'var(--color-text)' }}
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

/** "Zeit nachtragen": Tag, Beginn und Ende von Hand. Ende vor Beginn = über Mitternacht. */
function NachtragenSheet({ hobby, onZu }: { hobby?: Hobby; onZu: () => void }) {
  const [datum, setDatum] = useState(heute())
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')

  const start = von ? new Date(`${datum}T${von}`) : null
  let ende = bis ? new Date(`${datum}T${bis}`) : null
  if (start && ende && ende <= start) ende = new Date(ende.getTime() + 24 * 3600 * 1000)
  const minuten = start && ende ? Math.round((ende.getTime() - start.getTime()) / 60000) : 0

  async function speichern() {
    if (!hobby || !start || !ende || minuten < 1) return
    await db.hobbyZeiten.add({ id: neueId(), hobbyId: hobby.id, datum, minuten, start: start.toISOString(), ende: ende.toISOString() })
    setVon('')
    setBis('')
    onZu()
  }

  return (
    <Sheet titel={hobby ? `${hobby.emoji} Zeit nachtragen` : ''} offen={!!hobby} onZu={onZu}>
      <div className="mb-3">
        <Eingabe label="Tag" type="date" value={datum} max={heute()} onChange={(e) => setDatum(e.target.value || heute())} />
      </div>
      <div className="mb-3 flex gap-3">
        <Eingabe label="Beginn" type="time" value={von} onChange={(e) => setVon(e.target.value)} />
        <Eingabe label="Ende" type="time" value={bis} onChange={(e) => setBis(e.target.value)} />
      </div>
      <p className="mb-4 text-[14px] text-grau">{minuten > 0 ? `Dauer: ${minutenText(minuten)}` : 'Beginn und Ende eintragen.'}</p>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={minuten < 1}>
        Speichern
      </Knopf>
    </Sheet>
  )
}

/** Große Karte oben, solange ein Timer läuft. */
function LaufenderTimer({ lauf, hobby }: { lauf: HobbyLauf; hobby?: Hobby }) {
  const [jetzt, setJetzt] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const sek = Math.max(0, Math.floor((jetzt - Date.parse(lauf.start)) / 1000))

  return (
    <Karte>
      <div className="flex items-center gap-3">
        <span className="text-[34px]">{hobby?.emoji ?? '⏱️'}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{hobby?.name ?? 'Hobby'} läuft</p>
          <p className="text-[13px] text-grau">seit {uhrzeit(lauf.start)} Uhr</p>
        </div>
        <button onClick={stoppeTimer} className="tippbar flex h-12 items-center gap-2 rounded-2xl bg-[#ff453a] px-4 text-[16px] font-semibold text-white" aria-label="Timer stoppen">
          <Square size={16} fill="currentColor" /> Stopp
        </button>
      </div>
      <p className="mt-2 text-center font-mono text-[44px] font-bold tabular-nums" style={{ color: FARBE }}>
        {uhrText(sek)}
      </p>
    </Karte>
  )
}

export default function HobbysSeite() {
  const hobbys = useLiveQuery(() => db.hobbys.toArray(), []) ?? []
  const zeiten = (useLiveQuery(() => db.hobbyZeiten.toArray(), []) ?? []).sort(neuesteZuerst)
  const [lauf] = useHobbyLauf()
  const [neuOffen, setNeuOffen] = useState(false)
  const [offen, setOffen] = useState<string | null>(null)
  const [nachtragen, setNachtragen] = useState<Hobby | undefined>()

  const start = wochenStart()
  const gesamtWoche = zeiten.filter((z) => z.datum >= start).reduce((s, z) => s + z.minuten, 0)

  return (
    <Seite titel="Hobbys" farbe={FARBE}>
      {lauf && <LaufenderTimer lauf={lauf} hobby={hobbys.find((h) => h.id === lauf.hobbyId)} />}

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
              const laeuft = lauf?.hobbyId === h.id
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

                  {/* Timer starten/stoppen und schnell Zeit eintragen */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => (laeuft ? stoppeTimer() : starteTimer(h.id))}
                      className="tippbar flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl text-[15px] font-semibold"
                      style={laeuft ? { background: '#ff453a', color: '#fff' } : { background: FARBE, color: '#000' }}
                      aria-label={laeuft ? `${h.name} stoppen` : `${h.name} starten`}
                    >
                      {laeuft ? <Square size={14} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                      {laeuft ? 'Stopp' : 'Start'}
                    </button>
                    {[15, 30, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => db.hobbyZeiten.add({ id: neueId(), hobbyId: h.id, datum: heute(), minuten: m })}
                        className="tippbar h-11 flex-1 rounded-xl bg-mulde text-[15px] font-semibold"
                        style={{ color: FARBE }}
                      >
                        +{m}
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
                          className="mt-1 h-11 w-full rounded-xl bg-mulde px-3 outline-none placeholder:text-grau"
                        />
                      </label>
                      <div className="flex items-center">
                        <p className="flex-1 text-[13px] text-grau">Zeitprotokoll</p>
                        <button onClick={() => setNachtragen(h)} className="tippbar flex min-h-10 items-center gap-1 text-[14px] font-semibold" style={{ color: FARBE }}>
                          <Clock size={15} /> Zeit nachtragen
                        </button>
                      </div>
                      {eigene.length === 0 && <Leer>Noch keine Einträge.</Leer>}
                      {eigene.slice(0, 15).map((z) => (
                        <div key={z.id} className="flex items-center text-[14px]">
                          <span className="flex-1 tabular-nums">{eintragText(z)}</span>
                          <LoeschKnopf frage="Eintrag löschen?" onLoeschen={() => db.hobbyZeiten.delete(z.id)} />
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          confirm(`Hobby „${h.name}“ löschen?`) &&
                          db.transaction('rw', db.hobbys, db.hobbyZeiten, db.einstellungen, async () => {
                            if (laeuft) await setzeEinstellung(LAUF, null)
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
      <NachtragenSheet hobby={nachtragen} onZu={() => setNachtragen(undefined)} />
    </Seite>
  )
}
