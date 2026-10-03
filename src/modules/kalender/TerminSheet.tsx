// Neuer Termin / Termin bearbeiten (wie "Neues Ereignis" in Apple Kalender).
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import type { Termin } from '../../core/db'
import { tagPlus, tagString } from '../../core/datum'
import { loescheTermin, speichereTermin } from '../../core/apple'
import Sheet from '../../core/ui/Sheet'
import { Eingabe, Label } from '../../core/ui/Formular'
import { ROT } from './farben'

const zwei = (n: number) => String(n).padStart(2, '0')
/** ISO -> Wert für <input type="datetime-local"> ("2026-10-03T14:30") in lokaler Zeit */
const lokal = (iso: string) => {
  const d = new Date(iso)
  return `${tagString(d)}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`
}

export default function TerminSheet({ offen, onZu, termin, tag }: { offen: boolean; onZu: () => void; termin?: Termin; tag: string }) {
  const [titel, setTitel] = useState('')
  const [ort, setOrt] = useState('')
  const [ganztaegig, setGanztaegig] = useState(false)
  const [start, setStart] = useState('')
  const [ende, setEnde] = useState('')
  const [notiz, setNotiz] = useState('')

  useEffect(() => {
    if (!offen) return
    if (termin) {
      setTitel(termin.titel)
      setOrt(termin.ort ?? '')
      setGanztaegig(!!termin.ganztaegig)
      setStart(lokal(termin.start))
      setEnde(lokal(termin.ende ?? new Date(Date.parse(termin.start) + 3600000).toISOString()))
      setNotiz(termin.notiz ?? '')
    } else {
      // Neuer Termin: nächste volle Stunde am gewählten Tag, 1 Stunde lang
      const stunde = Math.min(22, new Date().getHours() + 1)
      setTitel('')
      setOrt('')
      setGanztaegig(false)
      setStart(`${tag}T${zwei(stunde)}:00`)
      setEnde(`${tag}T${zwei(stunde + 1)}:00`)
      setNotiz('')
    }
  }, [offen, termin, tag])

  async function sichern() {
    if (!titel.trim() || !start) return
    const startTag = start.slice(0, 10)
    const endeTag = (ende || start).slice(0, 10)
    await speichereTermin(
      {
        titel: titel.trim(),
        ort: ort.trim() || undefined,
        notiz: notiz.trim() || undefined,
        ganztaegig: ganztaegig || undefined,
        kalender: termin?.kalender,
        zielId: termin?.zielId,
        projektId: termin?.projektId,
        start: new Date(ganztaegig ? `${startTag}T00:00:00` : start).toISOString(),
        ende: new Date(ganztaegig ? `${tagPlus(endeTag, 1)}T00:00:00` : ende || start).toISOString(),
      },
      termin,
    )
    onZu()
  }

  return (
    <Sheet titel={termin ? 'Termin bearbeiten' : 'Neuer Termin'} offen={offen} onZu={onZu}>
      <div className="mb-4 flex flex-col gap-3">
        <Eingabe label="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Mathe-Nachhilfe" autoFocus={!termin} />
        <Eingabe label="Ort (optional)" value={ort} onChange={(e) => setOrt(e.target.value)} />
      </div>

      <button onClick={() => setGanztaegig(!ganztaegig)} className="mb-3 flex min-h-11 w-full items-center justify-between rounded-2xl bg-karte2 px-4">
        <span className="text-[16px]">Ganztägig</span>
        <span className="relative h-[31px] w-[51px] rounded-full transition-colors" style={{ background: ganztaegig ? '#30d158' : '#39393d' }}>
          <span className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white transition-all" style={{ left: ganztaegig ? 22 : 2 }} />
        </span>
      </button>

      <div className="mb-4 flex flex-col gap-3">
        <Eingabe
          label="Beginn"
          type={ganztaegig ? 'date' : 'datetime-local'}
          value={ganztaegig ? start.slice(0, 10) : start}
          onChange={(e) => {
            const neu = ganztaegig ? `${e.target.value}T00:00` : e.target.value
            // Ende mitschieben, damit die Dauer gleich bleibt
            const dauer = Date.parse(ende) - Date.parse(start)
            setStart(neu)
            if (Number.isFinite(dauer) && dauer >= 0) setEnde(lokal(new Date(Date.parse(neu) + dauer).toISOString()))
          }}
        />
        <Eingabe label="Ende" type={ganztaegig ? 'date' : 'datetime-local'} value={ganztaegig ? ende.slice(0, 10) : ende} onChange={(e) => setEnde(ganztaegig ? `${e.target.value}T00:00` : e.target.value)} />
      </div>

      <Label>Notizen</Label>
      <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={3} className="mb-4 w-full resize-none rounded-2xl bg-karte2 p-3 outline-none" />

      {termin?.kalender && <p className="mb-3 text-[13px] text-grau">Kalender: {termin.kalender}</p>}
      {termin?.sync && (
        <p className="mb-3 flex items-center gap-1.5 text-[13px] text-[#ffd60a]">
          <Clock size={14} /> Noch nicht mit Apple abgeglichen
        </p>
      )}

      <div className="flex gap-2">
        {termin && (
          <button
            onClick={async () => {
              if (!confirm(`„${termin.titel}“ löschen? (Wird beim nächsten Abgleich auch in Apple Kalender gelöscht.)`)) return
              await loescheTermin(termin)
              onZu()
            }}
            className="tippbar h-14 rounded-2xl bg-karte2 px-5 text-[16px]"
            style={{ color: ROT }}
          >
            Löschen
          </button>
        )}
        <button onClick={sichern} disabled={!titel.trim()} className="tippbar h-14 flex-1 rounded-2xl text-[17px] font-semibold disabled:opacity-40" style={{ background: ROT }}>
          {termin ? 'Sichern' : 'Hinzufügen'}
        </button>
      </div>
    </Sheet>
  )
}
