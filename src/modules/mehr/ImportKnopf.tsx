// Der "Importieren"-Knopf: liest die Zwischenablage und importiert sofort.
// Wird auf der Startseite (täglicher Ablauf) und auf der Import-Seite verwendet.
import { useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import { importiere, leseImportText, zusammenfassung } from '../../core/import'

export default function ImportKnopf({ klein = false, onFertig }: { klein?: boolean; onFertig?: () => void }) {
  const [status, setStatus] = useState<{ ok: boolean; zeilen: string[] } | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function los() {
    setLaeuft(true)
    try {
      // Auf dem iPhone erscheint jetzt eine kleine "Einfügen"-Blase, die du antippen musst.
      // Das ist eine Schutzfunktion von iOS und lässt sich nicht abschalten.
      const text = await navigator.clipboard.readText()
      const ergebnis = await importiere(leseImportText(text))
      setStatus({ ok: true, zeilen: zusammenfassung(ergebnis) })
      onFertig?.()
    } catch (e) {
      const meldung = (e as Error).name === 'NotAllowedError' ? 'Kein Zugriff auf die Zwischenablage. Erlaube das Einfügen oder nutze „Mehr → Daten importieren“.' : (e as Error).message
      setStatus({ ok: false, zeilen: [meldung] })
    }
    setLaeuft(false)
  }

  return (
    <div>
      <button
        onClick={los}
        disabled={laeuft}
        className={`tippbar flex w-full items-center justify-center gap-2 rounded-2xl font-semibold ${klein ? 'h-12 bg-karte text-[16px] text-[#0a84ff]' : 'h-14 bg-[#0a84ff] text-[17px]'}`}
      >
        <ClipboardPaste size={20} /> {laeuft ? 'Importiere …' : 'Aus Zwischenablage importieren'}
      </button>
      {status && (
        <div className={`mt-2 rounded-2xl p-3 text-[14px] leading-snug ${status.ok ? 'bg-[#30d158]/15' : 'bg-[#ff453a]/15'}`}>
          {status.ok ? '✅ ' : '⚠️ '}
          {status.zeilen.map((z) => (
            <span key={z} className="block">
              {z}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
