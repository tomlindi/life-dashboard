// Bausteine für Abschnitte in To-do-Listen (Projekt-Aufgaben und Erinnerungen-Listen):
//   • AbschnittKopf: fette Überschrift. Antippen = umbenennen, dabei erscheinen ↑ ↓ und Löschen.
//   • NeuerAbschnitt: Zeile "Abschnitt hinzufügen" am Ende der Liste.
//   • AbschnittWahl: Fenster zum Verschieben einer Aufgabe in einen anderen Abschnitt.
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react'
import type { Abschnitt } from '../db'
import { benenneAbschnittUm, loescheAbschnitt, neuerAbschnitt, verschiebeAbschnitt } from '../abschnitte'
import Sheet from './Sheet'
import { lesbar } from '../darstellung'

export function AbschnittKopf({ abschnitt, alle, farbe }: { abschnitt: Abschnitt; alle: Abschnitt[]; farbe: string }) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [titel, setTitel] = useState(abschnitt.titel)
  const i = alle.findIndex((a) => a.id === abschnitt.id)

  function fertig() {
    if (titel.trim() && titel.trim() !== abschnitt.titel) benenneAbschnittUm(abschnitt.id, titel.trim())
    else setTitel(abschnitt.titel)
    setBearbeiten(false)
  }

  if (!bearbeiten)
    return (
      <button
        onClick={() => {
          setTitel(abschnitt.titel)
          setBearbeiten(true)
        }}
        className="tippbar block w-full pb-1 pl-2 pt-5 text-left text-[20px] font-bold leading-tight" style={{ color: lesbar(farbe) }}>
        {abschnitt.titel}
      </button>
    )

  // Knöpfe mit onPointerDown + preventDefault: das Eingabefeld verliert dabei nicht den Fokus
  const knopf = 'tippbar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-karte2'
  return (
    <div className="flex items-center gap-1.5 pb-1 pl-2 pt-4">
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') fertig()
          if (e.key === 'Escape') {
            setTitel(abschnitt.titel)
            setBearbeiten(false)
          }
        }}
        onBlur={fertig}
        autoFocus
        enterKeyHint="done"
        className="h-10 min-w-0 flex-1 bg-transparent text-[20px] font-bold outline-none"
        style={{ color: lesbar(farbe) }}
      />
      <button onPointerDown={(e) => e.preventDefault()} onClick={() => verschiebeAbschnitt(alle, abschnitt, -1)} disabled={i <= 0} className={`${knopf} disabled:opacity-30`} aria-label="Abschnitt nach oben">
        <ArrowUp size={18} />
      </button>
      <button onPointerDown={(e) => e.preventDefault()} onClick={() => verschiebeAbschnitt(alle, abschnitt, 1)} disabled={i >= alle.length - 1} className={`${knopf} disabled:opacity-30`} aria-label="Abschnitt nach unten">
        <ArrowDown size={18} />
      </button>
      <button
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => confirm(`Abschnitt „${abschnitt.titel}“ löschen? Die Aufgaben darin bleiben erhalten.`) && loescheAbschnitt(abschnitt)}
        className={`${knopf} text-[#ff453a]`}
        aria-label="Abschnitt löschen"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export function NeuerAbschnitt({ ort, farbe }: { ort: string; farbe: string }) {
  const [offen, setOffen] = useState(false)
  const [titel, setTitel] = useState('')

  function fertig() {
    if (titel.trim()) neuerAbschnitt(ort, titel.trim())
    setTitel('')
    setOffen(false)
  }

  if (!offen)
    return (
      <button onClick={() => setOffen(true)} className="tippbar flex min-h-11 items-center gap-2 pl-2 text-[15px] font-semibold" style={{ color: lesbar(farbe) }}>
        <Plus size={18} /> Abschnitt hinzufügen
      </button>
    )
  return (
    <input
      value={titel}
      onChange={(e) => setTitel(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') fertig()
        if (e.key === 'Escape') setOffen(false)
      }}
      onBlur={fertig}
      autoFocus
      enterKeyHint="done"
      placeholder="Name des Abschnitts"
      className="h-12 w-full bg-transparent pl-2 text-[20px] font-bold outline-none placeholder:text-grau"
    />
  )
}

/** Fenster: Abschnitt für eine Aufgabe wählen ("Ohne Abschnitt" steht oben). */
export function AbschnittWahl({ titel, abschnitte, aktuell, farbe, onWahl, onZu }: { titel?: string; abschnitte: Abschnitt[]; aktuell?: string; farbe: string; onWahl: (abschnittId: string | undefined) => void; onZu: () => void }) {
  const optionen = [{ id: undefined, titel: 'Ohne Abschnitt' }, ...abschnitte]
  return (
    <Sheet titel={titel ? `„${titel}“ verschieben` : ''} offen={titel !== undefined} onZu={onZu}>
      <div className="overflow-hidden rounded-2xl bg-karte2">
        {optionen.map((o, i) => {
          const an = (aktuell && abschnitte.some((a) => a.id === aktuell) ? aktuell : undefined) === o.id
          return (
            <button
              key={o.id ?? 'ohne'}
              onClick={() => {
                onWahl(o.id)
                onZu()
              }}
              className={`tippbar flex min-h-12 w-full items-center px-4 text-left text-[16px] ${i > 0 ? 'border-t border-linie' : ''} ${o.id ? '' : 'text-grau'}`}
            >
              <span className="flex-1">{o.titel}</span>
              {an && <Check size={18} color={farbe} />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
