// Seite "Daten importieren": Zwischenablage, Datei oder Text einfügen.
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileUp } from 'lucide-react'
import { db } from '../../core/db'
import { importiere, leseImportText, zusammenfassung } from '../../core/import'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import ImportKnopf from './ImportKnopf'
import ImportFehlerAnzeige from './ImportFehlerAnzeige'

/** So sieht das JSON aus, das der Kurzbefehl erzeugen soll (siehe docs/KURZBEFEHL.md). */
export const BEISPIEL = `{
  "version": 1,
  "schritte": [{ "datum": "2026-10-02", "anzahl": 8421 }],
  "workouts": [{ "art": "Laufen", "start": "2026-10-02T17:30:00+02:00", "dauerMin": 42, "distanzKm": 6.8 }],
  "schlaf": [{ "datum": "2026-10-02", "stunden": 7.4 }],
  "gewicht": [{ "datum": "2026-10-01", "kg": 68.2 }],
  "termine": [{ "titel": "Mathe-Klausur", "start": "2026-10-08T08:00:00+02:00", "ende": "2026-10-08T09:30:00+02:00", "ort": "Raum 204" }],
  "aufgaben": [{ "titel": "Referat vorbereiten", "faellig": "2026-10-10" }]
}`

export default function ImportSeite() {
  const letzterImport = useLiveQuery(() => db.einstellungen.get('letzterImport'), [])
  const [text, setText] = useState('')
  const [meldung, setMeldung] = useState<{ ok: true; zeilen: string[] } | { ok: false; fehler: unknown } | null>(null)
  const dateiFeld = useRef<HTMLInputElement>(null)

  async function verarbeite(inhalt: string) {
    try {
      const ergebnis = await importiere(leseImportText(inhalt))
      setMeldung({ ok: true, zeilen: zusammenfassung(ergebnis) })
      setText('')
    } catch (e) {
      setMeldung({ ok: false, fehler: e })
    }
  }

  return (
    <Seite titel="Daten importieren" untertitel="Apple Health · Kalender · Erinnerungen">
      <Karte>
        <p className="mb-3 text-[14px] leading-snug text-grau">
          1. Kurzbefehl „Life Dashboard Export“ ausführen → 2. hier tippen. Doppelte Einträge werden automatisch erkannt.
        </p>
        <ImportKnopf />
        {letzterImport && (
          <p className="mt-3 text-[13px] text-grau">
            Letzter Import: {new Date(String(letzterImport.value)).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
      </Karte>

      <Karte titel="Oder: aus Datei">
        <input
          ref={dateiFeld}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          className="hidden"
          onChange={async (e) => {
            const datei = e.target.files?.[0]
            if (datei) await verarbeite(await datei.text())
            e.target.value = ''
          }}
        />
        <button onClick={() => dateiFeld.current?.click()} className="tippbar flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-karte2 text-[15px] font-semibold">
          <FileUp size={18} /> JSON-Datei wählen
        </button>
      </Karte>

      <Karte titel="Oder: Text einfügen">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="JSON hier einfügen (lange tippen → Einfügen)"
          rows={5}
          className="w-full resize-none rounded-2xl bg-karte2 p-3 font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-grau"
          style={{ fontSize: 16 }}
        />
        <button
          onClick={() => verarbeite(text)}
          disabled={!text.trim()}
          className="tippbar mt-2 min-h-12 w-full rounded-2xl bg-[#0a84ff] text-[16px] font-semibold disabled:opacity-40"
        >
          Importieren
        </button>
        {meldung?.ok && (
          <div className="mt-2 rounded-2xl bg-[#30d158]/15 p-3 text-[14px]">
            ✅{' '}
            {meldung.zeilen.map((z) => (
              <span key={z} className="block">
                {z}
              </span>
            ))}
          </div>
        )}
        {meldung && !meldung.ok && (
          <div className="mt-2">
            <ImportFehlerAnzeige fehler={meldung.fehler} />
          </div>
        )}
      </Karte>

      <Karte titel="Format (für den Kurzbefehl)">
        <details>
          <summary className="tippbar min-h-11 cursor-pointer text-[15px] text-[#0a84ff]">Beispiel-JSON anzeigen</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre rounded-2xl bg-black p-3 text-[11px] leading-relaxed text-white/80">{BEISPIEL}</pre>
          <p className="mt-2 text-[13px] text-grau">Alle Teile sind optional. Die ausführliche Anleitung steht in docs/KURZBEFEHL.md.</p>
        </details>
      </Karte>
    </Seite>
  )
}
