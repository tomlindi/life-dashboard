// Fenster "KI einrichten": hier trägst du deinen eigenen Anthropic-API-Schlüssel ein (oder löschst ihn).
// Der Schlüssel landet nur im localStorage dieses Geräts (siehe core/ki.ts), nie im Backup.
import { useState } from 'react'
import Sheet from '../../core/ui/Sheet'
import { Knopf, Label } from '../../core/ui/Formular'
import { kiSchluessel, setzeKiSchluessel } from '../../core/ki'
import { FARBE } from './naehrwerte'

interface Props {
  offen: boolean
  onZu: () => void
  /** Wird nach dem Speichern aufgerufen (noch im selben Tipp, damit sich danach die Kamera öffnen darf). */
  onGespeichert?: () => void
}

export default function KiEinrichten({ offen, onZu, onGespeichert }: Props) {
  const [eingabe, setEingabe] = useState('')
  const vorhanden = offen ? kiSchluessel() : ''

  function speichern() {
    setzeKiSchluessel(eingabe)
    setEingabe('')
    onZu()
    onGespeichert?.()
  }

  function loeschen() {
    if (!confirm('KI-Schlüssel von diesem iPhone löschen?')) return
    setzeKiSchluessel('')
    onZu()
  }

  return (
    <Sheet titel="KI einrichten" offen={offen} onZu={onZu}>
      <p className="mb-3 text-[15px] leading-snug">
        Damit die KI deine Mahlzeiten auf Fotos erkennt, brauchst du einen eigenen Schlüssel von Anthropic (die Firma hinter der KI „Claude“).
      </p>
      <ol className="mb-4 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug">
        <li>
          Auf{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="font-semibold" style={{ color: FARBE }}>
            console.anthropic.com
          </a>{' '}
          anmelden und etwas Guthaben aufladen.
        </li>
        <li>Den Bereich „API Keys“ öffnen und einen neuen Schlüssel erstellen.</li>
        <li>Den Schlüssel kopieren und hier einfügen.</li>
      </ol>
      <div className="mb-4 flex flex-col gap-1 rounded-2xl bg-karte2 p-3 text-[13px] leading-snug text-grau">
        <p>💶 Jedes Foto kostet ein paar Cent von deinem Guthaben.</p>
        <p>🔒 Der Schlüssel bleibt nur auf diesem iPhone und kommt nicht ins Backup. Gib ihn niemandem weiter.</p>
      </div>

      <Label>{vorhanden ? `Gespeichert: ${vorhanden.slice(0, 7)}…${vorhanden.slice(-4)} – neuer Schlüssel ersetzt ihn` : 'Dein API-Schlüssel'}</Label>
      <input
        type="password"
        value={eingabe}
        onChange={(e) => setEingabe(e.target.value)}
        placeholder="sk-ant-…"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="mb-3 h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
      />
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!eingabe.trim()}>
        Speichern
      </Knopf>
      {vorhanden && (
        <button type="button" onClick={loeschen} className="tippbar mt-2 min-h-11 w-full text-[15px] font-semibold text-[#ff453a]">
          Schlüssel löschen
        </button>
      )}
    </Sheet>
  )
}
