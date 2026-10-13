// Eingabe-Fenster für neue Ziele und für Projekte (anlegen und bearbeiten).
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { db, type Projekt, type ProjektStatus } from '../../core/db'
import { neueId } from '../../core/datum'
import Sheet from '../../core/ui/Sheet'
import { Chips, Eingabe, Knopf, Label } from '../../core/ui/Formular'
import { APPLE_FARBEN } from '../kalender/farben'
import { PROJEKT_FARBE, aendereProjekt, farbeVon, loescheProjekt } from './projekte'

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

/**
 * Projekt anlegen (ohne `projekt`) oder bearbeiten (mit `projekt`):
 * Name, Farbe (12 Apple-Farben), Status, Deadline, zugehöriges Ziel. Beim Bearbeiten auch löschen.
 */
export function ProjektFormular({ offen, onZu, projekt, onGeloescht }: FormProps & { projekt?: Projekt; onGeloescht?: () => void }) {
  const ziele = useLiveQuery(() => db.ziele.toArray(), []) ?? []
  const [titel, setTitel] = useState('')
  const [status, setStatus] = useState<ProjektStatus>('Aktiv')
  const [deadline, setDeadline] = useState('')
  const [farbe, setFarbe] = useState(PROJEKT_FARBE)
  const [zielId, setZielId] = useState('')

  // Beim Öffnen: Werte des Projekts übernehmen (oder leer für ein neues)
  useEffect(() => {
    if (!offen) return
    setTitel(projekt?.titel ?? '')
    setStatus(projekt?.status ?? 'Aktiv')
    setDeadline(projekt?.deadline ?? '')
    setFarbe(projekt ? farbeVon(projekt) : PROJEKT_FARBE)
    setZielId(projekt?.zielId ?? '')
  }, [offen, projekt])

  async function speichern() {
    if (!titel.trim()) return
    const werte = { titel: titel.trim(), status, deadline: deadline || undefined, farbe, zielId: zielId || undefined }
    if (projekt) await aendereProjekt(projekt.id, werte)
    else await db.projekte.add({ id: neueId(), ...werte, geaendert: new Date().toISOString() })
    onZu()
  }

  return (
    <Sheet titel={projekt ? 'Projekt bearbeiten' : 'Neues Projekt'} offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe label="Projekt" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Website bauen" autoFocus={!projekt} />
      </div>
      <Label>Farbe</Label>
      <div className="mb-4 grid grid-cols-6 gap-2">
        {APPLE_FARBEN.map((f) => (
          <button key={f.hex} onClick={() => setFarbe(f.hex)} aria-label={f.name} className="tippbar flex aspect-square items-center justify-center rounded-full" style={{ background: f.hex }}>
            {farbe === f.hex && <Check size={18} color="#000" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <Label>Status</Label>
      <div className="mb-4">
        <Chips optionen={STATUS} wert={status} onWahl={setStatus} farbe={FARBE} />
      </div>
      <div className="mb-4">
        <Eingabe label="Deadline (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <Label>Gehört zu Ziel (optional)</Label>
      {/* Native Auswahlliste: auf dem iPhone erscheint das bekannte Drehrad */}
      <select value={zielId} onChange={(e) => setZielId(e.target.value)} className="mb-5 h-12 w-full rounded-2xl bg-karte2 px-3 text-[16px] outline-none">
        <option value="">– kein Ziel –</option>
        {ziele.map((z) => (
          <option key={z.id} value={z.id}>
            {z.emoji} {z.titel}
          </option>
        ))}
      </select>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!titel.trim()}>
        {projekt ? 'Speichern' : 'Projekt anlegen'}
      </Knopf>
      {projekt && (
        <button
          onClick={async () => {
            if (!confirm(`Projekt „${projekt.titel}“ löschen? Zugeordnete Termine und Erinnerungen bleiben erhalten.`)) return
            await loescheProjekt(projekt)
            onZu()
            onGeloescht?.()
          }}
          className="tippbar mt-3 min-h-11 w-full text-[15px] text-[#ff453a]"
        >
          Projekt löschen
        </button>
      )}
    </Sheet>
  )
}
