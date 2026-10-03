// Erinnerung bearbeiten (Details wie in Apples Erinnerungen-App).
import { useEffect, useState } from 'react'
import type { Aufgabe } from '../../core/db'
import { loescheErinnerung, speichereErinnerung } from '../../core/apple'
import Sheet from '../../core/ui/Sheet'
import { Eingabe, Label } from '../../core/ui/Formular'
import { ROT } from './farben'

const PRIORITAETEN = [
  { wert: 0, text: 'Keine' },
  { wert: 1, text: '!' },
  { wert: 2, text: '!!' },
  { wert: 3, text: '!!!' },
]

export default function ErinnerungSheet({ aufgabe, listen, onZu }: { aufgabe?: Aufgabe; listen: string[]; onZu: () => void }) {
  const [titel, setTitel] = useState('')
  const [notiz, setNotiz] = useState('')
  const [faellig, setFaellig] = useState('')
  const [liste, setListe] = useState('')
  const [prioritaet, setPrioritaet] = useState(0)

  useEffect(() => {
    if (!aufgabe) return
    setTitel(aufgabe.titel)
    setNotiz(aufgabe.notiz ?? '')
    setFaellig(aufgabe.faellig ?? '')
    setListe(aufgabe.liste ?? '')
    setPrioritaet(aufgabe.prioritaet ?? 0)
  }, [aufgabe])

  async function sichern() {
    if (!aufgabe || !titel.trim()) return
    await speichereErinnerung(
      { titel: titel.trim(), notiz: notiz.trim() || undefined, faellig: faellig || undefined, liste: liste.trim() || undefined, prioritaet: prioritaet || undefined },
      aufgabe,
    )
    onZu()
  }

  return (
    <Sheet titel="Details" offen={!!aufgabe} onZu={onZu}>
      <div className="mb-4 flex flex-col gap-3">
        <Eingabe label="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} />
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-grau">Notizen</span>
          <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2} className="w-full resize-none rounded-2xl bg-karte2 p-3 outline-none" />
        </label>
        <Eingabe label="Datum" type="date" value={faellig} onChange={(e) => setFaellig(e.target.value)} />
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-grau">Liste</span>
          <input list="erinnerungs-listen" value={liste} onChange={(e) => setListe(e.target.value)} placeholder="z. B. Schule" className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau" />
          <datalist id="erinnerungs-listen">
            {listen.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
      </div>
      <Label>Priorität</Label>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {PRIORITAETEN.map((p) => (
          <button
            key={p.wert}
            onClick={() => setPrioritaet(p.wert)}
            className="tippbar h-11 rounded-xl text-[15px] font-semibold"
            style={{ background: prioritaet === p.wert ? '#0a84ff' : '#2c2c2e' }}
          >
            {p.text}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            if (!aufgabe || !confirm(`„${aufgabe.titel}“ löschen? (Wird beim nächsten Abgleich auch in Erinnerungen gelöscht.)`)) return
            await loescheErinnerung(aufgabe)
            onZu()
          }}
          className="tippbar h-14 rounded-2xl bg-karte2 px-5 text-[16px]"
          style={{ color: ROT }}
        >
          Löschen
        </button>
        <button onClick={sichern} disabled={!titel.trim()} className="tippbar h-14 flex-1 rounded-2xl bg-[#0a84ff] text-[17px] font-semibold disabled:opacity-40">
          Sichern
        </button>
      </div>
    </Sheet>
  )
}
