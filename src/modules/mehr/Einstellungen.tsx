// Seite "Einstellungen": Schlüssel für die Foto-Analyse in "Ernährung".
// Standard ist Google Gemini (kostenlos). Claude (Anthropic) wird nur benutzt, wenn KEIN Gemini-Schlüssel da ist.
// Alle Schlüssel liegen nur im localStorage dieses Geräts: nicht in der Datenbank, nicht im Backup, nicht im Code.
import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { STANDARD_MODELL, zuletztGenutztesModell, geminiModell, geminiSchluessel, setzeGeminiModell, setzeGeminiSchluessel, testeGemini } from '../../core/gemini'
import { kiAnbieter, kiSchluessel, setzeKiSchluessel } from '../../core/ki'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'

const GRUEN = '#a3e635'

/** Passwortfeld mit Auge zum Anzeigen. */
function SchluesselFeld({ wert, onAendern, platzhalter }: { wert: string; onAendern: (s: string) => void; platzhalter: string }) {
  const [zeigen, setZeigen] = useState(false)
  return (
    <div className="mb-3 flex items-center rounded-2xl bg-karte2 px-3">
      <KeyRound size={18} className="shrink-0 text-grau" />
      <input
        type={zeigen ? 'text' : 'password'}
        value={wert}
        onChange={(e) => onAendern(e.target.value)}
        placeholder={platzhalter}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-12 min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-grau"
      />
      <button onClick={() => setZeigen(!zeigen)} className="tippbar p-1 text-grau" aria-label={zeigen ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'}>
        {zeigen ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export default function EinstellungenSeite() {
  const [gemini, setGemini] = useState(geminiSchluessel())
  const [modell, setModell] = useState(geminiModell())
  const [claude, setClaude] = useState(kiSchluessel())
  const [anbieter, setAnbieter] = useState(kiAnbieter())
  const [meldung, setMeldung] = useState('')
  const [testet, setTestet] = useState(false)

  function speichereGemini() {
    setzeGeminiSchluessel(gemini)
    setzeGeminiModell(modell || STANDARD_MODELL)
    setAnbieter(kiAnbieter())
    setMeldung(gemini.trim() ? '✅ Gemini-Schlüssel gespeichert (nur auf diesem Gerät).' : 'Gemini-Schlüssel entfernt.')
  }

  async function testen() {
    speichereGemini()
    setTestet(true)
    setMeldung('')
    try {
      await testeGemini()
      setMeldung(`✅ Verbindung klappt (Modell: ${zuletztGenutztesModell()}).`)
    } catch (e) {
      setMeldung('⚠️ ' + (e as Error).message)
    }
    setTestet(false)
  }

  return (
    <Seite titel="Einstellungen">
      <Karte titel="Foto-Analyse: Google Gemini (kostenlos)" akzent={GRUEN}>
        <p className="mb-3 text-[13px] leading-snug text-grau">
          Für die Foto-Analyse in „Ernährung“. Kostenlosen Schlüssel holen: auf{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline" style={{ color: GRUEN }}>
            aistudio.google.com/apikey
          </a>{' '}
          mit deinem Google-Konto anmelden → „API-Schlüssel erstellen“ → kopieren → hier einfügen.
        </p>
        <SchluesselFeld wert={gemini} onAendern={setGemini} platzhalter="AIza…" />

        <label className="mb-1.5 block text-[13px] text-grau">Modell</label>
        <div className="mb-1 flex gap-2">
          <input value={modell} onChange={(e) => setModell(e.target.value)} autoCapitalize="off" spellCheck={false} className="h-11 min-w-0 flex-1 rounded-2xl bg-karte2 px-3 text-[15px] outline-none" />
          {modell !== STANDARD_MODELL && (
            <button onClick={() => setModell(STANDARD_MODELL)} className="tippbar rounded-2xl bg-karte2 px-3 text-[13px] text-grau">
              Standard
            </button>
          )}
        </div>
        <p className="mb-4 text-[12px] text-grau">„{STANDARD_MODELL}“ zeigt automatisch immer auf das aktuelle Flash-Modell von Google.</p>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={speichereGemini} className="tippbar min-h-12 rounded-2xl text-[15px] font-semibold text-black" style={{ background: GRUEN }}>
            Speichern
          </button>
          <button onClick={testen} disabled={!gemini.trim() || testet} className="tippbar min-h-12 rounded-2xl bg-karte2 text-[15px] font-semibold disabled:opacity-40">
            {testet ? 'Teste …' : 'Testen'}
          </button>
        </div>
        {meldung && <p className="mt-3 whitespace-pre-line break-words text-[14px] leading-snug">{meldung}</p>}
      </Karte>

      <Karte titel="Alternative: Claude (Anthropic)">
        <p className="mb-3 text-[13px] leading-snug text-grau">
          Optional und kostenpflichtig (ein paar Cent pro Foto, Guthaben auf console.anthropic.com). Wird nur benutzt, wenn <b>kein</b> Gemini-Schlüssel eingetragen ist.
        </p>
        <SchluesselFeld wert={claude} onAendern={setClaude} platzhalter="sk-ant-…" />
        <button
          onClick={() => {
            setzeKiSchluessel(claude)
            setAnbieter(kiAnbieter())
            setMeldung(claude.trim() ? '✅ Claude-Schlüssel gespeichert.' : 'Claude-Schlüssel entfernt.')
          }}
          className="tippbar min-h-11 w-full rounded-2xl bg-karte2 text-[15px] font-semibold"
        >
          Claude-Schlüssel speichern
        </button>
      </Karte>

      <p className="px-1 text-[13px] text-grau">
        Aktiv für die Foto-Analyse: <b className="text-white">{anbieter ?? 'keine KI (nur manuelle Eingabe)'}</b>
      </p>

      <Karte titel="Datenschutz">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-snug text-grau">
          <li>Schlüssel liegen nur im Speicher dieses Geräts, nicht im Code, nicht auf GitHub und nicht in Backups. Auf einem neuen Gerät trägst du sie neu ein.</li>
          <li>Für die Analyse wird nur das verkleinerte Foto (und dein Hinweis) verschickt, sonst keine Daten aus der App.</li>
          <li>Im kostenlosen Gemini-Tarif darf Google eingeschickte Inhalte zur Verbesserung seiner Dienste nutzen. Fotografiere also nur dein Essen.</li>
          <li>Ohne Schlüssel oder Internet funktioniert die manuelle Eingabe ganz normal weiter.</li>
        </ul>
      </Karte>
    </Seite>
  )
}
