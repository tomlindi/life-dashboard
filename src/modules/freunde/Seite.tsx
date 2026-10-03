// Bereich "Freunde": Geburtstage, wann zuletzt getroffen, gemeinsame Pläne.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cake, ChevronDown } from 'lucide-react'
import { db } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import { kurzDatum, relativ } from '../../core/format'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Sheet from '../../core/ui/Sheet'
import { Eingabe, Knopf, Leer, LoeschKnopf, PlusKnopf, SchnellEingabe } from '../../core/ui/Formular'
import { baldigeGeburtstage, naechsterGeburtstag } from './geburtstag'

const FARBE = '#ff6482'

function FreundFormular({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const [name, setName] = useState('')
  const [geburtstag, setGeburtstag] = useState('')
  const [zuletzt, setZuletzt] = useState('')

  async function speichern() {
    if (!name.trim()) return
    await db.freunde.add({ id: neueId(), name: name.trim(), geburtstag: geburtstag || undefined, zuletzt: zuletzt || undefined, plaene: [] })
    setName('')
    setGeburtstag('')
    setZuletzt('')
    onZu()
  }

  return (
    <Sheet titel="Neuer Freund" offen={offen} onZu={onZu}>
      <div className="mb-5 flex flex-col gap-4">
        <Eingabe label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lena" autoFocus />
        <Eingabe label="Geburtstag (optional)" type="date" value={geburtstag} onChange={(e) => setGeburtstag(e.target.value)} />
        <Eingabe label="Zuletzt getroffen (optional)" type="date" value={zuletzt} max={heute()} onChange={(e) => setZuletzt(e.target.value)} />
      </div>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!name.trim()}>
        Hinzufügen
      </Knopf>
    </Sheet>
  )
}

export default function FreundeSeite() {
  const freunde = useLiveQuery(() => db.freunde.orderBy('id').toArray(), []) ?? []
  const [neuOffen, setNeuOffen] = useState(false)
  const [offen, setOffen] = useState<string | null>(null)

  const sortiert = [...freunde].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const bald = baldigeGeburtstage(freunde, 30)

  return (
    <Seite titel="Freunde" farbe={FARBE}>
      <Karte titel="Bald Geburtstag" akzent={FARBE}>
        {bald.length === 0 ? (
          <Leer>In den nächsten 30 Tagen hat niemand Geburtstag.</Leer>
        ) : (
          <ul className="space-y-2">
            {bald.map((g) => (
              <li key={g.freund.id} className="flex items-center gap-3">
                <Cake size={22} color={FARBE} />
                <span className="flex-1 text-[16px]">
                  {g.freund.name} <span className="text-grau">wird {g.alter}</span>
                </span>
                <span className={`text-[14px] ${g.inTagen <= 3 ? 'font-semibold' : 'text-grau'}`} style={{ color: g.inTagen <= 3 ? FARBE : undefined }}>
                  {g.inTagen === 0 ? 'heute 🎉' : relativ(g.datum)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <Karte titel="Alle Freunde" rechts={<PlusKnopf farbe={FARBE} onClick={() => setNeuOffen(true)} label="Freund" />}>
        {sortiert.length === 0 ? (
          <Leer>Noch keine Freunde eingetragen.</Leer>
        ) : (
          <ul className="space-y-2">
            {sortiert.map((f) => {
              const istOffen = offen === f.id
              const geb = naechsterGeburtstag(f)
              return (
                <li key={f.id} className="rounded-2xl bg-karte2 p-3">
                  <div className="flex items-center gap-3">
                    {/* Initiale als runder Avatar */}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] font-bold text-black" style={{ background: FARBE }}>
                      {f.name[0]?.toUpperCase()}
                    </span>
                    <button onClick={() => setOffen(istOffen ? null : f.id)} className="tippbar min-w-0 flex-1 text-left">
                      <p className="truncate text-[17px] font-semibold">{f.name}</p>
                      <p className="text-[13px] text-grau">
                        {f.zuletzt ? `zuletzt getroffen ${relativ(f.zuletzt)}` : 'noch nicht getroffen'}
                        {f.plaene.length > 0 ? ` · ${f.plaene.length} Pläne` : ''}
                      </p>
                    </button>
                    <ChevronDown size={18} className={`text-grau transition-transform ${istOffen ? 'rotate-180' : ''}`} />
                  </div>

                  {istOffen && (
                    <div className="mt-3 space-y-3">
                      <button
                        onClick={() => db.freunde.update(f.id, { zuletzt: heute() })}
                        className="tippbar min-h-11 w-full rounded-xl text-[15px] font-semibold text-black"
                        style={{ background: FARBE }}
                      >
                        Heute getroffen
                      </button>
                      <label className="flex items-center justify-between gap-3">
                        <span className="text-[14px] text-grau">Geburtstag{geb ? ` (wird ${geb.alter})` : ''}</span>
                        <input
                          type="date"
                          value={f.geburtstag ?? ''}
                          onChange={(e) => db.freunde.update(f.id, { geburtstag: e.target.value || undefined })}
                          className="h-10 rounded-xl bg-black/40 px-3 outline-none"
                        />
                      </label>
                      <div>
                        <p className="mb-1 text-[14px] text-grau">Gemeinsame Pläne</p>
                        {f.plaene.map((p) => (
                          <div key={p.id} className="flex items-center">
                            <span className="flex-1 text-[15px]">
                              • {p.text}
                              {p.datum ? <span className="text-grau"> · {kurzDatum(p.datum)}</span> : ''}
                            </span>
                            <LoeschKnopf frage="Plan löschen?" onLoeschen={() => db.freunde.update(f.id, { plaene: f.plaene.filter((x) => x.id !== p.id) })} />
                          </div>
                        ))}
                        <SchnellEingabe
                          platzhalter="z. B. Kino am Freitag"
                          farbe={FARBE}
                          onNeu={(text) => db.freunde.update(f.id, { plaene: [...f.plaene, { id: neueId(), text }] })}
                        />
                      </div>
                      <button
                        onClick={() => confirm(`${f.name} löschen?`) && db.freunde.delete(f.id)}
                        className="tippbar min-h-10 text-[14px] text-[#ff453a]"
                      >
                        Löschen
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      <FreundFormular offen={neuOffen} onZu={() => setNeuOffen(false)} />
    </Seite>
  )
}
