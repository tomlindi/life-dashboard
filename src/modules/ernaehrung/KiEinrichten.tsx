// Fenster "KI einrichten": hier trägst du deinen kostenlosen Google-Gemini-Schlüssel ein (oder löschst ihn).
// Der Schlüssel landet nur im localStorage dieses Geräts (siehe core/gemini.ts), nie im Backup oder im Code.
// Wer lieber Claude (Anthropic, kostenpflichtig) nutzt, findet das unter Mehr → Einstellungen.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../core/ui/Sheet'
import { Knopf, Label } from '../../core/ui/Formular'
import { geminiSchluessel, setzeGeminiSchluessel } from '../../core/gemini'
import { FARBE } from './naehrwerte'

interface Props {
  offen: boolean
  onZu: () => void
  /** Wird nach dem Speichern aufgerufen (noch im selben Tipp, damit sich danach die Kamera öffnen darf). */
  onGespeichert?: () => void
}

export default function KiEinrichten({ offen, onZu, onGespeichert }: Props) {
  const [eingabe, setEingabe] = useState('')
  const vorhanden = offen ? geminiSchluessel() : ''

  function speichern() {
    setzeGeminiSchluessel(eingabe)
    setEingabe('')
    onZu()
    onGespeichert?.()
  }

  function loeschen() {
    if (!confirm('Gemini-Schlüssel von diesem Gerät löschen?')) return
    setzeGeminiSchluessel('')
    onZu()
  }

  return (
    <Sheet titel="KI einrichten" offen={offen} onZu={onZu}>
      <p className="mb-3 text-[15px] leading-snug">
        Damit die KI deine Mahlzeiten auf Fotos erkennt, brauchst du einen <b>kostenlosen</b> Schlüssel von Google Gemini:
      </p>
      <ol className="mb-4 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug">
        <li>
          Auf{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-semibold" style={{ color: FARBE }}>
            aistudio.google.com/apikey
          </a>{' '}
          mit deinem Google-Konto anmelden.
        </li>
        <li>„API-Schlüssel erstellen“ antippen.</li>
        <li>Den Schlüssel kopieren und hier einfügen.</li>
      </ol>
      <div className="mb-4 flex flex-col gap-1 rounded-2xl bg-karte2 p-3 text-[13px] leading-snug text-grau">
        <p>🆓 Kostenlos, mit einem Tageslimit, das für deine Mahlzeiten locker reicht.</p>
        <p>🔒 Der Schlüssel bleibt nur auf diesem Gerät und kommt nicht ins Backup oder in den Code.</p>
        <p>📸 Im kostenlosen Tarif darf Google die Fotos zur Verbesserung nutzen, also nur Essen fotografieren.</p>
      </div>

      <Label>{vorhanden ? `Gespeichert: ${vorhanden.slice(0, 6)}…${vorhanden.slice(-4)} – neuer Schlüssel ersetzt ihn` : 'Dein Gemini-Schlüssel'}</Label>
      <input
        type="password"
        value={eingabe}
        onChange={(e) => setEingabe(e.target.value)}
        placeholder="AIza…"
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
      <Link to="/einstellungen" onClick={onZu} className="tippbar mt-2 block text-center text-[13px] text-grau">
        Modell wählen, testen oder Claude statt Gemini nutzen → Einstellungen
      </Link>
    </Sheet>
  )
}
