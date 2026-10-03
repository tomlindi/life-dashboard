// Eingabe-Fenster für neue Ziele und Projekte.
import { useState } from 'react'
import { db, type ProjektStatus } from '../../core/db'
import { neueId } from '../../core/datum'
import Sheet from '../../core/ui/Sheet'
import { Chips, Eingabe, Knopf, Label } from '../../core/ui/Formular'

const FARBE = '#bf5af2'
const EMOJIS = ['🎯', '💪', '📚', '🎓', '💰', '🏃', '🎸', '✈️', '🧠', '❤️', '🌱', '💻']
export const STATUS: ProjektStatus[] = ['Idee', 'Aktiv', 'Pausiert', 'Fertig']

interface FormProps {
  offen: boolean
  onZu: () => void
}

export function ZielFormular({ offen, onZu }: FormProps) {
  const [titel, setTitel] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])

  async function speichern() {
    if (!titel.trim()) return
    await db.ziele.add({ id: neueId(), titel: titel.trim(), emoji })
    setTitel('')
    onZu()
  }

  return (
    <Sheet titel="Neues Ziel" offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe label="Ziel" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Abi mit 1,5" autoFocus />
      </div>
      <Label>Symbol</Label>
      <div className="mb-5 grid grid-cols-6 gap-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`tippbar h-12 rounded-xl text-[24px] ${emoji === e ? 'bg-white/20 ring-2 ring-white/60' : 'bg-karte2'}`}
          >
            {e}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[13px] text-grau">Tipp: Danach kannst du Unterziele hinzufügen. Der Fortschritt berechnet sich dann automatisch.</p>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!titel.trim()}>
        Ziel anlegen
      </Knopf>
    </Sheet>
  )
}

export function ProjektFormular({ offen, onZu }: FormProps) {
  const [titel, setTitel] = useState('')
  const [status, setStatus] = useState<ProjektStatus>('Aktiv')
  const [deadline, setDeadline] = useState('')

  async function speichern() {
    if (!titel.trim()) return
    await db.projekte.add({ id: neueId(), titel: titel.trim(), status, deadline: deadline || undefined })
    setTitel('')
    setDeadline('')
    onZu()
  }

  return (
    <Sheet titel="Neues Projekt" offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe label="Projekt" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Website bauen" autoFocus />
      </div>
      <Label>Status</Label>
      <div className="mb-4">
        <Chips optionen={STATUS} wert={status} onWahl={setStatus} farbe={FARBE} />
      </div>
      <div className="mb-5">
        <Eingabe label="Deadline (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!titel.trim()}>
        Projekt anlegen
      </Knopf>
    </Sheet>
  )
}
