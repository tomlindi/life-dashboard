// Seite "Einstellungen": Gemini-API-Schlüssel für die Foto-Analyse (nur lokal gespeichert).
import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { STANDARD_MODELL, holeModell, holeSchluessel, setzeModell, setzeSchluessel, testeVerbindung } from '../../core/gemini'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'

export default function EinstellungenSeite() {
  const [schluessel, setSchluessel] = useState(holeSchluessel())
  const [gespeichert, setGespeichert] = useState(!!holeSchluessel())
  const [zeigen, setZeigen] = useState(false)
  const [modell, setModell] = useState(holeModell())
  const [meldung, setMeldung] = useState('')
  const [testet, setTestet] = useState(false)

  function speichern() {
    setzeSchluessel(schluessel)
    setzeModell(modell || STANDARD_MODELL)
    setGespeichert(!!schluessel.trim())
    setMeldung(schluessel.trim() ? '✅ Gespeichert (nur auf diesem Gerät).' : 'Schlüssel entfernt.')
  }

  async function testen() {
    speichern()
    setTestet(true)
    setMeldung('')
    try {
      await testeVerbindung()
      setMeldung(`✅ Verbindung klappt (Modell: ${holeModell()}).`)
    } catch (e) {
      setMeldung('⚠️ ' + (e as Error).message)
    }
    setTestet(false)
  }

  return (
    <Seite titel="Einstellungen">
      <Karte titel="Foto-Analyse (Google Gemini)" akzent="#a3e635">
        <p className="mb-3 text-[13px] leading-snug text-grau">
          Für die Foto-Analyse in „Ernährung“ brauchst du einen kostenlosen API-Schlüssel von Google. So bekommst du ihn: auf{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[#a3e635] underline">
            aistudio.google.com/apikey
          </a>{' '}
          mit deinem Google-Konto anmelden → „API-Schlüssel erstellen“ → kopieren → hier einfügen.
        </p>

        <label className="mb-1.5 block text-[13px] text-grau">API-Schlüssel</label>
        <div className="mb-3 flex gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-karte2 px-3">
            <KeyRound size={18} className="shrink-0 text-grau" />
            <input
              type={zeigen ? 'text' : 'password'}
              value={schluessel}
              onChange={(e) => setSchluessel(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-grau"
            />
            <button onClick={() => setZeigen(!zeigen)} className="tippbar p-1 text-grau" aria-label={zeigen ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'}>
              {zeigen ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className="mb-1.5 block text-[13px] text-grau">Modell</label>
        <div className="mb-4 flex gap-2">
          <input
            value={modell}
            onChange={(e) => setModell(e.target.value)}
            autoCapitalize="off"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 rounded-2xl bg-karte2 px-3 text-[15px] outline-none"
          />
          {modell !== STANDARD_MODELL && (
            <button onClick={() => setModell(STANDARD_MODELL)} className="tippbar rounded-2xl bg-karte2 px-3 text-[13px] text-grau">
              Standard
            </button>
          )}
        </div>
        <p className="-mt-2 mb-4 text-[12px] text-grau">„{STANDARD_MODELL}“ zeigt automatisch immer auf das aktuelle Flash-Modell von Google.</p>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={speichern} className="tippbar min-h-12 rounded-2xl bg-[#a3e635] text-[15px] font-semibold text-black">
            Speichern
          </button>
          <button onClick={testen} disabled={!schluessel.trim() || testet} className="tippbar min-h-12 rounded-2xl bg-karte2 text-[15px] font-semibold disabled:opacity-40">
            {testet ? 'Teste …' : 'Testen'}
          </button>
        </div>
        {gespeichert && (
          <button
            onClick={() => {
              setSchluessel('')
              setzeSchluessel('')
              setGespeichert(false)
              setMeldung('Schlüssel gelöscht.')
            }}
            className="tippbar mt-2 min-h-10 w-full text-[14px] text-[#ff453a]"
          >
            Schlüssel löschen
          </button>
        )}
        {meldung && <p className="mt-3 text-[14px] leading-snug">{meldung}</p>}
      </Karte>

      <Karte titel="Datenschutz">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-snug text-grau">
          <li>Der Schlüssel liegt nur im Speicher dieses Geräts. Er ist nicht im Code, nicht auf GitHub und nicht in Backups. Auf einem neuen Gerät trägst du ihn einfach neu ein.</li>
          <li>Für die Analyse wird nur das verkleinerte Foto an Google geschickt, sonst keine Daten aus der App.</li>
          <li>Im kostenlosen Tarif darf Google eingeschickte Inhalte zur Verbesserung seiner Dienste verwenden. Fotografiere also nur dein Essen und nichts Privates.</li>
          <li>Ohne Schlüssel oder Internet funktioniert die normale Eingabe ganz normal weiter.</li>
        </ul>
      </Karte>
    </Seite>
  )
}
